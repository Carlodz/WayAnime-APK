package com.wayanime.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.TimeUnit;

/**
 * فحص دوري (كل 30 دقيقة) حتى والتطبيق مسدود: كيسول مصادر التطبيق (Animeify / WitAnime / Anime4up) على الأنمي اللي فـ المفضلة / آخر ما شاهدتي،
 * وإلا نزلات حلقة جديدة كيبعت إشعار فيه: أيقونة التطبيق + اسم الأنمي + رقم الحلقة + زر «شاهد».
 */
public class EpisodeWorker extends Worker {
    static final String CH = "wa_episodes";
    static final String WORK = "wa_episodes_check";

    public EpisodeWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    static void schedule(Context c) {
        Constraints k = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(EpisodeWorker.class, 30, TimeUnit.MINUTES).setConstraints(k).build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, r);
    }

    static void cancel(Context c) { WorkManager.getInstance(c).cancelUniqueWork(WORK); }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        SharedPreferences sp = c.getSharedPreferences("wa_notify", Context.MODE_PRIVATE);
        if (!sp.getBoolean("enabled", false)) return Result.success();
        try {
            JSONArray items = new JSONArray(sp.getString("items", "[]"));
            JSONObject cfg = new JSONObject(sp.getString("cfg", "{}"));
            JSONObject state = new JSONObject(sp.getString("state", "{}"));
            boolean changed = false;
            for (int i = 0; i < items.length() && i < 30; i++) {
                JSONObject o = items.getJSONObject(i);
                String id = o.optString("id", "");
                if (id.isEmpty()) continue;
                double latest;
                try { latest = latestEp(o, cfg); } catch (Exception e) { continue; }   // المصدر ما جاوبش: نكملو للّي بعدو
                if (latest <= 0) continue;
                double last = state.has(id) ? state.optDouble(id, 0) : -1;
                if (last < 0) { state.put(id, latest); changed = true; continue; }     // أول مرة: نسجلو فقط بلا إشعار
                if (latest > last) {
                    String ep = fmtEp(latest);
                    post(c, o.optString("name", "WayAnime"), "الحلقة " + ep + " متوفرة الآن", id, ep, o.optString("poster", ""));
                    state.put(id, latest); changed = true;
                }
            }
            if (changed) sp.edit().putString("state", state.toString()).apply();
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    static String fmtEp(double d) { return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d); }

    /** أعلى رقم حلقة موجودة فـ مصدر الأنمي (نفس المصادر اللي كيستعملها التطبيق: Animeify / WitAnime / Anime4up). */
    static double latestEp(JSONObject o, JSONObject cfg) throws Exception {
        String kind = o.optString("kind", ""), ref = o.optString("ref", "");
        if (ref.isEmpty()) return 0;
        if ("ar".equals(kind)) return arLatest(ref, cfg);
        JSONArray hosts = cfg.optJSONArray("wit".equals(kind) ? "witHosts" : "a4uHosts");
        if (hosts == null) return 0;
        Exception err = null;
        for (int i = 0; i < hosts.length(); i++) {          // نفس منطق التطبيق: نجربو النطاقات وحدة وحدة
            try {
                String h = hosts.getString(i);
                if (!h.endsWith("/")) h += "/";
                String html = httpGet(h + "anime/" + ref + "/");
                if (html.length() < 500) continue;
                return parseEps(html, kind);
            } catch (Exception e) { err = e; }
        }
        if (err != null) throw err;
        return 0;
    }

    static double parseEps(String html, String kind) {
        Document d = Jsoup.parse(html);
        double max = 0;
        for (Element c : d.select(".episodes-card")) {
            Element a = c.selectFirst(".episodes-card-title h3 > a");
            if (a == null) a = c.selectFirst("h3 > a");
            if (a == null && "a4u".equals(kind)) a = c.selectFirst("a[href]");
            if (a == null) continue;
            double n = lastNum(a.text());
            if (n > max) max = n;
        }
        return max;
    }

    static double lastNum(String t) {
        Matcher m = Pattern.compile("(\\d+(?:\\.\\d+)?)").matcher(t == null ? "" : t);
        double r = 0;
        while (m.find()) { try { r = Double.parseDouble(m.group(1)); } catch (Exception ignored) { } }
        return r;
    }

    static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    static String readAll(HttpURLConnection h) throws Exception {
        if (h.getResponseCode() != 200) throw new Exception("HTTP " + h.getResponseCode());
        InputStream in = h.getInputStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        in.close(); h.disconnect();
        return bo.toString("UTF-8");
    }

    static String httpGet(String url) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setRequestProperty("User-Agent", UA);
        h.setRequestProperty("Accept-Language", "ar,en;q=0.8");
        h.setConnectTimeout(12000); h.setReadTimeout(15000);
        return readAll(h);
    }

    /** Animeify: POST episodes/load_episodes.php (نفس طلب التطبيق) */
    static double arLatest(String animeId, JSONObject cfg) throws Exception {
        String base = cfg.optString("arBase", "https://animeify.net/animeify/apis_v4/").replaceAll("/+$", "");
        String token = cfg.optString("arToken", "8cnY80AZSbUCmR26Vku1VUUY4");
        HttpURLConnection h = (HttpURLConnection) new URL(base + "/episodes/load_episodes.php").openConnection();
        h.setRequestMethod("POST");
        h.setRequestProperty("User-Agent", UA);
        h.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        h.setConnectTimeout(12000); h.setReadTimeout(15000); h.setDoOutput(true);
        String body = "AnimeID=" + URLEncoder.encode(animeId, "UTF-8") + "&Token=" + URLEncoder.encode(token, "UTF-8");
        h.getOutputStream().write(body.getBytes("UTF-8"));
        JSONArray arr = new JSONArray(readAll(h));
        double max = 0;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject e = arr.optJSONObject(i);
            if (e == null) continue;
            try { double n = Double.parseDouble(String.valueOf(e.opt("Episode"))); if (n > max) max = n; } catch (Exception ignored) { }
        }
        return max;
    }

    static Bitmap fetchBitmap(String url) {
        if (url == null || !url.startsWith("http")) return null;
        try {
            HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
            h.setConnectTimeout(8000); h.setReadTimeout(8000);
            InputStream in = h.getInputStream();
            Bitmap b = BitmapFactory.decodeStream(in);
            in.close(); h.disconnect();
            if (b != null && Math.max(b.getWidth(), b.getHeight()) > 320) {
                float s = 320f / Math.max(b.getWidth(), b.getHeight());
                b = Bitmap.createScaledBitmap(b, Math.max(1, (int) (b.getWidth() * s)), Math.max(1, (int) (b.getHeight() * s)), true);
            }
            return b;
        } catch (Exception e) { return null; }
    }

    /** بديل البوستر: شارة vector (SVG) بلون التطبيق، وإلا أيقونة التطبيق. */
    static Bitmap appIcon(Context c) {
        try {
            int res = c.getResources().getIdentifier("ic_wa_badge", "drawable", c.getPackageName());
            if (res == 0) res = c.getApplicationInfo().icon;
            Drawable d = ContextCompat.getDrawable(c, res);
            if (d == null) return null;
            int w = 192, h = 192;
            Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas cv = new Canvas(b);
            d.setBounds(0, 0, w, h); d.draw(cv);
            return b;
        } catch (Exception e) { return null; }
    }

    /** إشعار حلقة: أيقونة التطبيق (فـ الهيدر) + بوستر الأنمي + الاسم + الحلقة + زر «شاهد». */
    static void post(Context c, String title, String body, String id, String ep, String image) {
        try {
            if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return;
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
                NotificationChannel ch = new NotificationChannel(CH, "حلقات جديدة", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("إشعار عند نزول حلقة جديدة من الأنمي المفضّل");
                nm.createNotificationChannel(ch);
            }
            Intent in = new Intent(c, MainActivity.class);
            in.setAction("wa.open." + id + "." + ep);
            in.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            in.putExtra("wa_id", id);
            in.putExtra("wa_ep", ep);
            int rc = (id + "#" + ep).hashCode();
            PendingIntent pi = PendingIntent.getActivity(c, rc, in, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            int small = c.getResources().getIdentifier("ic_stat_wa", "drawable", c.getPackageName());
            if (small == 0) small = c.getApplicationInfo().icon;
            int playIcon = c.getResources().getIdentifier("ic_wa_play", "drawable", c.getPackageName());
            Bitmap large = fetchBitmap(image);
            if (large == null) large = appIcon(c);

            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
                    .setSmallIcon(small)
                    .setColor(0xFF7B4DFF)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
                    .setContentIntent(pi)
                    .addAction(playIcon, "شاهد", pi);
            if (large != null) b.setLargeIcon(large);
            NotificationManagerCompat.from(c).notify(id.hashCode(), b.build());
        } catch (Exception ignored) { }
    }
}
