// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIeb9p9f3GWsIUuoBskLWWGq5iMYbBh6A",
  authDomain: "eps-topik-mate.firebaseapp.com",
  projectId: "eps-topik-mate",
  storageBucket: "eps-topik-mate.firebasestorage.app",
  messagingSenderId: "335176218116",
  appId: "1:335176218116:web:c9322f2178045f10eaa751"
};

// 파이어베이스 초기화
const app = initializeApp(firebaseConfig);

// 우리가 쓸 도구들 꺼내기
export const db = getFirestore(app); // 데이터베이스
export const auth = getAuth(app);      // 로그인 기능