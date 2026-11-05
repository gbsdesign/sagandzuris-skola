import AVFoundation
import GoogleSignIn
import UIKit

// The app's start: notifications get ready, the audio may go on with the screen locked, and the one window shows the
// site (WebViewController). Links into the site (universal links, a tapped notice) are handed to the same page.

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // recordings and the synthesizer sound even with the ring switch on silent, and go on when the screen locks
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        Push.shared.start()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Push.shared.didRegister(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Push.shared.didFailToRegister(error)
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let web = WebViewController.shared
        if let link = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb })?.webpageURL {
            web.open(link)
        }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = web
        window.makeKeyAndVisible()
        self.window = window
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if let link = userActivity.webpageURL { WebViewController.shared.open(link) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts { _ = GIDSignIn.sharedInstance.handle(context.url) }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        WebViewController.shared.becameActive()
    }
}
