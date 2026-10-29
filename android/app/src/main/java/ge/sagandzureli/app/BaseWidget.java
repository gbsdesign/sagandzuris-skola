package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/** Every widget: draws from what the phone already has at once, then asks the server and draws again. */
abstract class BaseWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        Widgets.drawAll(c);
        PendingResult r = goAsync();
        Widgets.refresh(c, r::finish);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) {
        Widgets.drawAll(c);
    }

    /** a widget of the member's own day before the app is linked: one line that opens the profile */
    static RemoteViews notLinked(Context c, String title) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_link);
        v.setTextViewText(R.id.title, title);
        v.setOnClickPendingIntent(R.id.root, Look.open(c, "open=profile", 90));
        return v;
    }
}
