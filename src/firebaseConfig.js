// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOgqy3YT6SclA7RUtYW9q0MV7Cxlm-EHE",
  authDomain: "smart-cabin-safety-system.firebaseapp.com",
  databaseURL: "https://smart-cabin-safety-system-default-rtdb.firebaseio.com",
  projectId: "smart-cabin-safety-system",
  storageBucket: "smart-cabin-safety-system.firebasestorage.app",
  messagingSenderId: "1097543406123",
  appId: "1:1097543406123:web:a0f3e0b1f568ce87af106e",
  measurementId: "G-6DFMCY1T6X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const analytics = getAnalytics(app);

export default database;
