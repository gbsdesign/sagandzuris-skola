package ge.sagandzureli.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.util.SparseBooleanArray;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Which buttons a buttons widget shows (up to eight): the home vine's places, then the member's own home buttons. */
public class ButtonsConfigActivity extends Activity {
    static final int MAX = 8;
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
    private final List<String[]> items = new ArrayList<>();

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        setResult(RESULT_CANCELED);
        Bundle extras = getIntent().getExtras();
        if (extras != null) widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }
        setContentView(R.layout.activity_buttons);

        for (String[] item : Look.CATALOG) items.add(new String[] {item[0], item[1]});
        JSONObject s = Widgets.summary(this);
        JSONArray mine = s == null ? null : s.optJSONArray("buttons");
        for (int i = 0; mine != null && i < mine.length(); i++) {
            JSONObject b = mine.optJSONObject(i);
            if (b == null || Look.catalogItem(b.optString("id")) != null || b.optString("t").isEmpty()) continue;
            items.add(new String[] {b.optString("id"), b.optString("t")});
        }
        List<String> labels = new ArrayList<>();
        for (String[] item : items) labels.add(item[1]);

        ListView list = findViewById(R.id.list);
        list.setChoiceMode(ListView.CHOICE_MODE_MULTIPLE);
        list.setAdapter(new ArrayAdapter<>(this, R.layout.item_choice, labels));
        JSONArray chosen = ButtonsWidget.list(this, widgetId);
        for (int i = 0; i < chosen.length(); i++) {
            String id = chosen.optJSONObject(i) == null ? "" : chosen.optJSONObject(i).optString("id");
            for (int k = 0; k < items.size(); k++) if (items.get(k)[0].equals(id)) list.setItemChecked(k, true);
        }
        list.setOnItemClickListener((parent, view, position, rowId) -> {
            if (list.getCheckedItemCount() > MAX) {
                list.setItemChecked(position, false);
                Toast.makeText(this, "მაქსიმუმ " + MAX + " ღილაკი", Toast.LENGTH_SHORT).show();
            }
            count(list);
        });
        count(list);
        findViewById(R.id.save).setOnClickListener(v -> save(list));
    }

    private void count(ListView list) {
        ((TextView) findViewById(R.id.hint)).setText("მონიშნულია " + list.getCheckedItemCount() + " / " + MAX);
    }

    private void save(ListView list) {
        SparseBooleanArray checked = list.getCheckedItemPositions();
        JSONArray out = new JSONArray();
        for (int k = 0; k < items.size(); k++) {
            if (!checked.get(k)) continue;
            try {
                out.put(new JSONObject().put("id", items.get(k)[0]).put("t", items.get(k)[1]));
            } catch (Exception ignored) {
                // plain strings
            }
        }
        if (out.length() == 0) {
            Toast.makeText(this, "მონიშნე ერთი ღილაკი მაინც", Toast.LENGTH_SHORT).show();
            return;
        }
        Store.setButtons(this, widgetId, out);
        ButtonsWidget.draw(this, AppWidgetManager.getInstance(this), widgetId);
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        finish();
    }
}
