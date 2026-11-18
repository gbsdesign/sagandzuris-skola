package ge.sagandzureli.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * A ring's „უარი“ (the notice's button or IncomingCallActivity's): the ring goes away and, for a private call, the ring's
 * own signed ticket goes to the reminders Worker's /decline, which ends the call — as the site's service worker did when
 * Chrome showed the ring. A class's ring has no ticket: declining only silences this phone.
 */
public class DeclineReceiver extends BroadcastReceiver {
    private static final String ACTION = "ge.sagandzureli.app.DECLINE";
    private static final String TAG = "tag", ID = "id", TICKET = "ticket";

    static PendingIntent intent(Context c, String tag, int id, String ticket, int requestCode) {
        Intent i = new Intent(c, DeclineReceiver.class).setAction(ACTION)
            .putExtra(TAG, tag).putExtra(ID, id).putExtra(TICKET, ticket);
        return PendingIntent.getBroadcast(c, requestCode + 2, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        c.getSystemService(NotificationManager.class).cancel(intent.getStringExtra(TAG), intent.getIntExtra(ID, Notices.ID));
        String ticket = intent.getStringExtra(TICKET);
        if (ticket == null || ticket.isEmpty()) return;
        PendingResult wait = goAsync();
        new Thread(() -> {
            try {
                HttpURLConnection http = (HttpURLConnection) new URL(Net.SERVER + "/decline").openConnection();
                http.setRequestMethod("POST");
                http.setConnectTimeout(10_000);
                http.setReadTimeout(10_000);
                http.setDoOutput(true);
                http.setRequestProperty("Content-Type", "application/json");
                http.setRequestProperty("Origin", Net.SITE);
                try (OutputStream out = http.getOutputStream()) { out.write(ticket.getBytes(StandardCharsets.UTF_8)); }
                http.getResponseCode();
                http.disconnect();
            } catch (Exception e) {
                /* offline: the caller's ring runs out by itself */
            } finally {
                wait.finish();
            }
        }).start();
    }
}
