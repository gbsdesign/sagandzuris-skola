package ge.sagandzureli.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * The app's own window (2026-11-11): the live site in the app's WebView instead of Chrome (the old Trusted Web Activity),
 * as the iPhone app does it (ios/Sagandzuri/WebViewController.swift). The site's updates still need no app update.
 * Before the site's scripts every page gets window.sgApp (Bridge.java, the same calls as the iPhone's window.sgIOS), so the
 * site knows it is in the app and asks it for what a web view cannot do: Google's sign-in (Google refuses its page inside
 * an app) and, from stage 2, the phone's notifications.
 * Pages of other sites open outside the app; sagandzuri://… and intent://… links go to the app's own screens.
 */
public class MainActivity extends ComponentActivity {
    static final Set<String> HOSTS = new HashSet<>(Arrays.asList("sagandzureli.ge", "www.sagandzureli.ge", "sagandzuris-skola.pages.dev"));
    private static final int ASK_MEDIA = 11, ASK_PLACE = 12, ASK_CAMERA = 13, PICK_FILE = 21;

    private WebView web;
    private FrameLayout root;
    private Bridge bridge;

    private PermissionRequest pendingMedia;
    private String placeOrigin;
    private GeolocationPermissions.Callback placeCallback;
    private ValueCallback<Uri[]> pendingFiles;
    private WebChromeClient.FileChooserParams pendingParams;
    private Uri photoUri;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(true);

        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.paper));
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.paper));
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // the page stays clear of the status and navigation bars and of the keyboard
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setGeolocationEnabled(true);
        s.setUserAgentString(s.getUserAgentString() + " SagandzuriApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        bridge = new Bridge(this, web);
        web.addJavascriptInterface(bridge, Bridge.NAME);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Set<String> origins = new HashSet<>();
            for (String h : HOSTS) origins.add("https://" + h);
            WebViewCompat.addDocumentStartJavaScript(web, Bridge.script(), origins);
        }

        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener((url, agent, disposition, mime, length) -> download(url, disposition, mime));

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (fullView != null) { leaveFullScreen(); return; }
                if (web.canGoBack()) { web.goBack(); return; }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(urlOf(getIntent()));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null && isOurs(data)) web.loadUrl(data.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        bridge.resumed();
    }

    @Override
    protected void onPause() {
        // web.onPause() is not called: a recording keeps playing with the screen off, as it did in Chrome
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    /** the page to open: a link of the site the app was opened with (a widget, a notice, a shortcut), else home */
    static String urlOf(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data != null && isOurs(data)) return data.toString();
        return Net.SITE + "/";
    }

    static boolean isOurs(Uri u) {
        return u != null && "https".equals(u.getScheme()) && u.getHost() != null && HOSTS.contains(u.getHost());
    }

    /** a page outside the site: the phone's browser or the app it belongs to */
    void openOutside(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException e) {
            /* nothing can open it */
        }
    }

    private boolean route(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        if ("https".equals(scheme) && isOurs(u)) return false;
        if ("intent".equals(scheme)) {
            try {
                Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE).setComponent(null).setSelector(null);
                startActivity(i);
            } catch (Exception e) {
                /* a broken link */
            }
            return true;
        }
        if ("sagandzuri".equals(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u).setPackage(getPackageName()));
            } catch (ActivityNotFoundException e) {
                /* none */
            }
            return true;
        }
        if ("about".equals(scheme) || "blob".equals(scheme) || "data".equals(scheme) || "javascript".equals(scheme)) return false;
        openOutside(u);
        return true;
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (!request.isForMainFrame() && !"intent".equals(request.getUrl().getScheme()) && !"sagandzuri".equals(request.getUrl().getScheme())) return false;
            return route(request.getUrl());
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            // a WebView too old for the document-start script gets the bridge as early as it can
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT) && isOurs(Uri.parse(url))) {
                view.evaluateJavascript(Bridge.script(), null);
            }
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                if (!isOurs(request.getOrigin())) { request.deny(); return; }
                List<String> need = new ArrayList<>();
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) need.add(Manifest.permission.RECORD_AUDIO);
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) need.add(Manifest.permission.CAMERA);
                }
                List<String> missing = new ArrayList<>();
                for (String p : need) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
                if (missing.isEmpty()) { request.grant(request.getResources()); return; }
                if (pendingMedia != null) pendingMedia.deny();
                pendingMedia = request;
                requestPermissions(missing.toArray(new String[0]), ASK_MEDIA);
            });
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (!isOurs(Uri.parse(origin))) { callback.invoke(origin, false, false); return; }
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                callback.invoke(origin, true, false);
                return;
            }
            placeOrigin = origin;
            placeCallback = callback;
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, ASK_PLACE);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (pendingFiles != null) pendingFiles.onReceiveValue(null);
            pendingFiles = callback;
            pendingParams = params;
            if (params.isCaptureEnabled() && wantsImage(params)) {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, ASK_CAMERA);
                    return true;
                }
                takePhoto();
                return true;
            }
            pickFile(params);
            return true;
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (fullView != null) { callback.onCustomViewHidden(); return; }
            fullView = view;
            fullCallback = callback;
            root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        @Override
        public void onHideCustomView() {
            leaveFullScreen();
        }
    }

    private void leaveFullScreen() {
        if (fullView == null) return;
        root.removeView(fullView);
        fullView = null;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (fullCallback != null) fullCallback.onCustomViewHidden();
        fullCallback = null;
    }

    private static boolean wantsImage(WebChromeClient.FileChooserParams p) {
        String[] types = p.getAcceptTypes();
        if (types == null) return false;
        for (String t : types) if (t != null && t.startsWith("image")) return true;
        return false;
    }

    private void pickFile(WebChromeClient.FileChooserParams params) {
        try {
            startActivityForResult(params.createIntent(), PICK_FILE);
        } catch (ActivityNotFoundException e) {
            finishFiles(null);
        }
    }

    private void takePhoto() {
        try {
            File dir = new File(getCacheDir(), "photos");
            if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException();
            File f = File.createTempFile("photo", ".jpg", dir);
            photoUri = FileProvider.getUriForFile(this, getString(R.string.provider_authority), f);
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, PICK_FILE);
        } catch (Exception e) {
            photoUri = null;
            if (pendingParams != null) pickFile(pendingParams);
            else finishFiles(null);
        }
    }

    private void finishFiles(Uri[] picked) {
        if (pendingFiles != null) pendingFiles.onReceiveValue(picked);
        pendingFiles = null;
        pendingParams = null;
        photoUri = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE) return;
        if (resultCode != RESULT_OK) { finishFiles(null); return; }
        if (photoUri != null) { finishFiles(new Uri[]{photoUri}); return; }
        finishFiles(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        boolean any = false;
        for (int r : results) any |= r == PackageManager.PERMISSION_GRANTED;
        if (requestCode == ASK_MEDIA && pendingMedia != null) {
            boolean all = results.length > 0;
            for (int r : results) all &= r == PackageManager.PERMISSION_GRANTED;
            if (all) pendingMedia.grant(pendingMedia.getResources());
            else pendingMedia.deny();
            pendingMedia = null;
        } else if (requestCode == ASK_PLACE && placeCallback != null) {
            placeCallback.invoke(placeOrigin, any, false);
            placeCallback = null;
        } else if (requestCode == ASK_CAMERA) {
            if (any) takePhoto();
            else if (pendingParams != null) pickFile(pendingParams);
        } else if (requestCode == Bridge.ASK_NOTICES) {
            bridge.noticesAnswered();
        }
    }

    /** a file the site links to (a recording's MP3, a PDF): the phone's Downloads; the site's own made files come through the bridge */
    private void download(String url, String disposition, String mime) {
        Uri u = Uri.parse(url);
        if (!"https".equals(u.getScheme())) return;
        try {
            String name = URLUtil.guessFileName(url, disposition, mime);
            DownloadManager.Request r = new DownloadManager.Request(u)
                .setMimeType(mime)
                .setTitle(name)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) r.addRequestHeader("Cookie", cookies);
            getSystemService(DownloadManager.class).enqueue(r);
        } catch (Exception e) {
            openOutside(u);
        }
    }
}
