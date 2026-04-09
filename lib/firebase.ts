import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let _auth: Auth | null = null

/**
 * Returns the Firebase Auth instance, initializing it lazily on first call.
 * Must only be called in client-side code (event handlers, useEffect, etc.).
 */
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    _auth = getAuth(app)
  }
  return _auth
}
