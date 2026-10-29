package ge.sagandzureli.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** What the widgets keep on the phone: the member's secret, their last day from the server and the calendar's days. */
final class Store {
    private Store() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("widgets", Context.MODE_PRIVATE);
    }

    static String secret(Context c) { return prefs(c).getString("secret", null); }
    static void setSecret(Context c, String s) { prefs(c).edit().putString("secret", s).apply(); }

    /** the last answer of /widget/data, or null */
    static JSONObject data(Context c) {
        try {
            String s = prefs(c).getString("data", null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }
    static void setData(Context c, JSONObject o) { prefs(c).edit().putString("data", o.toString()).apply(); }

    /** the buttons a buttons widget shows */
    static JSONArray buttons(Context c, int widgetId) {
        try {
            String s = prefs(c).getString("buttons-" + widgetId, null);
            return s == null ? null : new JSONArray(s);
        } catch (Exception e) {
            return null;
        }
    }
    static void setButtons(Context c, int widgetId, JSONArray list) {
        prefs(c).edit().putString("buttons-" + widgetId, list.toString()).apply();
    }
    static void forgetButtons(Context c, int widgetId) { prefs(c).edit().remove("buttons-" + widgetId).apply(); }

    static long dayFetched(Context c, int year) { return prefs(c).getLong("days-at-" + year, 0); }

    /** the calendar file of a year (public/widget/days-<year>.json), kept as it came */
    static JSONObject days(Context c, int year) {
        File f = new File(c.getFilesDir(), "days-" + year + ".json");
        if (!f.exists()) return null;
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) f.length()];
            int n = 0;
            while (n < b.length) {
                int r = in.read(b, n, b.length - n);
                if (r < 0) break;
                n += r;
            }
            return new JSONObject(new String(b, 0, n, StandardCharsets.UTF_8));
        } catch (Exception e) {
            return null;
        }
    }
    static void setDays(Context c, int year, String text) {
        File f = new File(c.getFilesDir(), "days-" + year + ".json");
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
            prefs(c).edit().putLong("days-at-" + year, System.currentTimeMillis()).apply();
        } catch (Exception ignored) {
            // the next refresh tries again
        }
    }

    static int savedFilter(Context c) { return prefs(c).getInt("silence-before", -1); }
    static void setSavedFilter(Context c, int f) { prefs(c).edit().putInt("silence-before", f).apply(); }
    static boolean askedSilence(Context c) { return prefs(c).getBoolean("silence-asked", false); }
    static void setAskedSilence(Context c) { prefs(c).edit().putBoolean("silence-asked", true).apply(); }
}
