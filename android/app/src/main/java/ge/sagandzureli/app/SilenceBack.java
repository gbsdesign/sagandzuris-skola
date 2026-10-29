package ge.sagandzureli.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Three hours after church mode silenced the phone, its sound comes back even if the page was never closed. */
public class SilenceBack extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        SilenceActivity.restore(c, c.getSystemService(NotificationManager.class), false);
    }
}
