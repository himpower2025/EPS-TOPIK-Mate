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
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
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
  
  // 인증 상태 확인 중임을 나타내는 게이트 상태
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  
  const isMounted = useRef(true);

  const syncUserData = useCallback(async (firebaseUser: any) => {
    if (!firebaseUser) return null;
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userRef);
      let userData: User;
      
      if (snap.exists()) {
        userData = snap.data() as User;
      } else {
        userData = { 
          id: firebaseUser.uid, 
          name: firebaseUser.displayName || 'Learner', 
          email: firebaseUser.email || '', 
          avatarUrl: firebaseUser.photoURL || '', 
          plan: 'free', 
          subscriptionExpiry: null, 
          examsRemaining: 3 
        };
        await setDoc(userRef, userData);
      }
      return userData;
    } catch (error) {
      console.error("Firestore sync error:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let unsubSnapshot: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // 1. 세션 지속성 설정 (로컬 스토리지에 저장)
        await setPersistence(auth, browserLocalPersistence);

        // 2. 모바일 리다이렉트 결과 우선 확인
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isMounted.current) {
          const synced = await syncUserData(redirectResult.user);
          if (synced) {
            setUser(synced);
            setCurrentState(AppState.DASHBOARD);
            localStorage.removeItem('eps_auth_pending'); // 로그인 완료 시 힌트 삭제
          }
        }

        // 3. 인증 상태 리스너 설정
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const synced = await syncUserData(firebaseUser);
            if (synced && isMounted.current) {
              setUser(synced);
              localStorage.removeItem('eps_auth_pending'); // 힌트 삭제
              
              if (unsubSnapshot) unsubSnapshot();
              unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
                if (s.exists() && isMounted.current) setUser(s.data() as User);
              });

              setCurrentState(AppState.DASHBOARD);
            }
          } else if (isMounted.current) {
            // 로그인이 되어있지 않을 때, 만약 '로그인 시도 중' 힌트가 없다면 랜딩으로 이동
            const isAuthPending = localStorage.getItem('eps_auth_pending');
            if (!isAuthPending) {
              setUser(null);
              setCurrentState(AppState.LANDING);
            }
          }
          
          // 로그인 시도 중이 아닐 때만 초기화 로딩을 해제함
          if (!localStorage.getItem('eps_auth_pending')) {
            setIsInitializing(false);
            setIsAuthProcessing(false);
          }
        });

        return unsubscribeAuth;
      } catch (err) {
        console.error("Auth Critical System Error:", err);
        if (isMounted.current) setIsInitializing(false);
      }
    };

    // 안전장치: 10초 이상 로딩이 지속되면 강제로 게이트를 엽니다.
    const timeout = setTimeout(() => {
      if (isMounted.current && isInitializing) {
        console.warn("Auth initialization timed out. Releasing gate.");
        setIsInitializing(false);
        localStorage.removeItem('eps_auth_pending');
      }
    }, 10000);

    const cleanupPromise = initAuth();

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
      cleanupPromise.then(unsub => unsub && unsub());
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserData]);

  const handleGoogleLogin = async () => {
    setIsAuthProcessing(true);
    // 모바일 리다이렉트 시 페이지가 새로고침되므로 힌트를 저장합니다.
    localStorage.setItem('eps_auth_pending', 'true');
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        const synced = await syncUserData(result.user);
        if (synced) {
          setUser(synced);
          setCurrentState(AppState.DASHBOARD);
          setShowLoginModal(false);
          localStorage.removeItem('eps_auth_pending');
        }
        setIsAuthProcessing(false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      setIsAuthProcessing(false);
      localStorage.removeItem('eps_auth_pending');
    }
  };

  const handleEmailAuth = async (email: string, pass: string, isSignUp: boolean) => {
    setIsAuthProcessing(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
      localStorage.removeItem('eps_auth_pending');
    } catch (error: any) {
      setIsAuthProcessing(false);
      throw error;
    }
  };

  const handleModeSelect = (mode: ExamMode) => {
    setExamMode(mode);
    setCurrentState(AppState.SET_SELECTION);
  };

  const handleSetSelect = (setNum: number) => {
    if (user?.plan === 'free' && setNum > 1) {
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

  // 초기화 게이트: 인증 확인 전까지는 스플래시 화면만 노출
  if (isInitializing || isAuthProcessing) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-950 text-white font-black text-center px-10">
      <div className="relative w-24 h-24 mb-10">
        <div className="absolute inset-0 border-8 border-white/10 rounded-full"></div>
        <div className="absolute inset-0 border-8 border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-2xl tracking-[0.2em] uppercase mb-2">EPS-TOPIK Mate</h2>
      <p className="animate-pulse text-indigo-300 font-medium tracking-widest text-[10px] uppercase">
        {isInitializing ? "Securing Session..." : "Syncing Profile..."}
      </p>
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
      
      {user && (
        <>
          {currentState === AppState.DASHBOARD && (
            <Dashboard 
              user={user} 
              onModeSelect={handleModeSelect} 
              onUpgrade={() => setShowPaywall(true)} 
              onProfileClick={() => setShowProfile(true)} 
              onViewAnalysis={() => { if (lastSession) setCurrentState(AppState.ANALYTICS); }} 
            />
          )}

          {currentState === AppState.SET_SELECTION && (
            <SetSelector 
              mode={examMode} 
              plan={user.plan} 
              onSelect={handleSetSelect} 
              onBack={() => setCurrentState(AppState.DASHBOARD)} 
            />
          )}
          
          {currentState === AppState.EXAM && (
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

          {showPaywall && <PaywallModal user={user} onClose={() => setShowPaywall(false)} />}
          
          {showProfile && (
            <ProfileModal 
              user={user} 
              onClose={() => setShowProfile(false)} 
              onLogout={async () => { 
                setIsAuthProcessing(true);
                await signOut(auth); 
                setUser(null); 
                localStorage.removeItem('eps_auth_pending');
                setCurrentState(AppState.LANDING); 
                setIsAuthProcessing(false);
              }} 
              onRenew={() => { setShowProfile(false); setShowPaywall(true); }} 
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;