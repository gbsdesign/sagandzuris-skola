package ge.sagandzureli.app;

import android.app.Activity;
import android.os.CancellationSignal;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executors;

/**
 * Google's sign-in by the phone's own account picker (Credential Manager): Google refuses its sign-in page inside an app's
 * web view. The ID token is for the Firebase project's web client (R.string.google_web_client_id); the site signs in to
 * Firebase with it (AuthContext). It works once the Firebase project knows this app (its package and the Play signing key's
 * SHA-1) — until then it answers 'not-ready'.
 */
final class SignIn {
    interface Done {
        void ok(String idToken);
        void fail(String word);
    }

    static void google(Activity activity, Done done) {
        String client = activity.getString(R.string.google_web_client_id);
        if (client.isEmpty()) { done.fail("not-ready"); return; }
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(client).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        CredentialManager.create(activity).getCredentialAsync(activity, request, new CancellationSignal(),
            Executors.newSingleThreadExecutor(),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    Credential c = response.getCredential();
                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                        try {
                            done.ok(GoogleIdTokenCredential.createFrom(c.getData()).getIdToken());
                            return;
                        } catch (Exception e) {
                            /* fall through */
                        }
                    }
                    done.fail("failed");
                }

                @Override
                public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) done.fail("cancelled");
                    else done.fail("not-ready");
                }
            });
    }

    private SignIn() {}
}
