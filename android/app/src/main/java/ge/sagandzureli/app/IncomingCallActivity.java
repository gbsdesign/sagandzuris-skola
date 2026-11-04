package ge.sagandzureli.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.StatusBarNotification;
import android.view.WindowManager;
import android.widget.TextView;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * The incoming call on a locked or dark screen (2026-11-05): who calls, „უარი“ and „პასუხი“, like the phone's own.
 * BellDelegationService opens it through the ring's full-screen intent; the ringing itself is the notification's
 * (the phone's ringtone, again and again), so this window only shows it and closes as soon as the ring is gone —
 * answered here, declined, „გამოტოვებული ზარი“, or the 45 s.
 * „პასუხი“ opens the app at /?open=call&b=<base> (App.tsx: the chat opens and the call is answered once it is seen).
 * „უარი“ sends Chrome's own „უარი“ of the notice, which the site's service worker turns into the end of a private call.
 */
public class IncomingCallActivity extends Activity {
    static final String TAG = "tag";
    static final String ID = "id";
    static final String BASE = "base";
    static final String TITLE = "title";
    static final String TEXT = "text";
    static final String DECLINE = "decline";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private String tag;
    private int id;

    private final Runnable watch = new Runnable() {
        @Override
        public void run() {
            if (!ringing()) { finish(); return; }
            handler.postDelayed(this, 800);
        }
    };

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_incoming);
        show(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        show(intent);
    }

    private void show(Intent in) {
        tag = in.getStringExtra(TAG);
        id = in.getIntExtra(ID, 0);
        String title = in.getStringExtra(TITLE);
        String text = in.getStringExtra(TEXT);
        String name = title == null || title.isEmpty() ? "ზარი" : title;
        ((TextView) findViewById(R.id.initial)).setText(name.substring(0, name.offsetByCodePoints(0, 1)));
        ((TextView) findViewById(R.id.name)).setText(name);
        ((TextView) findViewById(R.id.line)).setText(text == null || text.isEmpty() ? "გირეკავს…" : text);
        boolean video = text != null && text.contains("ვიდეო");
        ((android.widget.ImageView) findViewById(R.id.answer_icon)).setImageResource(video ? R.drawable.lc_video : R.drawable.lc_phone);
        findViewById(R.id.answer).setOnClickListener(v -> answer());
        findViewById(R.id.decline).setOnClickListener(v -> decline());
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.removeCallbacks(watch);
        handler.postDelayed(watch, 800);
    }

    @Override
    protected void onPause() {
        super.onPause();
        handler.removeCallbacks(watch);
    }

    /** the ring's notice is still there (the app's own notices are all this one sees) */
    private boolean ringing() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        for (StatusBarNotification s : nm.getActiveNotifications()) {
            if (s.getId() == id && (tag == null ? s.getTag() == null : tag.equals(s.getTag()))
                && BellDelegationService.CALLS.equals(s.getNotification().getChannelId())) return true;
        }
        return false;
    }

    private void stopRing() {
        getSystemService(NotificationManager.class).cancel(tag, id);
    }

    private void answer() {
        String base = getIntent().getStringExtra(BASE);
        stopRing();
        Uri uri = Uri.parse(Net.SITE + "/?open=call&b=" + Uri.encode(base == null ? "" : base));
        Intent open = new Intent(Intent.ACTION_VIEW, uri, this, LauncherActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        KeyguardManager km = getSystemService(KeyguardManager.class);
        if (Build.VERSION.SDK_INT >= 26 && km != null && km.isKeyguardLocked()) {
            // a locked phone asks for its PIN first, then the app opens on the call
            km.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                @Override public void onDismissSucceeded() { startActivity(open); finish(); }
                @Override public void onDismissCancelled() { finish(); }
                @Override public void onDismissError() { startActivity(open); finish(); }
            });
            return;
        }
        startActivity(open);
        finish();
    }

    private void decline() {
        PendingIntent no = getIntent().getParcelableExtra(DECLINE);
        if (no != null) {
            try { no.send(); } catch (PendingIntent.CanceledException e) { /* the notice is gone already */ }
        }
        stopRing();
        finish();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(watch);
        super.onDestroy();
    }
}
