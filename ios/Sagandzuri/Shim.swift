import Foundation

// Put into every page of the site before its own scripts (WebViewController). The app's web view has no Web Push and
// no Notification of its own, so this gives the site both, made of the app's parts:
// • window.sgIOS — the bridge to NativeBridge.swift (src/utils/iosApp.ts uses it, and knows by it that it is in the app);
// • Notification — permission and requestPermission() are the phone's, a new Notification(…) is a notice of the phone;
// • the service worker's pushManager — its subscription's endpoint is https://ios.sagandzureli.ge/fcm/<this phone's
//   Firebase token> (keys 'ios'), so the site binds the phone to the reminders Worker exactly as it binds a browser
//   (utils/groupPush.ts, utils/prayerReminders.ts), and the Worker sends to it through Firebase Cloud Messaging.

enum Shim {
    static func source(permission: String, version: String) -> String {
        js.replacingOccurrences(of: "%PERM%", with: permission).replacingOccurrences(of: "%VERSION%", with: version)
    }

    private static let js = #"""
    (function () {
      if (window.sgIOS) return;
      var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sg;
      if (!handler) return;
      var perm = '%PERM%';
      var call = function (fn, args) { return handler.postMessage({ fn: fn, args: args || {} }); };
      var ios = { call: call, version: '%VERSION%', setPermission: function (p) { perm = p; } };
      Object.defineProperty(window, 'sgIOS', { value: ios });
      call('notifyState').then(function (p) { perm = p; }, function () {});

      var urlOf = function (data) {
        if (!data) return '';
        if (typeof data.url === 'string') return data.url;
        if (typeof data.prayerId === 'string') return '/?prayer=' + encodeURIComponent(data.prayerId);
        return '';
      };
      function Note(title, opts) {
        opts = opts || {};
        this.title = String(title || '');
        this.body = String(opts.body || '');
        this.tag = String(opts.tag || '');
        this.data = opts.data;
        this.onclick = null;
        this.onclose = null;
        if (perm === 'granted') call('notify', { title: this.title, body: this.body, tag: this.tag, url: urlOf(opts.data) }).catch(function () {});
      }
      Note.prototype.close = function () {};
      Note.prototype.addEventListener = function () {};
      Note.prototype.removeEventListener = function () {};
      Object.defineProperty(Note, 'permission', { get: function () { return perm; } });
      Note.requestPermission = function (cb) {
        return call('notifyAsk').then(
          function (p) { perm = p; if (cb) cb(p); return p; },
          function () { if (cb) cb(perm); return perm; });
      };
      Note.maxActions = 2;
      try { Object.defineProperty(window, 'Notification', { value: Note, configurable: true, writable: true }); } catch (e) { window.Notification = Note; }

      var PREFIX = 'https://ios.sagandzureli.ge/fcm/';
      var subOf = function (token) {
        var endpoint = PREFIX + encodeURIComponent(token);
        return {
          endpoint: endpoint,
          expirationTime: null,
          options: { userVisibleOnly: true, applicationServerKey: null },
          getKey: function () { return null; },
          toJSON: function () { return { endpoint: endpoint, expirationTime: null, keys: { p256dh: 'ios', auth: 'ios' } }; },
          unsubscribe: function () { return Promise.resolve(true); }
        };
      };
      var pushManager = {
        getSubscription: function () {
          if (perm !== 'granted') return Promise.resolve(null);
          return call('pushToken', { wait: false }).then(function (t) { return t ? subOf(t) : null; }, function () { return null; });
        },
        subscribe: function () {
          var ready = perm === 'granted' ? Promise.resolve(perm) : Note.requestPermission();
          return ready.then(function (p) {
            if (p !== 'granted') throw new DOMException('notifications are off', 'NotAllowedError');
            return call('pushToken', { wait: true });
          }).then(function (t) {
            if (!t) throw new DOMException('no push token', 'AbortError');
            return subOf(t);
          });
        },
        permissionState: function () {
          return Promise.resolve(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'prompt');
        }
      };
      window.PushManager = function PushManager() {};
      window.PushManager.supportedContentEncodings = ['aes128gcm'];
      if (window.ServiceWorkerRegistration) {
        var proto = window.ServiceWorkerRegistration.prototype;
        try { Object.defineProperty(proto, 'pushManager', { configurable: true, get: function () { return pushManager; } }); } catch (e) {}
        proto.showNotification = function (title, opts) { new Note(title, opts); return Promise.resolve(); };
        proto.getNotifications = function () { return Promise.resolve([]); };
      }
    })();
    """#
}
