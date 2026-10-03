/* Firebase init — the apiKey is a public identifier, not a secret.
   Data protection is enforced by database.rules.json + Authentication. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBREOeP5McdKfi7EE9t77ZtN6RgXSntprU",
  authDomain: "student-3346e.firebaseapp.com",
  databaseURL: "https://student-3346e-default-rtdb.firebaseio.com",
  projectId: "student-3346e",
  storageBucket: "student-3346e.firebasestorage.app",
  messagingSenderId: "798475113867",
  appId: "1:798475113867:web:09cd92bf86fa3e7a2f0b8e"
};

// ضع هنا مفتاح reCAPTCHA v3 العام (Site Key) لتفعيل App Check. اتركه فارغًا لتعطيله.
export const RECAPTCHA_SITE_KEY = "";

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

if (RECAPTCHA_SITE_KEY) {
  const { initializeAppCheck, ReCaptchaV3Provider } =
    await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
