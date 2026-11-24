package ge.sagandzureli.app;

import android.Manifest;
import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The site calls the app through window.sgApp.call(fn, args) — the same calls as the iPhone's window.sgIOS
 * (ios/Sagandzuri/NativeBridge.swift), so src/utils/iosApp.ts serves both:
 *   info                 → { version, build, platform: 'android' }
 *   notifyState          → 'granted' | 'denied' | 'default'
 *   notifyAsk            → the same, after asking the phone (Android 13+)
 *   google               → { idToken } of a Google sign-in (src/context/AuthContext.tsx signs in to Firebase with it)
 *   pushToken { wait }   → this phone's Firebase Cloud Messaging token, or null (the Worker sends through it — PushService)
 *   notify { title, body, tag, url } → a notice of the phone (the site's own `new Notification(…)`)
 *   external { url }     → opens a page outside the app
 *   speaker { on | reset } → a call's sound on the loudspeaker or at the ear; `reset` when the call is over (2026-11-24)
 *   ringCheck            → { fullScreen, battery, channel, maker }: what of the phone's own stops a ring (1.2.2)
 *   ringFix { what }     → opens the settings that turn it on: fullScreen · battery · autostart · channel · notices
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
        return SCRIPT.replace("%NAME%", NAME).replace("%VERSION%", BuildConfig.VERSION_NAME).replace("%PKG%", BuildConfig.APPLICATION_ID);
    }

    /**
     * window.sgApp, plus a Notification and a service worker pushManager made of the app's parts (as the iPhone's Shim.swift):
     * the push subscription's endpoint is https://android.sagandzureli.ge/fcm/<this phone's FCM token> (keys 'android'), so the
     * site binds the phone to the reminders Worker exactly as it binds a browser (utils/groupPush.ts, utils/prayerReminders.ts).
     */
    private static final String SCRIPT = "(function(){\n"
        + "if(window.sgApp||!window.%NAME%)return;\n"
        + "var n=0,wait={};\n"
        + "window.__sgReply=function(id,ok,v){var w=wait[id];if(!w)return;delete wait[id];ok?w[0](v):w[1](new Error(v));};\n"
        + "var call=function(fn,args){return new Promise(function(res,rej){var id=String(++n);wait[id]=[res,rej];"
        + "try{window.%NAME%.post(id,fn,JSON.stringify(args||{}));}catch(e){delete wait[id];rej(e);}});};\n"
        + "var perm='default';\n"
        + "Object.defineProperty(window,'sgApp',{value:{call:call,can:['speaker','ringCheck','ringFix'],platform:'android',version:'%VERSION%',pkg:'%PKG%',setPermission:function(p){perm=p;}}});\n"
        + "call('notifyState').then(function(p){perm=p;},function(){});\n"
        + "var urlOf=function(d){if(!d)return '';if(typeof d.url==='string')return d.url;"
        + "if(typeof d.prayerId==='string')return '/?prayer='+encodeURIComponent(d.prayerId);return '';};\n"
        + "function Note(title,o){o=o||{};this.title=String(title||'');this.body=String(o.body||'');this.tag=String(o.tag||'');"
        + "this.data=o.data;this.onclick=null;this.onclose=null;"
        + "if(perm==='granted')call('notify',{title:this.title,body:this.body,tag:this.tag,url:urlOf(o.data)}).catch(function(){});}\n"
        + "Note.prototype.close=function(){};Note.prototype.addEventListener=function(){};Note.prototype.removeEventListener=function(){};\n"
        + "Object.defineProperty(Note,'permission',{get:function(){return perm;}});\n"
        + "Note.requestPermission=function(cb){return call('notifyAsk').then(function(p){perm=p;if(cb)cb(p);return p;},"
        + "function(){if(cb)cb(perm);return perm;});};\n"
        + "Note.maxActions=2;\n"
        + "try{Object.defineProperty(window,'Notification',{value:Note,configurable:true,writable:true});}catch(e){window.Notification=Note;}\n"
        + "var PREFIX='https://android.sagandzureli.ge/fcm/';\n"
        + "var subOf=function(t){var ep=PREFIX+encodeURIComponent(t);return{endpoint:ep,expirationTime:null,"
        + "options:{userVisibleOnly:true,applicationServerKey:null},getKey:function(){return null;},"
        + "toJSON:function(){return{endpoint:ep,expirationTime:null,keys:{p256dh:'android',auth:'android'}};},"
        + "unsubscribe:function(){return Promise.resolve(true);}};};\n"
        + "var pm={getSubscription:function(){if(perm!=='granted')return Promise.resolve(null);"
        + "return call('pushToken',{wait:false}).then(function(t){return t?subOf(t):null;},function(){return null;});},"
        + "subscribe:function(){var r=perm==='granted'?Promise.resolve(perm):Note.requestPermission();"
        + "return r.then(function(p){if(p!=='granted')throw new DOMException('notifications are off','NotAllowedError');"
        + "return call('pushToken',{wait:true});}).then(function(t){if(!t)throw new DOMException('no push token','AbortError');return subOf(t);});},"
        + "permissionState:function(){return Promise.resolve(perm==='granted'?'granted':perm==='denied'?'denied':'prompt');}};\n"
        + "window.PushManager=function PushManager(){};window.PushManager.supportedContentEncodings=['aes128gcm'];\n"
        + "if(window.ServiceWorkerRegistration){var proto=window.ServiceWorkerRegistration.prototype;"
        + "try{Object.defineProperty(proto,'pushManager',{configurable:true,get:function(){return pm;}});}catch(e){}"
        + "proto.showNotification=function(t,o){new Note(t,o);return Promise.resolve();};"
        + "proto.getNotifications=function(){return Promise.resolve([]);};}\n"
        + "})();";

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
                case "pushToken": {
                    if (!"granted".equals(noticeState())) { reply(id, true, "null"); return; }
                    boolean wait = args.optBoolean("wait", true);
                    com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                        if (!task.isSuccessful() && wait) {
                            // Firebase's own word (SERVICE_NOT_AVAILABLE, AUTHENTICATION_FAILED…) reaches the page: it tells
                            // why this phone cannot be rung (2026-11-24); the quiet ask (`wait` false) only wants a token or none
                            Exception e = task.getException();
                            String w = e == null || e.getMessage() == null ? (e == null ? "failed" : e.getClass().getSimpleName()) : e.getMessage();
                            reply(id, false, w.length() > 80 ? w.substring(0, 80) : w);
                            return;
                        }
                        String t = task.isSuccessful() ? task.getResult() : null;
                        reply(id, true, t == null || t.isEmpty() ? "null" : JSONObject.quote(t));
                    });
                    return;
                }
                case "ringCheck":
                    reply(id, true, ringCheck().toString());
                    return;
                case "ringFix":
                    ringFix(args.optString("what", ""));
                    reply(id, true, "true");
                    return;
                case "notify": {
                    Notices.Note n = new Notices.Note();
                    n.title = args.optString("title", "საგანძური");
                    n.body = args.optString("body", "");
                    n.tag = args.optString("tag", "");
                    n.url = args.optString("url", "/");
                    Notices.show(activity, n);
                    reply(id, true, "true");
                    return;
                }
                case "external": {
                    String url = args.optString("url", "");
                    if (!url.isEmpty()) activity.openOutside(Uri.parse(url));
                    reply(id, true, "true");
                    return;
                }
                case "speaker":
                    reply(id, true, String.valueOf(speaker(args.optBoolean("on", true), args.optBoolean("reset", false))));
                    return;
                default:
                    reply(id, false, "unknown " + fn);
            }
        } catch (Exception e) {
            reply(id, false, "failed");
        }
    }

    /** a call's sound: the loudspeaker or the earpiece (the call screen's 🔊); `reset` gives the phone back its usual sound */
    private boolean speaker(boolean on, boolean reset) {
        AudioManager am = activity.getSystemService(AudioManager.class);
        if (am == null) return false;
        if (reset) {
            if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
            else am.setSpeakerphoneOn(false);
            am.setMode(AudioManager.MODE_NORMAL);
            return true;
        }
        am.setMode(AudioManager.MODE_IN_COMMUNICATION);
        if (Build.VERSION.SDK_INT >= 31) {
            int want = on ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            for (AudioDeviceInfo d : am.getAvailableCommunicationDevices()) {
                if (d.getType() == want) return am.setCommunicationDevice(d);
            }
            if (!on) { am.clearCommunicationDevice(); return true; }
            return false;
        }
        am.setSpeakerphoneOn(on);
        return true;
    }

    /** What of the phone's own stops a ring (the site's „ზარები ამ ტელეფონზე“, 2026-11-24): Android 14+ lets a call's
     *  screen open on a locked phone only with a permission of its own; the person (or the maker's battery saver) may
     *  have restricted the app in the background; the calls' channel may have lost its sound; Xiaomi stops apps without
     *  „autostart“ — that one cannot be read, so the maker is told and the site shows the way. */
    private JSONObject ringCheck() {
        JSONObject o = new JSONObject();
        try {
            NotificationManager nm = activity.getSystemService(NotificationManager.class);
            boolean fullScreen = true;
            if (Build.VERSION.SDK_INT >= 34) fullScreen = nm.canUseFullScreenIntent();
            o.put("fullScreen", fullScreen);
            boolean battery = true;
            ActivityManager am = activity.getSystemService(ActivityManager.class);
            if (Build.VERSION.SDK_INT >= 28 && am != null) battery = !am.isBackgroundRestricted();
            o.put("battery", battery);
            Notices.channels(activity, nm);
            NotificationChannel ch = nm.getNotificationChannel(Notices.CALLS);
            o.put("channel", ch == null || (ch.getImportance() >= NotificationManager.IMPORTANCE_HIGH && ch.getSound() != null));
            String maker = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(Locale.ROOT);
            o.put("maker", maker.contains("xiaomi") || maker.contains("redmi") || maker.contains("poco") ? "xiaomi" : maker);
        } catch (Exception e) {
            /* an answer with what was read */
        }
        return o;
    }

    /** opens the phone's settings that let a ring through; the app's own page when the exact one is missing */
    private void ringFix(String what) {
        String pkg = activity.getPackageName();
        Intent page = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
        Intent i = page;
        if ("fullScreen".equals(what) && Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + pkg));
        } else if ("channel".equals(what)) {
            i = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg).putExtra(Settings.EXTRA_CHANNEL_ID, Notices.CALLS);
        } else if ("notices".equals(what)) {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        } else if ("autostart".equals(what)) {
            i = new Intent().setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
        }
        try {
            activity.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception e) {
            try { activity.startActivity(page.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { /* no settings app */ }
        }
    }

    /** after the phone's question about notifications (MainActivity.onRequestPermissionsResult) */
    void noticesAnswered() {
        String state = JSONObject.quote(noticeState());
        for (String id : waitingNotices) reply(id, true, state);
        waitingNotices.clear();
        tellPermission();
    }

    /** back on screen: notifications may have been turned on in the phone's settings meanwhile */
    void resumed() {
        if (!waitingNotices.isEmpty()) noticesAnswered();
        else tellPermission();
    }

    /** the page's Notification.permission follows the phone's answer at once (the first opening's ask, the settings);
     *  `sg-notify-perm` lets the site bind the phone for calls and messages by itself (PhoneRingSetup) */
    private void tellPermission() {
        String js = "window.sgApp&&window.sgApp.setPermission&&(window.sgApp.setPermission(" + JSONObject.quote(noticeState())
            + "),window.dispatchEvent(new Event('sg-notify-perm')))";
        main.post(() -> web.evaluateJavascript(js, null));
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
