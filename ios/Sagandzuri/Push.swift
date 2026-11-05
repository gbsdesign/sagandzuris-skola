import FirebaseCore
import FirebaseMessaging
import UIKit
import UserNotifications

// Notifications. The reminders Worker (worker/reminders) sends this phone's notices through Firebase Cloud Messaging
// (its device row's endpoint is https://ios.sagandzureli.ge/fcm/<token>, which Shim.swift hands the site as a push
// subscription). A notice carries in its data: kind ('call' | 'call-end' | 'chat' | …), url (where a tap goes),
// answer (a ring's „პასუხი“), decline (the ring's signed ticket for the Worker's /decline). While the app is on screen
// the site rings and shows messages itself, so those notices are left out then. Without GoogleService-Info.plist the
// app runs without Firebase (the site then says notifications are off).

final class Push: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    static let shared = Push()
    static let worker = URL(string: "https://sagandzuri-reminders.mr-gabunia.workers.dev")!

    private(set) var configured = false
    private var fcmToken: String?
    // the last word the phone gave, kept for the next start: the page needs it before the phone answers again
    private var status: UNAuthorizationStatus = UNAuthorizationStatus(rawValue: UserDefaults.standard.integer(forKey: "sg-push-status")) ?? .notDetermined {
        didSet { UserDefaults.standard.set(status.rawValue, forKey: "sg-push-status") }
    }

    var permissionWord: String {
        switch status {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "default"
        }
    }

    func start() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        let answer = UNNotificationAction(identifier: "answer", title: "პასუხი", options: [.foreground])
        let decline = UNNotificationAction(identifier: "decline", title: "უარი", options: [.destructive])
        center.setNotificationCategories([UNNotificationCategory(identifier: "CALL", actions: [answer, decline], intentIdentifiers: [], options: [])])
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
            Messaging.messaging().delegate = self
            configured = true
        }
        refresh(nil)
    }

    /** Reads the phone's notification setting again (it may have changed in Settings) and tells `done` the word. */
    func refresh(_ done: ((String) -> Void)?) {
        Task { @MainActor in
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            self.status = settings.authorizationStatus
            if self.configured, self.permissionWord == "granted" { UIApplication.shared.registerForRemoteNotifications() }
            done?(self.permissionWord)
        }
    }

    @MainActor
    func state() async -> String {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        status = settings.authorizationStatus
        return permissionWord
    }

    @MainActor
    func ask() async -> String {
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        status = settings.authorizationStatus
        if configured, permissionWord == "granted" { UIApplication.shared.registerForRemoteNotifications() }
        return permissionWord
    }

    /** This phone's FCM token; `wait`: tries for up to 20 s while the phone gets its APNs token. */
    @MainActor
    func token(wait: Bool) async throws -> String? {
        guard configured else { throw AppError.notReady }
        if let t = fcmToken { return t }
        guard permissionWord == "granted" else { return nil }
        UIApplication.shared.registerForRemoteNotifications()
        for _ in 0 ..< 20 {
            if let t = try? await Messaging.messaging().token(), !t.isEmpty {
                fcmToken = t
                return t
            }
            if !wait { return nil }
            try? await Task.sleep(nanoseconds: 1_000_000_000)
        }
        return nil
    }

    func didRegister(deviceToken: Data) {
        guard configured else { return }
        Messaging.messaging().apnsToken = deviceToken
    }

    func didFailToRegister(_ error: Error) {
        print("push: \(error.localizedDescription)")
    }

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        self.fcmToken = fcmToken
    }

    func showLocal(title: String, body: String, tag: String, url: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = ["url": url]
        let id = tag.isEmpty ? UUID().uuidString : tag
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: nil))
    }

    // MARK: notices arriving and tapped

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let kind = notification.request.content.userInfo["kind"] as? String ?? ""
        if UIApplication.shared.applicationState == .active, ["call", "call-end", "chat"].contains(kind) {
            completionHandler([])
        } else {
            completionHandler([.banner, .list, .sound])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        if configured { Messaging.messaging().appDidReceiveMessage(info) }
        switch response.actionIdentifier {
        case "decline":
            guard let ticket = info["decline"] as? [String: Any], let body = try? JSONSerialization.data(withJSONObject: ticket) else {
                completionHandler()
                return
            }
            var request = URLRequest(url: Self.worker.appendingPathComponent("decline"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("https://sagandzureli.ge", forHTTPHeaderField: "Origin")
            request.httpBody = body
            URLSession.shared.dataTask(with: request) { _, _, _ in completionHandler() }.resume()
            return
        case UNNotificationDismissActionIdentifier:
            break
        case "answer":
            let path = info["answer"] as? String ?? info["url"] as? String ?? "/"
            DispatchQueue.main.async { WebViewController.shared.openPath(path) }
        default:
            let path = info["url"] as? String ?? "/"
            DispatchQueue.main.async { WebViewController.shared.openPath(path.isEmpty ? "/" : path) }
        }
        completionHandler()
    }
}
