package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** The psalter group: which kanon is mine this half-month; a tap opens it. */
public class KanonWidget extends BaseWidget {
    static void draw(Context c, AppWidgetManager m, int id) {
        JSONObject s = Widgets.summary(c);
        if (Store.secret(c) == null || s == null) {
            m.updateAppWidget(id, notLinked(c, "ჩემი კანონი"));
            return;
        }
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_kanon);
        JSONObject k = s.optJSONObject("kanon");
        JSONArray n = k == null ? null : k.optJSONArray("n");
        if (n == null || n.length() == 0) {
            v.setTextViewText(R.id.number, "—");
            v.setTextViewText(R.id.group, k == null ? "ფსალმუნთა ჯგუფში არ ხარ" : "ამ ციკლში კანონი არ გაქვს");
        } else {
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < n.length(); i++) b.append(i == 0 ? "" : " · ").append(n.optInt(i));
            v.setTextViewText(R.id.number, b.toString());
            v.setTextViewText(R.id.group, k.optString("group"));
        }
        v.setOnClickPendingIntent(R.id.root, Look.openButton(c, "special:kathisma", id * 16));
        m.updateAppWidget(id, v);
    }
}
