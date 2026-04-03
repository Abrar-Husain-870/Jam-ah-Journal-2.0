// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const cleanEnv = (value) => {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['"]+|['"]+$/g, '').replace(/,+$/g, '');
};

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: cleanEnv(process.env.REACT_APP_FIREBASE_API_KEY) || "AIzaSyAwUFZh2fMFY5sg1h06b1Gz9bLK2NsEy90",
  authDomain: cleanEnv(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN) || "jamaah-journal-2.firebaseapp.com",
  projectId: cleanEnv(process.env.REACT_APP_FIREBASE_PROJECT_ID) || "jamaah-journal-2",
  storageBucket: cleanEnv(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET) || "jamaah-journal-2.firebasestorage.app",
  messagingSenderId: cleanEnv(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID) || "362976185134",
  appId: cleanEnv(process.env.REACT_APP_FIREBASE_APP_ID) || "1:362976185134:web:d5a636b787ac1c7c4288bf",
  measurementId: cleanEnv(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID) || "G-QE6K6XPM58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };