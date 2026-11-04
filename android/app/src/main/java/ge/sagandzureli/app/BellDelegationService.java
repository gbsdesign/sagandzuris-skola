package ge.sagandzureli.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

import com.google.androidbrowserhelper.trusted.DelegationService;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The site's notifications, shown by the app (Chrome hands them over: notification delegation).
 * • The prayer reminders (the hours of prayer and the habits' times) ring a church bell on their own channel „ლოცვის ზარი“.
 * • A call (2026-11-05, worker/reminders /ring; the site's tag call-d-<chat> for a private call, call-c-<class> for a
 *   class's, with „პასუხი“ / „უარი“) rings like a phone call: the phone's own ringtone, again and again until it is
 *   answered, declined or 45 s pass, on the channel „ზარები“; on a locked or dark screen it opens IncomingCallActivity.
 *   The same tag without the buttons („გამოტოვებული ზარი“) replaces it, so the ringing stops.
 * • A chat message (chat-d-… / chat-c-…) pops up like a messenger's, on „პირადი შეტყობინებები“ or „კლასის ჩათები“ —
 *   two channels, so either can be quietened in the phone's settings.
 * Everything else stays as Chrome sends it.
 */
public class BellDelegationService extends DelegationService {
    private static final String BELL = "prayer-bell";
    static final String CALLS = "calls";
    private static final String PRIVATE = "messages-private";
    private static final String CLASSES = "messages-class";
    static final long RING_MS = 45_000;
    private static final long[] RING_VIBRATE = {0, 700, 500, 700, 500, 700, 500, 700};

    private static final Pattern CALL = Pattern.compile("call-([dc])-([A-Za-z0-9_-]{1,128})");
    private static final Pattern CHAT = Pattern.compile("chat-([dc])-([A-Za-z0-9_-]{1,128})");

    @Override
    public boolean onNotifyNotificationWithChannel(String platformTag, int platformId, Notification notification, String channelName) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        String tag = platformTag == null ? "" : platformTag;
        Matcher call = CALL.matcher(tag);
        if (call.find() && hasRingButtons(notification)) {
            if (!nm.areNotificationsEnabled()) return false;
            return ring(nm, platformTag, platformId, notification, call.group(1), call.group(2));
        }
        Matcher chat = CHAT.matcher(tag);
        if (chat.find()) {
            if (!nm.areNotificationsEnabled()) return false;
            boolean mine = "d".equals(chat.group(1));
            channel(nm, mine ? PRIVATE : CLASSES, mine ? "პირადი შეტყობინებები" : "კლასის ჩათები",
                mine ? "პირად ჩათში მოწერილი შეტყობინებები" : "კლასის ჩათის შეტყობინებები", null);
            Notification n = Notification.Builder.recoverBuilder(this, notification)
                .setChannelId(mine ? PRIVATE : CLASSES)
                .setCategory(Notification.CATEGORY_MESSAGE)
                .build();
            nm.notify(platformTag, platformId, n);
            return true;
        }
        if (isPrayer(tag, notification)) {
            if (!nm.areNotificationsEnabled()) return false;
            if (nm.getNotificationChannel(BELL) == null) {
                NotificationChannel ch = new NotificationChannel(BELL, "ლოცვის ზარი", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("ლოცვის დროის შეხსენებები ზარის ხმით");
                ch.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.bell),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                nm.createNotificationChannel(ch);
            }
            Notification n = Notification.Builder.recoverBuilder(this, notification).setChannelId(BELL).build();
            nm.notify(platformTag, platformId, n);
            return true;
        }
        return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
    }

    /** a ring: the phone's ringtone, repeated until touched (FLAG_INSISTENT), gone by itself after 45 s */
    private boolean ring(NotificationManager nm, String platformTag, int platformId, Notification src, String kind, String chat) {
        if (nm.getNotificationChannel(CALLS) == null) {
            NotificationChannel ch = new NotificationChannel(CALLS, "ზარები", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("როცა კლასიდან ან პირადი ჩათიდან გირეკავენ");
            ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            ch.enableVibration(true);
            ch.setVibrationPattern(RING_VIBRATE);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        CharSequence title = src.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = src.extras.getCharSequence(Notification.EXTRA_TEXT);
        Intent window = new Intent(this, IncomingCallActivity.class)
            .putExtra(IncomingCallActivity.TAG, platformTag)
            .putExtra(IncomingCallActivity.ID, platformId)
            .putExtra(IncomingCallActivity.BASE, ("d".equals(kind) ? "dms/" : "classes/") + chat)
            .putExtra(IncomingCallActivity.TITLE, title == null ? "ზარი" : title.toString())
            .putExtra(IncomingCallActivity.TEXT, text == null ? "" : text.toString())
            .putExtra(IncomingCallActivity.DECLINE, declineOf(src))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent full = PendingIntent.getActivity(this, platformId, window, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = Notification.Builder.recoverBuilder(this, src)
            .setChannelId(CALLS)
            .setSmallIcon(R.drawable.lc_phone_incoming)
            .setCategory(Notification.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setTimeoutAfter(RING_MS)
            .setFullScreenIntent(full, true)
            .build();
        n.flags |= Notification.FLAG_INSISTENT;
        nm.notify(platformTag, platformId, n);
        return true;
    }

    /** the site's ring has two buttons („პასუხი“, „უარი“); its „გამოტოვებული ზარი“ has none */
    private static boolean hasRingButtons(Notification n) {
        return n.actions != null && n.actions.length >= 2;
    }

    /** Chrome's own „უარი“ (it tells the site's service worker, which ends a private call through the Worker) */
    private static PendingIntent declineOf(Notification n) {
        if (n.actions == null) return null;
        for (Notification.Action a : n.actions) {
            if (a.title != null && a.title.toString().contains("უარი")) return a.actionIntent;
        }
        return n.actions.length >= 2 ? n.actions[1].actionIntent : null;
    }

    private void channel(NotificationManager nm, String id, String name, String about, Uri sound) {
        if (nm.getNotificationChannel(id) != null) return;
        NotificationChannel ch = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(about);
        if (sound != null) ch.setSound(sound, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        nm.createNotificationChannel(ch);
    }

    /** the hours of prayer (public/prayer-notify-sw.js) and the habits' reminders (worker/reminders, tag habit-…) */
    private static boolean isPrayer(String tag, Notification n) {
        if (tag.contains("habit-") || tag.contains("prayer-hour")) return true;
        CharSequence title = n.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = n.extras.getCharSequence(Notification.EXTRA_TEXT);
        return (title != null && title.toString().contains("ლოცვ")) || (text != null && text.toString().contains("ლოცვ"));
    }
}
