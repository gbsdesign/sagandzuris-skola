package ge.sagandzureli.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** The rows of the habits widget, from the day the phone keeps (Store.data). */
public class HabitsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Rows(getApplicationContext());
    }

    private static final class Row {
        String id, label, icon, count;
        int color, step, goal;
        boolean done;
    }

    private static final class Rows implements RemoteViewsFactory {
        private final Context c;
        private final List<Row> rows = new ArrayList<>();

        Rows(Context c) { this.c = c; }

        @Override public void onCreate() {}
        @Override public void onDestroy() { rows.clear(); }

        @Override
        public void onDataSetChanged() {
            rows.clear();
            JSONObject data = Store.data(c);
            JSONObject s = data == null ? null : data.optJSONObject("summary");
            JSONArray habits = s == null ? null : s.optJSONArray("habits");
            if (habits == null) return;
            JSONArray done = data.optJSONArray("done");
            JSONObject counts = data.optJSONObject("counts");
            // the daily ones first, then the weekly and monthly ones
            for (int pass = 0; pass < 2; pass++) {
                for (int i = 0; i < habits.length(); i++) {
                    JSONObject h = habits.optJSONObject(i);
                    if (h == null || (h.optInt("rare") == 1) != (pass == 1)) continue;
                    Row r = new Row();
                    r.id = h.optString("id");
                    r.label = h.optString("t");
                    r.icon = h.optString("i", null);
                    r.color = Look.color(h.optString("c", null), Look.WINE);
                    r.goal = h.optInt("goal");
                    r.step = r.goal > 0 ? Math.max(1, h.optInt("step", 1)) : 0;
                    r.done = HabitsWidget.contains(done, r.id);
                    if (r.goal > 0) r.count = (counts == null ? 0 : counts.optInt(r.id)) + " / " + r.goal;
                    rows.add(r);
                }
            }
        }

        @Override public int getCount() { return rows.size(); }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.item_habit);
            if (position >= rows.size()) return v;
            Row r = rows.get(position);
            v.setImageViewResource(R.id.dot, r.done ? R.drawable.dot_fill : R.drawable.dot_ring);
            v.setInt(R.id.dot, "setColorFilter", r.color);
            v.setImageViewResource(R.id.icon, r.done ? R.drawable.lc_check : Look.icon(c, r.icon));
            v.setInt(R.id.icon, "setColorFilter", r.done ? Color.WHITE : r.color);
            v.setTextViewText(R.id.label, r.label);
            v.setTextViewText(R.id.count, r.count == null ? "" : r.count);
            v.setContentDescription(R.id.row, r.label + (r.done ? " — შესრულებულია" : ""));
            Intent fill = new Intent().putExtra("habit", r.id).putExtra("step", r.step).putExtra("goal", r.goal);
            v.setOnClickFillInIntent(R.id.row, fill);
            return v;
        }

        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return false; }
    }
}
