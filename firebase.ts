import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDMGU6S63Is1mDz2B0Lp83-1rV54ocIQmo",
  authDomain: "shreehomescrm-d7c2d.firebaseapp.com",
  projectId: "shreehomescrm-d7c2d",
  storageBucket: "shreehomescrm-d7c2d.firebasestorage.app",
  messagingSenderId: "134845887694",
  appId: "1:134845887694:web:8c048ae39203a420478c9f",
  measurementId: "G-6ZM4EV5PN4"
};

// --- Service Initialization ---
let app;
let auth: any;
let db: any;

export const isConfigured = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("YOUR_") &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes("YOUR_");

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase is not configured. Please check firebase.ts");
}

export { auth, db };
