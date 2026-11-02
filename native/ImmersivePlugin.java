package com.wayanime.app;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** ملء الشاشة الحقيقي: كيدور الهاتف أفقياً + كيخبّي شريط الحالة وأزرار التنقل (Immersive) + كيغطي الـ notch. */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {

    @PluginMethod
    public void enter(PluginCall call) {
        final Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                Window w = a.getWindow();
                WindowCompat.setDecorFitsSystemWindows(w, false);
                w.getDecorView().setBackgroundColor(Color.BLACK);
                w.setStatusBarColor(Color.BLACK);
                w.setNavigationBarColor(Color.BLACK);
                if (Build.VERSION.SDK_INT >= 28) {
                    WindowManager.LayoutParams lp = w.getAttributes();
                    lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                        ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                        : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    w.setAttributes(lp);
                }
                WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
                c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsetsCompat.Type.systemBars());
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        final Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                Window w = a.getWindow();
                WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
                c.show(WindowInsetsCompat.Type.systemBars());
                WindowCompat.setDecorFitsSystemWindows(w, true);
                if (Build.VERSION.SDK_INT >= 28) {
                    WindowManager.LayoutParams lp = w.getAttributes();
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
                    w.setAttributes(lp);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }
}
