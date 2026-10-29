package ge.sagandzureli.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.widget.Toast;

/**
 * sagandzuri://silence?on=1|0 — the notes page's church mode silences the phone („არ შემაწუხო“) while the choir sings, and
 * gives the sound back when it ends, or by itself after three hours. Android asks once for the right to do it.
 */
public class SilenceActivity extends Activity {
    static final long BACK_AFTER = 3 * 60 * 60 * 1000L;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Uri data = getIntent().getData();
        boolean on = data != null && "1".equals(data.getQueryParameter("on"));
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (on) silence(this, nm);
        else restore(this, nm, true);
        finish();
        overridePendingTransition(0, 0);
    }

    private static void silence(Activity a, NotificationManager nm) {
        if (!nm.isNotificationPolicyAccessGranted()) {
            if (!Store.askedSilence(a)) {
                Store.setAskedSilence(a);
                Toast.makeText(a, "ჩართე „საგანძური“ — ტაძარში ტელეფონს თვითონ დაადუმებს", Toast.LENGTH_LONG).show();
                try {
                    a.startActivity(new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS));
                } catch (Exception ignored) {
                    // no such settings screen on this phone
                }
            }
            return;
        }
        if (Store.savedFilter(a) != -1) return; // already silenced by the app
        int now = nm.getCurrentInterruptionFilter();
        if (now != NotificationManager.INTERRUPTION_FILTER_ALL) return; // the member's own „არ შემაწუხო“ is on
        Store.setSavedFilter(a, now);
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
        AlarmManager am = a.getSystemService(AlarmManager.class);
        am.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + BACK_AFTER, backLater(a));
        Toast.makeText(a, "ტელეფონი დადუმდა", Toast.LENGTH_SHORT).show();
    }

    static void restore(Context c, NotificationManager nm, boolean say) {
        int before = Store.savedFilter(c);
        if (before == -1) return;
        Store.setSavedFilter(c, -1);
        c.getSystemService(AlarmManager.class).cancel(backLater(c));
        if (!nm.isNotificationPolicyAccessGranted()) return;
        nm.setInterruptionFilter(before);
        if (say) Toast.makeText(c, "ხმა დაბრუნდა", Toast.LENGTH_SHORT).show();
    }

    private static PendingIntent backLater(Context c) {
        return PendingIntent.getBroadcast(c, 7, new Intent(c, SilenceBack.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
