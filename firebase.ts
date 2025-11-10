import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Firebase Configuration ---
// IMPORTANT: Replace the placeholder values with your own Firebase project's configuration.
// You can find this configuration in your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyAbNQ_Buy8OtCzQcg_yTG7TCKCdzpwCAUI",
  authDomain: "shreehomescrm.firebaseapp.com",
  projectId: "shreehomescrm",
  storageBucket: "shreehomescrm.firebasestorage.app",
  messagingSenderId: "490822742991",
  appId: "1:490822742991:web:132ba375b12f57a0d658ba",
  measurementId: "G-8C2K2CVT07"
};

// --- Service Initialization ---
let app;
let auth;
let db;

// A more robust flag to check if the Firebase config has been set by the user.
// It checks for common placeholder patterns in essential fields.
export const isConfigured = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("YOUR_") &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes("YOUR_");

if (isConfigured) {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  // Export the necessary Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // If not configured, show a message in the console.
  // The UI will also show a message via the `isConfigured` flag.
  console.warn("Firebase is not configured. Please add your project credentials to firebase.ts");
}

// Export the services. They will be undefined if not configured.
export { auth, db };
