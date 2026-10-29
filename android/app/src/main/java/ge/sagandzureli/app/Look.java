package ge.sagandzureli.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/** Shared looks and links of the widgets: the buttons' catalog, the icons, the site's addresses, the Georgian date. */
final class Look {
    private Look() {}

    static final int WINE = Color.parseColor("#7A2028");
    static final int GOLD = Color.parseColor("#B7791F");
    static final int INK = Color.parseColor("#2B2420");
    static final int MUTED = Color.parseColor("#8A7A6A");

    /** the home vine's sections and the specials — the same ids as the site's home buttons (src/utils/shortcuts.ts) */
    static final String[][] CATALOG = {
        {"section:galoba", "გალობა", "music"},
        {"section:simghera", "სიმღერა", "music-2"},
        {"section:mtkmeli", "მთქმელი", "feather"},
        {"library:prayers", "ლოცვანი", "book-open"},
        {"section:chvevebi", "ჩვევები", "sprout"},
        {"section:gza", "საგანძურის გზა", "compass"},
        {"special:kathisma", "ჩემი კანონი", "book-marked"},
        {"special:liturgy", "დღევანდელი წირვა", "church"},
        {"special:calendar", "კალენდარი", "calendar-days"},
        {"section:biblioteka", "ბიბლიოთეკა", "library"},
        {"section:sakravebi", "საკრავები", "guitar"},
        {"section:tamashebi", "თამაშები", "sparkles"},
        {"section:medavitneobaTopic", "მედავითნეობა", "scroll-text"},
        {"special:class", "ჩემი კლასი", "users"},
    };

    static String[] catalogItem(String id) {
        for (String[] item : CATALOG) if (item[0].equals(id)) return item;
        return null;
    }

    /** a button's icon: the catalog's, else by its kind */
    static int buttonIcon(Context c, String id) {
        String[] item = catalogItem(id);
        if (item != null) return icon(c, item[2]);
        if (id.startsWith("chant") || id.startsWith("service")) return icon(c, "music");
        if (id.startsWith("song")) return icon(c, "music-2");
        if (id.startsWith("prayer")) return icon(c, "book-open");
        if (id.startsWith("habit")) return icon(c, "sprout");
        if (id.startsWith("library")) return icon(c, "library");
        if (id.startsWith("feast") || id.startsWith("life")) return icon(c, "star");
        return icon(c, "sparkle");
    }

    /** lucide icon by its name (res/drawable/lc_<name>.xml, scripts/android/icons.mjs) */
    static int icon(Context c, String name) {
        if (name == null) return R.drawable.lc_sparkle;
        int id = c.getResources().getIdentifier("lc_" + name.replace('-', '_'), "drawable", c.getPackageName());
        return id != 0 ? id : R.drawable.lc_sparkle;
    }

    static int color(String hex, int fallback) {
        try {
            return hex == null ? fallback : Color.parseColor(hex);
        } catch (Exception e) {
            return fallback;
        }
    }

    /** opens the site in the app at `query` ("open=sc&id=…"; empty = home) */
    static PendingIntent open(Context c, String query, int requestCode) {
        Uri uri = Uri.parse(Net.SITE + "/" + (query.isEmpty() ? "" : "?" + query));
        Intent i = new Intent(Intent.ACTION_VIEW, uri, c, LauncherActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent openButton(Context c, String id, int requestCode) {
        return open(c, "open=sc&id=" + Uri.encode(id), requestCode);
    }

    /** a broadcast to one of the app's own receivers */
    static PendingIntent broadcast(Context c, Class<?> to, String action, int requestCode, boolean mutable) {
        Intent i = new Intent(c, to).setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (mutable ? PendingIntent.FLAG_MUTABLE : PendingIntent.FLAG_IMMUTABLE);
        return PendingIntent.getBroadcast(c, requestCode, i, flags);
    }

    static final TimeZone TBILISI = TimeZone.getTimeZone("Asia/Tbilisi");

    static Calendar now() { return Calendar.getInstance(TBILISI); }

    /** "2026-10-29" in Tbilisi */
    static String today() {
        Calendar d = now();
        return String.format(Locale.ROOT, "%04d-%02d-%02d", d.get(Calendar.YEAR), d.get(Calendar.MONTH) + 1, d.get(Calendar.DAY_OF_MONTH));
    }

    private static final String[] MONTHS = {"იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო",
        "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"};
    private static final String[] WEEKDAYS = {"კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"};

    /** "29 ოქტომბერი" */
    static String dateText(Calendar d) { return d.get(Calendar.DAY_OF_MONTH) + " " + MONTHS[d.get(Calendar.MONTH)]; }
    static String weekday(Calendar d) { return WEEKDAYS[d.get(Calendar.DAY_OF_WEEK) - 1]; }
}
