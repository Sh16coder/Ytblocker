// Firebase configuration - Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAaP6DLDtkHxreMnPqY5bobPe2-eaSCCu4",
  authDomain: "ytblocker-15451.firebaseapp.com",
  projectId: "ytblocker-15451",
  storageBucket: "ytblocker-15451.firebasestorage.app",
  messagingSenderId: "1079493498537",
  appId: "1:1079493498537:web:e951cfdb7d8e92dd787bb8"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
