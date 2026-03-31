// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Replace with your actual Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBmQfHA5PyHCp9rX5WSig-_SisWOvq1TMM",
  authDomain: "happy-fitness-17e45.firebaseapp.com",
  projectId: "happy-fitness-17e45",
  storageBucket: "happy-fitness-17e45.firebasestorage.app",
  messagingSenderId: "1020305213778",
  appId: "1:1020305213778:web:43633168c886ff54cad28b",
  measurementId: "G-J5XL576HCV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
