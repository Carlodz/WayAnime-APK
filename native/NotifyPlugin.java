package com.wayanime.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

/** إشعارات الحلقات الجديدة: عرض فوري + مزامنة قائمة الأنمي مع الفحص الدوري (EpisodeWorker) + فتح الحلقة عند الضغط. */
@CapacitorPlugin(
    name = "Notify",
    permissions = { @Permission(strings = { "android.permission.POST_NOTIFICATIONS" }, alias = "notifications") }
)
public class NotifyPlugin extends Plugin {
    static JSObject pending = null;

    @PluginMethod
    public void requestPerm(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "permDone");
        } else {
            JSObject r = new JSObject(); r.put("granted", true); call.resolve(r);
        }
    }

    @PermissionCallback
    private void permDone(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /** items: [{ id, name, poster, kind: ar|wit|a4u, ref, last }] + cfg: { arBase, arToken, witHosts[], a4uHosts[] }. enabled=false كيوقف الفحص. */
    @PluginMethod
    public void sync(PluginCall call) {
        Context c = getContext();
        boolean enabled = call.getBoolean("enabled", true);
        JSArray items = call.getArray("items");
        JSObject cfg = call.getObject("cfg");
        SharedPreferences sp = c.getSharedPreferences("wa_notify", Context.MODE_PRIVATE);
        try {
            JSONObject state = new JSONObject(sp.getString("state", "{}"));
            JSONArray arr = new JSONArray();
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject o = items.getJSONObject(i);
                    arr.put(o);
                    String id = o.optString("id", "");
                    double last = o.optDouble("last", 0);
                    if (!id.isEmpty() && (!state.has(id) || state.optDouble(id, 0) < last)) state.put(id, last);   // آخر حلقة عرفها التطبيق = نقطة البداية
                }
            }
            SharedPreferences.Editor ed = sp.edit().putBoolean("enabled", enabled).putString("items", arr.toString()).putString("state", state.toString());
            if (cfg != null) ed.putString("cfg", cfg.toString());
            ed.apply();
        } catch (Exception ignored) { }
        if (enabled) EpisodeWorker.schedule(c); else EpisodeWorker.cancel(c);
        call.resolve();
    }

    /** إشعار فوري (التطبيق مفتوح لكن النافذة غير نشطة). */
    @PluginMethod
    public void show(final PluginCall call) {
        final String title = call.getString("title", "WayAnime");
        final String body = call.getString("body", "");
        final String id = call.getString("id", "");
        final String ep = call.getData().optString("ep", "");
        final String image = call.getString("image", "");
        new Thread(() -> {
            EpisodeWorker.post(getContext(), title, body, id, ep, image);
            call.resolve();
        }).start();
    }

    /** الحلقة اللي ضغط عليها المستخدم فـ الإشعار (إن وُجدت) — كتتصفّى بعد القراءة. */
    @PluginMethod
    public void getLaunch(PluginCall call) {
        JSObject p = pending;
        pending = null;
        if (p == null && getActivity() != null) {
            Intent in = getActivity().getIntent();
            if (in != null && in.hasExtra("wa_id")) {
                p = new JSObject();
                p.put("id", in.getStringExtra("wa_id"));
                p.put("ep", in.getStringExtra("wa_ep"));
                in.removeExtra("wa_id"); in.removeExtra("wa_ep");
            }
        }
        call.resolve(p != null ? p : new JSObject());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null && intent.hasExtra("wa_id")) {
            JSObject p = new JSObject();
            p.put("id", intent.getStringExtra("wa_id"));
            p.put("ep", intent.getStringExtra("wa_ep"));
            pending = p;
            intent.removeExtra("wa_id"); intent.removeExtra("wa_ep");
        }
    }
}
