package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Today's habits with their colours and icons; a tap ticks one (or adds a counted habit's step, +10 for the Jesus
 * prayer). The tick shows at once, then goes to the server, which writes it into the member's day — the site shows it too.
 */
public class HabitsWidget extends BaseWidget {
    static final String TICK = "ge.sagandzureli.app.HABIT_TICK";
    static final String REFRESH = "ge.sagandzureli.app.HABITS_REFRESH";

    static void draw(Context c, AppWidgetManager m, int id) {
        JSONObject s = Widgets.summary(c);
        if (Store.secret(c) == null || s == null) {
            m.updateAppWidget(id, notLinked(c, "ჩვევები"));
            return;
        }
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_habits);
        JSONObject data = Store.data(c);
        JSONArray habits = s.optJSONArray("habits");
        JSONArray done = data.optJSONArray("done");
        int daily = 0, ticked = 0;
        for (int i = 0; habits != null && i < habits.length(); i++) {
            JSONObject h = habits.optJSONObject(i);
            if (h == null || h.optInt("rare") == 1) continue;
            daily++;
            if (contains(done, h.optString("id"))) ticked++;
        }
        v.setTextViewText(R.id.count, daily > 0 ? ticked + " / " + daily : "");
        Intent svc = new Intent(c, HabitsService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
        svc.setData(Uri.parse("sagandzuri://habits/" + id));
        v.setRemoteAdapter(R.id.list, svc);
        v.setEmptyView(R.id.list, R.id.empty);
        v.setPendingIntentTemplate(R.id.list, Look.broadcast(c, HabitsWidget.class, TICK, id * 16, true));
        v.setOnClickPendingIntent(R.id.refresh, Look.broadcast(c, HabitsWidget.class, REFRESH, id * 16 + 1, false));
        v.setOnClickPendingIntent(R.id.title, Look.openButton(c, "section:chvevebi", id * 16 + 2));
        m.updateAppWidget(id, v);
    }

    static boolean contains(JSONArray a, String id) {
        for (int i = 0; a != null && i < a.length(); i++) if (id.equals(a.optString(i))) return true;
        return false;
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (REFRESH.equals(action)) {
            PendingResult r = goAsync();
            Widgets.refresh(c, r::finish);
            return;
        }
        if (!TICK.equals(action)) {
            super.onReceive(c, intent);
            return;
        }
        String habit = intent.getStringExtra("habit");
        int step = intent.getIntExtra("step", 0);
        int goal = intent.getIntExtra("goal", 0);
        String secret = Store.secret(c);
        if (habit == null || secret == null) return;
        Context app = c.getApplicationContext();
        PendingResult r = goAsync();
        Widgets.IO.execute(() -> {
            try {
                mark(app, habit, step, goal);
                Widgets.drawAll(app);
                JSONObject body = new JSONObject().put("s", secret).put("id", habit);
                if (step > 0) Net.post(Net.SERVER + "/widget/count", body.put("add", step).toString());
                else Net.post(Net.SERVER + "/widget/tick", body.toString());
                Widgets.fetchData(app);
                Widgets.drawAll(app);
            } catch (Exception ignored) {
                // the next refresh shows the server's day
            } finally {
                r.finish();
            }
        });
    }

    /** the tap, shown before the server answers */
    private static void mark(Context c, String habit, int step, int goal) throws Exception {
        JSONObject data = Store.data(c);
        if (data == null) return;
        JSONArray done = data.optJSONArray("done");
        if (done == null) data.put("done", done = new JSONArray());
        if (step > 0) {
            JSONObject counts = data.optJSONObject("counts");
            if (counts == null) data.put("counts", counts = new JSONObject());
            int n = counts.optInt(habit) + step;
            counts.put(habit, n);
            if (goal > 0 && n >= goal && !contains(done, habit)) done.put(habit);
        } else if (contains(done, habit)) {
            JSONArray next = new JSONArray();
            for (int i = 0; i < done.length(); i++) if (!habit.equals(done.optString(i))) next.put(done.optString(i));
            data.put("done", next);
        } else {
            done.put(habit);
        }
        Store.setData(c, data);
    }
}
