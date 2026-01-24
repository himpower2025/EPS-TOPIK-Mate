
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // 리다이렉트 처리 중임을 나타내는 Ref (상태 업데이트로 인한 재렌더링 방지)
  const isHandlingRedirect = useRef(false);

  const syncUserWithFirestore = useCallback(async (firebaseUser: any) => {
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
      setCurrentState(AppState.DASHBOARD);
      setShowLoginModal(false);
    } catch (error) {
      console.error("Firestore Sync Error:", error);
    }
  }, []);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    let isMounted = true;

    const initAuth = async () => {
      // 1. 리다이렉트 결과 처리 시작 (PWA/모바일 최우선)
      isHandlingRedirect.current = true;
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          await syncUserWithFirestore(result.user);
        }
      } catch (err) {
        console.error("Redirect Error:", err);
      } finally {
        isHandlingRedirect.current = false;
        // 리다이렉트 결과 확인이 끝나면 최소한의 인증 관찰 준비 완료
      }

      // 2. 인증 상태 실시간 관찰
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;

        if (firebaseUser) {
          // 이미 리다이렉트로 처리되지 않았을 때만 싱크
          if (!user || user.id !== firebaseUser.uid) {
            await syncUserWithFirestore(firebaseUser);
          }

          if (unsubSnapshot) unsubSnapshot();
          unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
            if (s.exists() && isMounted) setUser(s.data() as User);
          });
          
          setIsLoading(false);
        } else {
          // 리다이렉트 처리 중일 때는 LandingPage로 보내지 않음
          if (!isHandlingRedirect.current) {
            if (unsubSnapshot) unsubSnapshot();
            setUser(null);
            setCurrentState(AppState.LANDING);
            setIsLoading(false);
          }
        }
      });

      return unsubscribeAuth;
    };

    const cleanup = initAuth();

    return () => {
      isMounted = false;
      cleanup.then(unsub => unsub && unsub());
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserWithFirestore, user]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    setIsLoading(true);
    try {
      if (isMobile || isStandalone) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          await syncUserWithFirestore(result.user);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Login Error:", error);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (email: string, pass: string, isSignUp: boolean) => {
    setIsLoading(true);
    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        result = await signInWithEmailAndPassword(auth, email, pass);
      }
      if (result.user) {
        await syncUserWithFirestore(result.user);
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
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
    <div className="h-screen flex flex-col items-center justify-center bg-indigo-950 text-white font-black text-center px-6">
      <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-8"></div>
      <div className="space-y-2">
        <p className="animate-pulse tracking-[0.3em] uppercase text-[10px] text-indigo-300">EPS-TOPIK Mate</p>
        <p className="text-sm font-bold">Synchronizing Session...</p>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative font-sans">
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
          onExit={() => setCurrentState(AppState.DASHBOARD)} 
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
          onLogout={async () => { 
            setIsLoading(true);
            await signOut(auth); 
            setUser(null); 
            setCurrentState(AppState.LANDING); 
            setIsLoading(false);
          }} 
          onRenew={() => { setShowProfile(false); setShowPaywall(true); }} 
        />
      )}
    </div>
  );
};

export default App;
