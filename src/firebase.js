// ============================================================
// Firebase Configuration — CareBridge
// ============================================================
// 🔧 SETUP INSTRUCTIONS:
//
// 1. Go to https://console.firebase.google.com
// 2. Click "Create a project" (or select existing)
// 3. Enable Authentication:
//    - Go to Authentication → Sign-in method
//    - Enable "Email/Password" provider
// 4. Enable Firestore:
//    - Go to Firestore Database → Create database
//    - Select "Start in test mode" (for hackathon)
//    - Choose nearest region (e.g., asia-south1 for India)
// 5. Get your config:
//    - Go to Project Settings → General → Your apps
//    - Click "</>" (Web) to register a web app
//    - Copy the firebaseConfig object below
// 6. Replace the placeholder values below with your config
//
// FIRESTORE SECURITY RULES (paste in Firestore → Rules):
// ```
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }
// ```
//
// CREATING USERS (after sign-up, add role in Firestore):
//   Collection: users
//   Document ID: <user's Firebase UID>
//   Fields: { email: "...", name: "...", role: "asha" | "phc" }
// ============================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
