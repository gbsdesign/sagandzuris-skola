package ge.sagandzureli.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * sagandzuri://link?s=<secret> — the profile's „ვიჯეტის დაკავშირება“ hands the app the member's widget secret. This window
 * says it is done and offers each widget for the home screen (the launcher asks where to put it).
 */
public class LinkActivity extends Activity {
    private static final Object[][] WIDGETS = {
        {ButtonsWidget.class, "ღილაკები", "გალობა, სიმღერა, ლოცვანი… — შენ ირჩევ", "layout-grid"},
        {HabitsWidget.class, "ჩვევები", "დღის ჩვევები, მონიშვნა ერთი შეხებით", "sprout"},
        {PathWidget.class, "საგანძურის გზა", "გზის პროცენტები და დღეს გასამეორებელი", "compass"},
        {DayWidget.class, "დღის კალენდარი", "დღესასწაული და დღის წმიდანები", "calendar-days"},
        {KanonWidget.class, "ჩემი კანონი", "ფსალმუნთა ჯგუფში შენი კანონი", "book-marked"},
        {QuoteWidget.class, "დღის სიტყვა", "მამათა სიტყვა ყოველ დღე", "feather"},
    };

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Uri data = getIntent().getData();
        String secret = data == null ? null : data.getQueryParameter("s");
        if (secret != null && secret.length() >= 16 && secret.length() <= 200) {
            Store.setSecret(this, secret);
            Widgets.refresh(this, null);
        }
        setContentView(R.layout.activity_link);
        ((TextView) findViewById(R.id.title)).setText(Store.secret(this) != null ? "ვიჯეტები დაკავშირდა" : "ვიჯეტები");

        AppWidgetManager m = AppWidgetManager.getInstance(this);
        boolean canPin = m.isRequestPinAppWidgetSupported();
        LinearLayout list = findViewById(R.id.list);
        LayoutInflater inflater = getLayoutInflater();
        for (Object[] w : WIDGETS) {
            View row = inflater.inflate(R.layout.item_pin, list, false);
            ((ImageView) row.findViewById(R.id.icon)).setImageResource(Look.icon(this, (String) w[3]));
            ((TextView) row.findViewById(R.id.name)).setText((String) w[1]);
            ((TextView) row.findViewById(R.id.sub)).setText((String) w[2]);
            View add = row.findViewById(R.id.add);
            if (canPin) {
                ComponentName provider = new ComponentName(this, (Class<?>) w[0]);
                add.setOnClickListener(v -> m.requestPinAppWidget(provider, null, null));
            } else {
                add.setVisibility(View.GONE);
            }
            list.addView(row);
        }
        ((TextView) findViewById(R.id.hint)).setText(canPin
            ? "„დამატება“ ვიჯეტს მთავარ ეკრანზე დადებს. ან: მთავარ ეკრანზე თითი დიდხანს დააჭირე → „ვიჯეტები“ → „საგანძური“."
            : "მთავარ ეკრანზე თითი დიდხანს დააჭირე → „ვიჯეტები“ → „საგანძური“.");
        findViewById(R.id.close).setOnClickListener(v -> finish());
    }
}
