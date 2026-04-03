// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwUFZh2fMFY5sg1h06b1Gz9bLK2NsEy90",
  authDomain: "jamaah-journal-2.firebaseapp.com",
  projectId: "jamaah-journal-2",
  storageBucket: "jamaah-journal-2.firebasestorage.app",
  messagingSenderId: "362976185134",
  appId: "1:362976185134:web:d5a636b787ac1c7c4288bf",
  measurementId: "G-QE6K6XPM58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);