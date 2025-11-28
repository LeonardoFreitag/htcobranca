
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArB4ZvhdVflhtqkqOb1wLiz8DL1-KGEzk",
  authDomain: "htcobranca-43a32.firebaseapp.com",
  projectId: "htcobranca-43a32",
  storageBucket: "htcobranca-43a32.firebasestorage.app",
  messagingSenderId: "279350659126",
  appId: "1:279350659126:web:1a8a34ac167db3d843b097"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
