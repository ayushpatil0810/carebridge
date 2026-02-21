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

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBl7Txs2DX5r4jClX8xyJjoJv4fE9dBEcI",
  authDomain: "arogyasetugram-5fec2.firebaseapp.com",
  projectId: "arogyasetugram-5fec2",
  storageBucket: "arogyasetugram-5fec2.firebasestorage.app",
  messagingSenderId: "158710067524",
  appId: "1:158710067524:web:051012fbccd2ff369ba711",
  measurementId: "G-4X82RW31BS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
