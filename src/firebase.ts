import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  // Firebase apiKey 는 공개 값입니다 (Google 공식 문서에 명시).
  // 보안은 Firebase Security Rules 로 합니다.
  // Vite 환경변수로 관리하되, 기본값으로 하드코딩해도 안전합니다.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCjHxEHD9wvHdLdqHgJUE-3F4xTQ_example",
  authDomain: "eps-topik-mate.firebaseapp.com",
  projectId: "eps-topik-mate",
  storageBucket: "eps-topik-mate.appspot.com",
  messagingSenderId: "335176218116",
  appId: "1:335176218116:web:c9322f2178045f10eaa751"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);