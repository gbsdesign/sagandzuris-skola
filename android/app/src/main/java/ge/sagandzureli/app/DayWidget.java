package ge.sagandzureli.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.graphics.Typeface;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** Today in the church calendar: the date, the day's name and its saints, the feast first. Needs no account. */
public class DayWidget extends BaseWidget {
    static void draw(Context c, AppWidgetManager m, int id) {
        Calendar now = Look.now();
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.w_day);
        v.setTextViewText(R.id.date, Look.dateText(now));
        JSONObject days = Store.days(c, now.get(Calendar.YEAR));
        JSONObject day = days == null ? null : days.optJSONObject("days") == null ? null : days.optJSONObject("days").optJSONObject(Look.today());
        String title = day == null ? "" : day.optString("t");
        v.setTextViewText(R.id.weekday, title.isEmpty() ? Look.weekday(now) : title);
        SpannableStringBuilder b = new SpannableStringBuilder();
        JSONArray saints = day == null ? null : day.optJSONArray("s");
        if (saints != null) {
            for (int i = 0; i < saints.length() && i < 6; i++) {
                JSONArray s = saints.optJSONArray(i);
                if (s == null) continue;
                if (b.length() > 0) b.append('\n');
                int start = b.length();
                b.append(s.optString(0));
                if (s.optInt(1) == 1) {
                    b.setSpan(new StyleSpan(Typeface.BOLD), start, b.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    b.setSpan(new ForegroundColorSpan(Look.WINE), start, b.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                }
            }
        }
        if (b.length() == 0) b.append(days == null ? "კალენდარი იტვირთება…" : "");
        v.setTextViewText(R.id.saints, b);
        v.setOnClickPendingIntent(R.id.root, Look.openButton(c, "special:calendar", id * 16));
        m.updateAppWidget(id, v);
    }
}
