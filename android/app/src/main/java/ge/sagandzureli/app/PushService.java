package ge.sagandzureli.app;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * The reminders Worker's notices through Firebase Cloud Messaging (2026-11-18). The site binds this phone to the Worker with
 * a push subscription made of the app's parts (Bridge.script: endpoint https://android.sagandzureli.ge/fcm/<token>), and the
 * Worker sends data only (worker/reminders androidOf): kind, title, body, tag, url, answer, decline. Rings and chat messages
 * are left out while the app is on screen — the open site rings and shows them itself.
 */
public class PushService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> d = message.getData();
        Notices.Note n = new Notices.Note();
        n.kind = or(d.get("kind"), "");
        n.title = or(d.get("title"), "საგანძური");
        n.body = or(d.get("body"), "");
        n.tag = or(d.get("tag"), "");
        n.url = or(d.get("url"), "/");
        n.answer = d.get("answer");
        n.decline = d.get("decline");
        boolean talk = n.kind.equals("call") || n.kind.equals("call-end") || n.kind.equals("chat")
            || n.tag.startsWith("chat-") || n.tag.startsWith("call-");
        if (talk && MainActivity.onScreen) return;
        Notices.show(this, n);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // the open site binds the new token itself (it asks for it on every opening — utils/groupPush.ts)
    }

    private static String or(String v, String fallback) {
        return v == null || v.isEmpty() ? fallback : v;
    }
}
