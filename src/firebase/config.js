// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAwUFZh2fMFY5sg1h06b1Gz9bLK2NsEy90",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jamaah-journal-2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jamaah-journal-2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jamaah-journal-2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "362976185134",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:362976185134:web:d5a636b787ac1c7c4288bf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QE6K6XPM58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };