package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** The home vine's buttons on the home screen: the member picks which (ButtonsConfigActivity); a tap opens that place. */
public class ButtonsWidget extends BaseWidget {
    static final String[] DEFAULT = {"section:galoba", "section:simghera", "section:mtkmeli", "library:prayers"};

    static JSONArray list(Context c, int id) {
        JSONArray saved = Store.buttons(c, id);
        if (saved != null && saved.length() > 0) return saved;
        JSONArray out = new JSONArray();
        for (String b : DEFAULT) {
            String[] item = Look.catalogItem(b);
            try {
                out.put(new JSONObject().put("id", b).put("t", item[1]));
            } catch (Exception ignored) {
                // a fixed list
            }
        }
        return out;
    }

    static void draw(Context c, AppWidgetManager m, int id) {
        JSONArray list = list(c, id);
        int n = Math.min(list.length(), 8);
        int perRow = n <= 4 ? n : (n + 1) / 2;
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_buttons);
        v.removeAllViews(R.id.row1);
        v.removeAllViews(R.id.row2);
        for (int i = 0; i < n; i++) {
            JSONObject b = list.optJSONObject(i);
            if (b == null) continue;
            String bid = b.optString("id");
            RemoteViews item = new RemoteViews(c.getPackageName(), R.layout.item_button);
            item.setImageViewResource(R.id.icon, Look.buttonIcon(c, bid));
            item.setTextViewText(R.id.label, b.optString("t"));
            item.setContentDescription(R.id.item, b.optString("t"));
            item.setOnClickPendingIntent(R.id.item, Look.openButton(c, bid, id * 16 + i));
            v.addView(i < perRow ? R.id.row1 : R.id.row2, item);
        }
        v.setViewVisibility(R.id.row2, n > perRow ? android.view.View.VISIBLE : android.view.View.GONE);
        m.updateAppWidget(id, v);
    }

    @Override
    public void onDeleted(Context c, int[] ids) {
        for (int id : ids) Store.forgetButtons(c, id);
    }
}
