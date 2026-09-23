import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAQ2KVrJ6zJ3USTN5UMEWTCdKLjw9tezjk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hackathon-24d36.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hackathon-24d36",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hackathon-24d36.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115172017931",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115172017931:web:5fc2a37099c2a40970c40e",
};

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

let app = null;
try {
  if (hasFirebaseConfig()) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
  }
} catch (err) {
  console.warn("Firebase client init notice:", err);
}

export const auth = app ? getAuth(app) : null;

// Initialize Firestore with long-polling to prevent WebChannel assertion crashes during hot reloads
export const db = app
  ? (() => {
      try {
        return initializeFirestore(app, {
          experimentalForceLongPolling: true,
        });
      } catch {
        try {
          return getFirestore(app);
        } catch (e) {
          console.warn("Firestore init notice:", e);
          return null;
        }
      }
    })()
  : null;

export default app;