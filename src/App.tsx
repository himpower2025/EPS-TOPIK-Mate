import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SetSelector } from './components/SetSelector';
import { ExamSimulator } from './components/ExamSimulator';
import { Analytics } from './components/Analytics';
import { PaywallModal } from './components/PaywallModal';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { FaviconManager } from './components/FaviconManager';
import { InstallPwa } from './components/InstallPwa';
import { ExamSession, User, ExamMode } from './types';

import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

enum AppState { LANDING, DASHBOARD, SET_SELECTION, EXAM, ANALYTICS }

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.LANDING);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lastSession, setLastSession] = useState<ExamSession | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>('FULL');
  const [selectedSet, setSelectedSet] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // 인증 상태 실시간 감지 및 대시보드 강제 이동 로직
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    // 리다이렉트 로그인 결과 처리 (모바일/PWA에서 돌아온 경우)
    // 이 처리를 onAuthStateChanged 외부에서 먼저 시도하여 결과를 기다립니다.
    const checkRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        console.error("Redirect Login Result Error:", err);
      }
    };
    checkRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setShowLoginModal(false);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const snap = await getDoc(userRef);
          let userData: User;
          
          if (snap.exists()) {
            userData = snap.data() as User;
          } else {
            userData = { 
              id: firebaseUser.uid, 
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Learner', 
              email: firebaseUser.email || '', 
              avatarUrl: firebaseUser.photoURL || '', 
              plan: 'free', 
              subscriptionExpiry: null, 
              examsRemaining: 3 
            };
            await setDoc(userRef, userData);
          }
          
          setUser(userData);
          // 유저가 확인되면 항상 대시보드로 이동
          setCurrentState(AppState.DASHBOARD);

          // 실시간 업데이트 구독
          unsubSnapshot = onSnapshot(userRef, (s) => {
            if (s.exists()) setUser(s.data() as User);
          });
        } catch (error) {
          console.error("Firestore Loading Error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        if (unsubSnapshot) unsubSnapshot();
        setUser(null);
        setCurrentState(AppState.LANDING);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    // 'select_account'를 제거하여 이미 로그인된 경우 자연스럽게 넘어가도록 함 (사용자가 요청한 '자연스러운' 방식)
    // 단, 여러 계정 중 선택이 필요한 경우를 위해 기본 설정 유지
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // 환경 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    try {
      if (isMobile || isStandalone) {
        // PWA나 모바일 브라우저에서는 리다이렉트 방식 권장
        await signInWithRedirect(auth, provider);
      } else {
        // 데스크탑에서는 팝업 방식 사용
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          setShowLoginModal(false);
          setCurrentState(AppState.DASHBOARD);
        }
      }
    } catch (error) {
      console.error("Google Login Initiation Error:", error);
    }
  };

  const handleEmailAuth = async (email: string, pass: string, isSignUp: boolean) => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
      setShowLoginModal(false);
      setCurrentState(AppState.DASHBOARD);
    } catch (error: any) {
      let msg = "Login failed.";
      if (error.code === 'auth/user-not-found') msg = "User ID not found.";
      if (error.code === 'auth/wrong-password') msg = "Check your password.";
      if (error.code === 'auth/email-already-in-use') msg = "ID already exists.";
      throw new Error(msg);
    }
  };

  const handleModeSelect = (mode: ExamMode) => {
    setExamMode(mode);
    setCurrentState(AppState.SET_SELECTION);
  };

  const handleSetSelect = (setNum: number) => {
    if (user?.plan === 'free' && setNum > 2) {
      setShowPaywall(true);
      return;
    }
    setSelectedSet(setNum);
    setCurrentState(AppState.EXAM);
  };

  const handleExamComplete = (session: ExamSession) => {
    if (!user) return;
    setDoc(doc(db, 'exams', session.id), { ...session, userId: user.id });
    if (user.plan === 'free') {
      setDoc(doc(db, 'users', user.id), { examsRemaining: Math.max(0, user.examsRemaining - 1) }, { merge: true });
    }
    setLastSession(session); 
    setCurrentState(AppState.ANALYTICS); 
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-indigo-900 text-white font-black text-center px-6">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
      <p className="animate-pulse tracking-widest uppercase text-sm">Verifying Session...</p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative">
      <FaviconManager />
      <InstallPwa />
      
      {currentState === AppState.LANDING && !user && <LandingPage onLoginClick={() => setShowLoginModal(true)} />}
      
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleGoogleLogin} 
          onEmailAuth={handleEmailAuth}
        />
      )}
      
      {currentState === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user} 
          onModeSelect={handleModeSelect} 
          onUpgrade={() => setShowPaywall(true)} 
          onProfileClick={() => setShowProfile(true)} 
          onViewAnalysis={() => { if (lastSession) setCurrentState(AppState.ANALYTICS); }} 
        />
      )}

      {currentState === AppState.SET_SELECTION && user && (
        <SetSelector 
          mode={examMode} 
          plan={user.plan} 
          onSelect={handleSetSelect} 
          onBack={() => setCurrentState(AppState.DASHBOARD)} 
        />
      )}
      
      {currentState === AppState.EXAM && user && (
        <ExamSimulator 
          mode={examMode}
          setNumber={selectedSet}
          onComplete={handleExamComplete} 
          onExit={() => setCurrentState(AppState.SET_SELECTION)} 
          plan={user.plan}
        />
      )}
      
      {currentState === AppState.ANALYTICS && lastSession && (
        <Analytics session={lastSession} onBack={() => setCurrentState(AppState.DASHBOARD)} />
      )}

      {showPaywall && user && <PaywallModal user={user} onClose={() => setShowPaywall(false)} />}
      
      {showProfile && user && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onLogout={() => { signOut(auth); setUser(null); setCurrentState(AppState.LANDING); }} 
          onRenew={() => { setShowProfile(false); setShowPaywall(true); }} 
        />
      )}
    </div>
  );
};

export default App;