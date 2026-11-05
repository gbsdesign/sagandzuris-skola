import UIKit
import WebKit

// The site calls the app through window.sgIOS.call(fn, args) (Shim.swift), which answers with a promise:
//   info                 → { version, build, firebase }
//   notifyState          → 'granted' | 'denied' | 'default'
//   notifyAsk            → the same, after asking the phone (it asks only once)
//   pushToken { wait }   → this phone's Firebase Cloud Messaging token, or null
//   notify { title, body, tag, url } — a notice now (the site's own new Notification(…) while it is open)
//   google, apple        → a sign-in's tokens for Firebase (src/context/AuthContext.tsx signs in with them)
//   external { url }     → opens a page outside the app
// An error comes back as its short word: 'cancelled' (the person closed the window), 'not-ready', or the reason.

final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var webView: WKWebView?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let fn = body["fn"] as? String else {
            replyHandler(nil, "bad-call")
            return
        }
        let args = body["args"] as? [String: Any] ?? [:]
        Task { @MainActor in
            do {
                replyHandler(try await self.run(fn, args), nil)
            } catch let e as AppError {
                replyHandler(nil, e.word)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }
        }
    }

    @MainActor
    private func run(_ fn: String, _ args: [String: Any]) async throws -> Any? {
        switch fn {
        case "info":
            let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
            return ["version": WebViewController.version, "build": build, "firebase": Push.shared.configured]
        case "notifyState":
            return await Push.shared.state()
        case "notifyAsk":
            return await Push.shared.ask()
        case "pushToken":
            return try await Push.shared.token(wait: args["wait"] as? Bool ?? true) ?? NSNull()
        case "notify":
            Push.shared.showLocal(title: args["title"] as? String ?? "", body: args["body"] as? String ?? "",
                                  tag: args["tag"] as? String ?? "", url: args["url"] as? String ?? "")
            return true
        case "google":
            return try await SignIn.google()
        case "apple":
            return try await SignIn.apple()
        case "external":
            if let s = args["url"] as? String, let url = URL(string: s) { WebViewController.shared.openOutside(url) }
            return true
        default:
            throw AppError.failed("unknown \(fn)")
        }
    }
}

enum AppError: Error {
    case cancelled, notReady, failed(String)

    var word: String {
        switch self {
        case .cancelled: return "cancelled"
        case .notReady: return "not-ready"
        case let .failed(why): return why
        }
    }
}
