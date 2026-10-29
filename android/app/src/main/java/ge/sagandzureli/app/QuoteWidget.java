package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** The home page's sayings, one a day (the same for the whole school); a tap opens the app. */
public class QuoteWidget extends BaseWidget {
    static void draw(Context c, AppWidgetManager m, int id) {
        Calendar now = Look.now();
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_quote);
        JSONObject days = Store.days(c, now.get(Calendar.YEAR));
        JSONArray sayings = days == null ? null : days.optJSONArray("sayings");
        if (sayings == null || sayings.length() == 0) {
            v.setTextViewText(R.id.quote, "„დღის სიტყვა“ იტვირთება…");
            v.setTextViewText(R.id.author, "");
        } else {
            int dayNo = now.get(Calendar.YEAR) * 400 + now.get(Calendar.DAY_OF_YEAR);
            JSONArray s = sayings.optJSONArray(dayNo % sayings.length());
            v.setTextViewText(R.id.quote, s == null ? "" : "„" + s.optString(0) + "“");
            v.setTextViewText(R.id.author, s == null ? "" : s.optString(1));
        }
        v.setOnClickPendingIntent(R.id.root, Look.open(c, "", id * 16));
        m.updateAppWidget(id, v);
    }
}
