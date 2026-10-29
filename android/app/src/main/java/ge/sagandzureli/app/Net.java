package ge.sagandzureli.app;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Plain HTTPS calls to the reminders Worker and the site; always off the main thread. */
final class Net {
    private Net() {}

    static final String SERVER = "https://sagandzuri-reminders.mr-gabunia.workers.dev";
    static final String SITE = "https://sagandzureli.ge";

    /** the body of a 2xx answer, else null */
    static String get(String url) { return call("GET", url, null); }
    static String post(String url, String json) { return call("POST", url, json); }

    private static String call(String method, String url, String json) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod(method);
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            if (json != null) {
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                try (OutputStream out = c.getOutputStream()) {
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                }
            }
            int code = c.getResponseCode();
            if (code < 200 || code >= 300) return code == 401 ? UNKNOWN : null;
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
                return b.toString("UTF-8");
            }
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    /** the server no longer knows the secret (the member unlinked or it was replaced) */
    static final String UNKNOWN = "\u0000unknown";
}
