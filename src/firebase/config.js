// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
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
  apiKey: cleanEnv(process.env.REACT_APP_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.REACT_APP_FIREBASE_APP_ID),
  measurementId: cleanEnv(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID)
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };