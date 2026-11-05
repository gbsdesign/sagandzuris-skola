import SafariServices
import UIKit
import WebKit

// The site in the app's own web view. Only the site's own addresses open inside (they are the app-bound domains, which
// also give the site its service worker, so the notes work offline); any other page opens in Safari's sheet, mail and
// phone links in their apps. Files the site saves (the games' PDF kits, recordings) come to the share sheet.

final class WebViewController: UIViewController {
    static let shared = WebViewController()
    static let home = URL(string: "https://sagandzureli.ge/")!
    static let paper = UIColor(red: 252 / 255, green: 249 / 255, blue: 245 / 255, alpha: 1)
    static var version: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1" }

    private(set) var webView: WKWebView!
    private let bridge = NativeBridge()
    private var pendingURL: URL?
    private var loadedOnce = false
    private var offlineView: UIView?
    private var downloads: [ObjectIdentifier: URL] = [:]

    static func isAppHost(_ host: String?) -> Bool {
        guard let h = host?.lowercased() else { return false }
        return h == "sagandzureli.ge" || h == "www.sagandzureli.ge" || h == "sagandzuris-skola.pages.dev" || h.hasSuffix(".sagandzuris-skola.pages.dev")
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.limitsNavigationsToAppBoundDomains = true
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "Mobile/15E148 Safari/604.1 SagandzuriIOS/\(Self.version)"
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        let content = config.userContentController
        content.addUserScript(WKUserScript(source: Shim.source(permission: Push.shared.permissionWord, version: Self.version),
                                           injectionTime: .atDocumentStart, forMainFrameOnly: true))
        content.addScriptMessageHandler(bridge, contentWorld: .page, name: "sg")

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false
        web.backgroundColor = Self.paper
        web.scrollView.backgroundColor = Self.paper
        // the site lays itself out under the notch by env(safe-area-inset-*)
        web.scrollView.contentInsetAdjustmentBehavior = .never
        if #available(iOS 16.4, *) { web.isInspectable = true }
        webView = web
        bridge.webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: pendingURL ?? Self.home))
        pendingURL = nil
    }

    // MARK: links from outside (universal links, notifications)

    /** A path of the site ("/?open=chat&id=…") or a whole address. */
    func openPath(_ path: String) {
        guard let url = URL(string: path, relativeTo: Self.home)?.absoluteURL else { return }
        open(url)
    }

    func open(_ url: URL) {
        guard Self.isAppHost(url.host) else { openOutside(url); return }
        guard isViewLoaded else { pendingURL = url; return }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let inPage = items.contains { $0.name == "open" || $0.name == "prayer" }
        guard loadedOnce, inPage else { webView.load(URLRequest(url: url)); return }
        // the open site goes there itself (App.tsx sgOpenUrl), without loading again
        let path = (url.path.isEmpty ? "/" : url.path) + (url.query.map { "?\($0)" } ?? "")
        let literal = (try? String(data: JSONSerialization.data(withJSONObject: [path]), encoding: .utf8)) ?? "[\"/\"]"
        let js = "typeof window.sgOpenUrl === 'function' ? (window.sgOpenUrl(\(literal)[0]), true) : false"
        webView.evaluateJavaScript(js) { [weak self] result, _ in
            if (result as? Bool) != true { self?.webView.load(URLRequest(url: url)) }
        }
    }

    func becameActive() {
        Push.shared.refresh { [weak self] word in
            self?.webView?.evaluateJavaScript("window.sgIOS && window.sgIOS.setPermission('\(word)')", completionHandler: nil)
        }
    }

    // MARK: outside the app

    var top: UIViewController {
        var c: UIViewController = self
        while let p = c.presentedViewController { c = p }
        return c
    }

    func openOutside(_ url: URL) {
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == "http" || scheme == "https" {
            let safari = SFSafariViewController(url: url)
            safari.preferredControlTintColor = UIColor(red: 122 / 255, green: 32 / 255, blue: 40 / 255, alpha: 1)
            top.present(safari, animated: true)
        } else {
            UIApplication.shared.open(url)
        }
    }

    func share(_ items: [Any]) {
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 40, width: 1, height: 1)
        top.present(sheet, animated: true)
    }

    // MARK: no internet on the first page

    private func showOffline() {
        guard offlineView == nil else { return }
        let box = UIView()
        box.backgroundColor = Self.paper
        box.translatesAutoresizingMaskIntoConstraints = false
        let title = UILabel()
        title.text = "ინტერნეტი არ არის"
        title.font = .systemFont(ofSize: 22, weight: .bold)
        title.textColor = UIColor(red: 74 / 255, green: 52 / 255, blue: 38 / 255, alpha: 1)
        let text = UILabel()
        text.text = "პირველად გასახსნელად აპს ინტერნეტი სჭირდება. შემდეგ ნოტები ინტერნეტის გარეშეც გაიხსნება."
        text.numberOfLines = 0
        text.textAlignment = .center
        text.font = .systemFont(ofSize: 17)
        text.textColor = UIColor(red: 117 / 255, green: 104 / 255, blue: 90 / 255, alpha: 1)
        var look = UIButton.Configuration.filled()
        look.title = "თავიდან ცდა"
        look.cornerStyle = .capsule
        look.baseBackgroundColor = UIColor(red: 122 / 255, green: 32 / 255, blue: 40 / 255, alpha: 1)
        look.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 28, bottom: 14, trailing: 28)
        let retry = UIButton(configuration: look, primaryAction: UIAction { [weak self] _ in
            guard let self else { return }
            self.webView.load(URLRequest(url: self.webView.url ?? Self.home))
        })
        let stack = UIStackView(arrangedSubviews: [title, text, retry])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        box.addSubview(stack)
        view.addSubview(box)
        NSLayoutConstraint.activate([
            box.leadingAnchor.constraint(equalTo: view.leadingAnchor), box.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            box.topAnchor.constraint(equalTo: view.topAnchor), box.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            stack.centerYAnchor.constraint(equalTo: box.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 32), stack.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -32),
        ])
        offlineView = box
    }

    private func hideOffline() {
        offlineView?.removeFromSuperview()
        offlineView = nil
    }
}

