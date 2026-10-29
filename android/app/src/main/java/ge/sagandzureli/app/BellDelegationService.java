package ge.sagandzureli.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;

import com.google.androidbrowserhelper.trusted.DelegationService;

/**
 * The site's notifications, shown by the app. The prayer reminders (the hours of prayer and the habits' times) ring a
 * church bell on their own channel „ლოცვის ზარი“; everything else stays as Chrome sends it.
 */
public class BellDelegationService extends DelegationService {
    private static final String BELL = "prayer-bell";

    @Override
    public boolean onNotifyNotificationWithChannel(String platformTag, int platformId, Notification notification, String channelName) {
        if (!isPrayer(platformTag, notification)) {
            return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
        }
        NotificationManager nm = getSystemService(NotificationManager.class);
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

    /** the hours of prayer (public/prayer-notify-sw.js) and the habits' reminders (worker/reminders, tag habit-…) */
    private static boolean isPrayer(String tag, Notification n) {
        if (tag != null && (tag.contains("habit-") || tag.contains("prayer-hour"))) return true;
        CharSequence title = n.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = n.extras.getCharSequence(Notification.EXTRA_TEXT);
        return (title != null && title.toString().contains("ლოცვ")) || (text != null && text.toString().contains("ლოცვ"));
    }
}
