// Firebase Configuration for Craft Soft Admin
// Using Firebase CDN (no npm required for static sites)

const firebaseConfig = {
    apiKey: "AIzaSyAvLHRgIgFq6SWkWl4Zj7IhJxZiCX5vqPc",
    authDomain: "craftsoft-admin.firebaseapp.com",
    projectId: "craftsoft-admin",
    storageBucket: "craftsoft-admin.firebasestorage.app",
    messagingSenderId: "967033749556",
    appId: "1:967033749556:web:aad0b21e16439f3af14a61"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other scripts
window.auth = auth;
window.db = db;

console.log('🔥 Firebase initialized successfully');
