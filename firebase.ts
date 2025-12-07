
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDMGU6S63Is1mDz2B0Lp83-1rV54ocIQmo",
  authDomain: "shreehomescrm-d7c2d.firebaseapp.com",
  databaseURL: "https://shreehomescrm-d7c2d-default-rtdb.firebaseio.com",
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
let realtimeDb: any;

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
    realtimeDb = getDatabase(app);

    // Enable Multi-Tab Offline Persistence.
    // This allows the app to work offline and sync when online, even if multiple tabs are open.
    // It also makes saving "instant" because it writes to the local cache immediately.
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
            console.warn("Persistence is not available in this browser.");
        }
    });
    
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase is not configured. Please check firebase.ts");
}

export { auth, db, realtimeDb };
