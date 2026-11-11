package ge.sagandzureli.app;

import android.Manifest;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * The site calls the app through window.sgApp.call(fn, args) — the same calls as the iPhone's window.sgIOS
 * (ios/Sagandzuri/NativeBridge.swift), so src/utils/iosApp.ts serves both:
 *   info                 → { version, build, platform: 'android' }
 *   notifyState          → 'granted' | 'denied' | 'default'
 *   notifyAsk            → the same, after asking the phone (Android 13+)
 *   google               → { idToken } of a Google sign-in (src/context/AuthContext.tsx signs in to Firebase with it)
 *   external { url }     → opens a page outside the app
 * An error comes back as its short word: 'cancelled' (the person closed the window), 'not-ready', or the reason.
 */
final class Bridge {
    static final String NAME = "sgAndroid";
    static final int ASK_NOTICES = 14;

    private final MainActivity activity;
    private final WebView web;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<String> waitingNotices = new ArrayList<>();

    Bridge(MainActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    /** put into every page of the site before its own scripts (MainActivity) */
    static String script() {
        return "(function(){if(window.sgApp||!window." + NAME + ")return;"
            + "var n=0,wait={};"
            + "window.__sgReply=function(id,ok,v){var w=wait[id];if(!w)return;delete wait[id];ok?w[0](v):w[1](new Error(v));};"
            + "var call=function(fn,args){return new Promise(function(res,rej){var id=String(++n);wait[id]=[res,rej];"
            + "try{window." + NAME + ".post(id,fn,JSON.stringify(args||{}));}catch(e){delete wait[id];rej(e);}});};"
            + "Object.defineProperty(window,'sgApp',{value:{call:call,platform:'android',version:'" + BuildConfig.VERSION_NAME + "'}});"
            + "})();";
    }

    @JavascriptInterface
    public void post(String id, String fn, String argsJson) {
        JSONObject args;
        try {
            args = new JSONObject(argsJson == null ? "{}" : argsJson);
        } catch (Exception e) {
            args = new JSONObject();
        }
        final JSONObject a = args;
        main.post(() -> run(id, fn, a));
    }

    private void run(String id, String fn, JSONObject args) {
        try {
            switch (fn) {
                case "info": {
                    JSONObject o = new JSONObject();
                    o.put("version", BuildConfig.VERSION_NAME);
                    o.put("build", String.valueOf(BuildConfig.VERSION_CODE));
                    o.put("platform", "android");
                    reply(id, true, o.toString());
                    return;
                }
                case "notifyState":
                    reply(id, true, JSONObject.quote(noticeState()));
                    return;
                case "notifyAsk":
                    if (Build.VERSION.SDK_INT < 33 || activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                        reply(id, true, JSONObject.quote(noticeState()));
                        return;
                    }
                    waitingNotices.add(id);
                    activity.getSharedPreferences("sg", 0).edit().putBoolean("asked-notices", true).apply();
                    if (waitingNotices.size() == 1) activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, ASK_NOTICES);
                    return;
                case "google":
                    SignIn.google(activity, new SignIn.Done() {
                        @Override public void ok(String idToken) {
                            try {
                                JSONObject o = new JSONObject();
                                o.put("idToken", idToken);
                                reply(id, true, o.toString());
                            } catch (Exception e) {
                                reply(id, false, "failed");
                            }
                        }
                        @Override public void fail(String word) { reply(id, false, word); }
                    });
                    return;
                case "external": {
                    String url = args.optString("url", "");
                    if (!url.isEmpty()) activity.openOutside(Uri.parse(url));
                    reply(id, true, "true");
                    return;
                }
                default:
                    reply(id, false, "unknown " + fn);
            }
        } catch (Exception e) {
            reply(id, false, "failed");
        }
    }

    /** after the phone's question about notifications (MainActivity.onRequestPermissionsResult) */
    void noticesAnswered() {
        String state = JSONObject.quote(noticeState());
        for (String id : waitingNotices) reply(id, true, state);
        waitingNotices.clear();
    }

    /** back on screen: notifications may have been turned on in the phone's settings meanwhile */
    void resumed() {
        if (!waitingNotices.isEmpty()) noticesAnswered();
    }

    private String noticeState() {
        boolean on = activity.getSystemService(NotificationManager.class).areNotificationsEnabled();
        if (on) return "granted";
        if (Build.VERSION.SDK_INT >= 33 && activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) return "default";
        return Build.VERSION.SDK_INT >= 33 && activity.getSharedPreferences("sg", 0).getBoolean("asked-notices", false) ? "denied" : "default";
    }

    /** `value` is JSON (an object, a quoted string, true) for ok, a short word for an error */
    private void reply(String id, boolean ok, String value) {
        if (!ok || value == null) value = JSONObject.quote(value == null ? "failed" : value);
        String js = "window.__sgReply&&window.__sgReply(" + JSONObject.quote(id) + "," + ok + "," + value + ")";
        main.post(() -> web.evaluateJavascript(js, null));
    }
}
