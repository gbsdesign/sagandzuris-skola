package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Brings the widgets' data from the server and redraws every widget on the home screen. */
final class Widgets {
    private Widgets() {}

    static final ExecutorService IO = Executors.newSingleThreadExecutor();

    static final Class<?>[] ALL = {ButtonsWidget.class, HabitsWidget.class, PathWidget.class, DayWidget.class,
        KanonWidget.class, QuoteWidget.class};

    /** the member's day: the site's last summary + today's ticks; network, never on the main thread */
    static void fetchData(Context c) {
        String secret = Store.secret(c);
        if (secret == null) return;
        String body = Net.get(Net.SERVER + "/widget/data?s=" + android.net.Uri.encode(secret));
        if (Net.UNKNOWN.equals(body)) {
            Store.setSecret(c, null);
            return;
        }
        if (body == null) return;
        try {
            Store.setData(c, new JSONObject(body));
        } catch (Exception ignored) {
            // keep the last good one
        }
    }

    /** the calendar's days of this year, fetched again once a day */
    static void fetchDays(Context c) {
        int year = Look.now().get(Calendar.YEAR);
        if (Store.days(c, year) != null && System.currentTimeMillis() - Store.dayFetched(c, year) < 24L * 3600 * 1000) return;
        String body = Net.get(Net.SITE + "/widget/days-" + year + ".json");
        if (body != null && body.startsWith("{")) Store.setDays(c, year, body);
    }

    static void fetchAll(Context c) {
        fetchData(c);
        fetchDays(c);
    }

    static void drawAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (Class<?> k : ALL) {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, k));
            if (ids.length == 0) continue;
            for (int id : ids) {
                if (k == ButtonsWidget.class) ButtonsWidget.draw(c, m, id);
                else if (k == HabitsWidget.class) HabitsWidget.draw(c, m, id);
                else if (k == PathWidget.class) PathWidget.draw(c, m, id);
                else if (k == DayWidget.class) DayWidget.draw(c, m, id);
                else if (k == KanonWidget.class) KanonWidget.draw(c, m, id);
                else QuoteWidget.draw(c, m, id);
            }
            if (k == HabitsWidget.class) m.notifyAppWidgetViewDataChanged(ids, R.id.list);
        }
    }

    /** fetch, then redraw; `done` runs at the end (a receiver's finish) */
    static void refresh(Context c, Runnable done) {
        Context app = c.getApplicationContext();
        IO.execute(() -> {
            try {
                fetchAll(app);
                drawAll(app);
            } finally {
                if (done != null) done.run();
            }
        });
    }

    static JSONObject summary(Context c) {
        JSONObject d = Store.data(c);
        return d == null ? null : d.optJSONObject("summary");
    }
}
