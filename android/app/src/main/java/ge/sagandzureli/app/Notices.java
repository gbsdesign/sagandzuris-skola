package ge.sagandzureli.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

/**
 * The app's own notices (2026-11-18, the app's own window): what the reminders Worker sends through Firebase Cloud Messaging
 * (PushService) and what the open site shows through the bridge. Before, Chrome showed the site's notices and
 * BellDelegationService only retouched them; the channels and the ring's behaviour are the same as there:
 * • a ring (kind 'call') — the phone's ringtone again and again until touched, gone after 45 s, „პასუხი“ / „უარი“, and on a
 *   locked or dark screen IncomingCallActivity; the same tag's „გამოტოვებული ზარი“ (kind 'call-end') takes its place quietly;
 * • a chat message (tag chat-d-… / chat-c-…) on „პირადი შეტყობინებები“ or „კლასის ჩათები“;
 * • the prayer hours and the habits' times on „ლოცვის ზარი“ with the church bell;
 * • anything else on „შეტყობინებები“.
 * A tap opens the site in the app at the notice's own address.
 */
final class Notices {
    static final String BELL = "prayer-bell";
    static final String CALLS = BellDelegationService.CALLS;
    static final String PRIVATE = "messages-private";
    static final String CLASSES = "messages-class";
    static final String OTHER = "notices";
    static final int ID = 7;
    private static final long[] RING_VIBRATE = {0, 700, 500, 700, 500, 700, 500, 700};

    static final class Note {
        String kind = "", title = "საგანძური", body = "", tag = "", url = "/", answer, decline;
    }

    static void show(Context c, Note n) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (!nm.areNotificationsEnabled()) return;
        String tag = n.tag == null || n.tag.isEmpty() ? null : n.tag;
        if ("call".equals(n.kind)) { ring(c, nm, n, tag); return; }

        String channel;
        boolean quiet = "call-end".equals(n.kind);
        if (tag != null && tag.startsWith("chat-d-") || tag != null && tag.startsWith("call-d-")) channel = PRIVATE;
        else if (tag != null && (tag.startsWith("chat-c-") || tag.startsWith("call-c-"))) channel = CLASSES;
        else if (isPrayer(n)) channel = BELL;
        else channel = OTHER;
        channels(c, nm);

        Notification.Builder b = new Notification.Builder(c, channel)
            .setSmallIcon(channel.equals(BELL) ? R.drawable.lc_church : R.drawable.lc_message_circle)
            .setContentTitle(n.title)
            .setContentText(n.body)
            .setStyle(new Notification.BigTextStyle().bigText(n.body))
            .setAutoCancel(true)
            .setContentIntent(open(c, n.url, code(tag)));
        if (channel.equals(PRIVATE) || channel.equals(CLASSES)) b.setCategory(quiet ? Notification.CATEGORY_MISSED_CALL : Notification.CATEGORY_MESSAGE);
        if (quiet) b.setOnlyAlertOnce(true).setSilent(true);
        nm.notify(tag, ID, b.build());
    }

    /** a ring: the phone's ringtone, repeated until touched (FLAG_INSISTENT), gone by itself after 45 s */
    private static void ring(Context c, NotificationManager nm, Note n, String tag) {
        channels(c, nm);
        String base = baseOf(tag);
        int code = code(tag);
        PendingIntent no = DeclineReceiver.intent(c, tag, ID, n.decline, code);
        Intent window = new Intent(c, IncomingCallActivity.class)
            .putExtra(IncomingCallActivity.TAG, tag)
            .putExtra(IncomingCallActivity.ID, ID)
            .putExtra(IncomingCallActivity.BASE, base)
            .putExtra(IncomingCallActivity.TITLE, n.title)
            .putExtra(IncomingCallActivity.TEXT, n.body)
            .putExtra(IncomingCallActivity.DECLINE, no)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent full = PendingIntent.getActivity(c, code, window, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String answer = n.answer != null && !n.answer.isEmpty() ? n.answer : n.url;
        Notification note = new Notification.Builder(c, CALLS)
            .setSmallIcon(R.drawable.lc_phone_incoming)
            .setContentTitle(n.title)
            .setContentText(n.body)
            .setCategory(Notification.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setTimeoutAfter(BellDelegationService.RING_MS)
            .setFullScreenIntent(full, true)
            .setContentIntent(open(c, n.url, code))
            .addAction(new Notification.Action.Builder(null, "უარი", no).build())
            .addAction(new Notification.Action.Builder(null, "პასუხი", open(c, answer, code + 1)).build())
            .build();
        note.flags |= Notification.FLAG_INSISTENT;
        nm.notify(tag, ID, note);
    }

    /** „call-d-<chat>“ → „dms/<chat>“, „call-c-<class>“ → „classes/<class>“ (IncomingCallActivity's „პასუხი“) */
    static String baseOf(String tag) {
        if (tag == null) return "";
        if (tag.startsWith("call-d-")) return "dms/" + tag.substring(7);
        if (tag.startsWith("call-c-")) return "classes/" + tag.substring(7);
        return "";
    }

    private static boolean isPrayer(Note n) {
        if ("prayer".equals(n.kind)) return true;
        String tag = n.tag == null ? "" : n.tag;
        if (tag.contains("habit-") || tag.contains("prayer-hour") || tag.startsWith("hour-")) return true;
        return (n.title != null && n.title.contains("ლოცვ")) || (n.body != null && n.body.contains("ლოცვ"));
    }

    private static int code(String tag) {
        return tag == null ? (int) (System.currentTimeMillis() & 0xffff) : tag.hashCode() & 0x7ffffff0;
    }

    static PendingIntent open(Context c, String url, int requestCode) {
        String path = url == null || url.isEmpty() ? "/" : url;
        Uri uri = path.startsWith("https://") ? Uri.parse(path) : Uri.parse(Net.SITE + (path.startsWith("/") ? "" : "/") + path);
        Intent i = new Intent(Intent.ACTION_VIEW, uri, c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void channels(Context c, NotificationManager nm) {
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
        if (nm.getNotificationChannel(BELL) == null) {
            NotificationChannel ch = new NotificationChannel(BELL, "ლოცვის ზარი", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("ლოცვის დროის შეხსენებები ზარის ხმით");
            ch.setSound(Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.bell),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            nm.createNotificationChannel(ch);
        }
        plain(nm, PRIVATE, "პირადი შეტყობინებები", "პირად ჩათში მოწერილი შეტყობინებები");
        plain(nm, CLASSES, "კლასის ჩათები", "კლასის ჩათის შეტყობინებები");
        plain(nm, OTHER, "შეტყობინებები", "სკოლის სხვა შეტყობინებები და შეხსენებები");
    }

    private static void plain(NotificationManager nm, String id, String name, String about) {
        if (nm.getNotificationChannel(id) != null) return;
        NotificationChannel ch = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(about);
        nm.createNotificationChannel(ch);
    }

    private Notices() {}
}
