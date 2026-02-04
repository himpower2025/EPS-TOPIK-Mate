import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "eps-topik-mate.firebaseapp.com",
  projectId: "eps-topik-mate",
  storageBucket: "eps-topik-mate.appspot.com",
  messagingSenderId: "335176218116",
  appId: "1:335176218116:web:c9322f2178045f10eaa751"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);