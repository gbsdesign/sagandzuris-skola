package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** „საგანძურის გზა“: the path's five percentages as rings and the reviews due today; a tap opens the path. */
public class PathWidget extends BaseWidget {
    private static final String[] KEYS = {"samosi", "learn", "manera", "work", "pearls"};
    private static final int[] RINGS = {R.id.ring1, R.id.ring2, R.id.ring3, R.id.ring4, R.id.ring5};
    private static final int[] TEXTS = {R.id.pct1, R.id.pct2, R.id.pct3, R.id.pct4, R.id.pct5};

    static void draw(Context c, AppWidgetManager m, int id) {
        JSONObject s = Widgets.summary(c);
        if (Store.secret(c) == null || s == null) {
            m.updateAppWidget(id, notLinked(c, "საგანძურის გზა"));
            return;
        }
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_path);
        JSONObject p = s.optJSONObject("path");
        for (int i = 0; i < KEYS.length; i++) {
            int n = p == null ? 0 : Math.max(0, Math.min(100, p.optInt(KEYS[i])));
            v.setProgressBar(RINGS[i], 100, n, false);
            v.setTextViewText(TEXTS[i], n + "%");
        }
        int due = s.optInt("due");
        v.setTextViewText(R.id.due, due > 0 ? "დღეს გასამეორებელი: " + due : "დღეს გასამეორებელი არაფერია");
        v.setOnClickPendingIntent(R.id.root, Look.open(c, "open=gz", id * 16));
        m.updateAppWidget(id, v);
    }
}
