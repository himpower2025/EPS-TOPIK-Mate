
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Vercel 환경 변수 process.env.API_KEY를 변수에 할당합니다.
const API_KEY = process.env.API_KEY;

const firebaseConfig = {
  apiKey: API_KEY, // [수정] 수동 입력값 대신 변수를 사용합니다.
  authDomain: "eps-topik-mate.firebaseapp.com",
  projectId: "eps-topik-mate",
  storageBucket: "eps-topik-mate.firebasestorage.app",
  messagingSenderId: "335176218116",
  appId: "1:335176218116:web:c9322f2178045f10eaa751"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
