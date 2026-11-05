import AuthenticationServices
import CryptoKit
import GoogleSignIn
import UIKit

// Google blocks its sign-in page inside an app's web view, so the app signs in natively and hands the tokens to the
// site, which signs in to Firebase with them (AuthContext.tsx). Apple's own sign-in sits beside it, as the App Store
// asks of every app with a Google sign-in.

@MainActor
enum SignIn {
    /** CLIENT_ID of GoogleService-Info.plist (Firebase console → the iOS app). */
    static var googleClientID: String? {
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path) else { return nil }
        return dict["CLIENT_ID"] as? String
    }

    static func google() async throws -> [String: Any] {
        guard let clientID = googleClientID else { throw AppError.notReady }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: WebViewController.shared.top)
            guard let idToken = result.user.idToken?.tokenString else { throw AppError.failed("no-token") }
            return ["idToken": idToken, "accessToken": result.user.accessToken.tokenString]
        } catch let e as GIDSignInError where e.code == .canceled {
            throw AppError.cancelled
        }
    }

    static func apple() async throws -> [String: Any] {
        let raw = randomNonce()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = SHA256.hash(data: Data(raw.utf8)).map { String(format: "%02x", $0) }.joined()
        let credential = try await AppleSignIn().run(request)
        guard let data = credential.identityToken, let idToken = String(data: data, encoding: .utf8) else {
            throw AppError.failed("no-token")
        }
        return [
            "idToken": idToken,
            "rawNonce": raw,
            "givenName": credential.fullName?.givenName ?? "",
            "familyName": credential.fullName?.familyName ?? "",
        ]
    }

    private static func randomNonce(length: Int = 32) -> String {
        let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        if SecRandomCopyBytes(kSecRandomDefault, length, &bytes) != errSecSuccess {
            return UUID().uuidString + UUID().uuidString
        }
        return String(bytes.map { chars[Int($0) % chars.count] })
    }
}

/** One Apple sign-in: keeps itself alive until Apple's window answers. */
final class AppleSignIn: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?
    private var keepAlive: AppleSignIn?

    func run(_ request: ASAuthorizationAppleIDRequest) async throws -> ASAuthorizationAppleIDCredential {
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>) in
            continuation = c
            keepAlive = self
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        WebViewController.shared.view.window ?? UIWindow()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
            continuation?.resume(returning: credential)
        } else {
            continuation?.resume(throwing: AppError.failed("no-credential"))
        }
        continuation = nil
        keepAlive = nil
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let code = (error as? ASAuthorizationError)?.code
        continuation?.resume(throwing: code == .canceled ? AppError.cancelled : error)
        continuation = nil
        keepAlive = nil
    }
}