// MARK: - navigation

extension WebViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload { decisionHandler(.download); return }
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        let scheme = url.scheme?.lowercased() ?? ""
        if ["blob", "data", "about", "javascript"].contains(scheme) { decisionHandler(.allow); return }
        // a frame inside a page (a YouTube film, a map) may come from anywhere
        if let frame = navigationAction.targetFrame, !frame.isMainFrame { decisionHandler(.allow); return }
        let ownPage = (scheme == "https" || scheme == "http") && Self.isAppHost(url.host)
        if navigationAction.targetFrame == nil {
            // a link meant for a new window: the site's own pages stay in the app, the rest go out
            decisionHandler(.cancel)
            if ownPage { webView.load(navigationAction.request) } else { openOutside(url) }
            return
        }
        if ownPage { decisionHandler(.allow); return }
        decisionHandler(.cancel)
        openOutside(url)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loadedOnce = true
        hideOffline()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let e = error as NSError
        let offline: Set<Int> = [NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorTimedOut,
                                 NSURLErrorCannotFindHost, NSURLErrorCannotConnectToHost, NSURLErrorDNSLookupFailed]
        if e.domain == NSURLErrorDomain, offline.contains(e.code), !loadedOnce { showOffline() }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}

// MARK: - files the site saves

extension WebViewController: WKDownloadDelegate {
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let name = suggestedFilename.isEmpty ? "საგანძური" : suggestedFilename
        let url = dir.appendingPathComponent(name)
        downloads[ObjectIdentifier(download)] = url
        completionHandler(url)
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let url = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        share([url])
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads.removeValue(forKey: ObjectIdentifier(download))
    }
}

// MARK: - windows, questions, the microphone

extension WebViewController: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, url.absoluteString != "about:blank" {
            if Self.isAppHost(url.host) { webView.load(navigationAction.request) } else { openOutside(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "კარგი", style: .default) { _ in completionHandler() })
        top.present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "არა", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "კი", style: .default) { _ in completionHandler(true) })
        top.present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "გაუქმება", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "კარგი", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        top.present(alert, animated: true)
    }

    // the phone asks once for the microphone / camera; the site's own pages need not ask again every time
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(Self.isAppHost(origin.host) ? .grant : .prompt)
    }

    // „პანტომიმა“'s forehead way reads the phone's tilt
    func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(Self.isAppHost(origin.host) ? .grant : .prompt)
    }
}
