// services/firebaseConfig.ts
// Configuration Firebase partagée entre tous les services

// services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyDyvYQ2KHobjydlxgpqhWUixqo55uwQJ6Q",
  authDomain: "fitness-ce6f2.firebaseapp.com",
  projectId: "fitness-ce6f2",
  storageBucket: "fitness-ce6f2.firebasestorage.app",
  messagingSenderId: "767958217785",
  appId: "1:767958217785:web:bf865e138fe1f3391cc9e8",
  measurementId: "G-CDP2WYT6XB"
};

export const app = initializeApp(firebaseConfig);
console.log('🔥 Firebase configuré !');