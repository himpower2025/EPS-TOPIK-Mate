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
  
  // 앱 초기화 및 인증 처리 통합 게이트
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
    let unsubscribeAuth: (() => void) | null = null;

    const bootApp = async () => {
      try {
        // 1. 브라우저 로컬 스토리지 유지 강제
        await setPersistence(auth, browserLocalPersistence);

        // 2. 모바일 리다이렉트 결과 대기 (가장 중요한 부분)
        // 지메일 인증 등을 마치고 돌아온 결과를 여기서 먼저 잡아냅니다.
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user && isMounted.current) {
          const synced = await syncUserData(redirectResult.user);
          if (synced) {
            setUser(synced);
            setCurrentState(AppState.DASHBOARD);
          }
        }

        // 3. 실시간 인증 상태 리스너 가동
        unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const synced = await syncUserData(firebaseUser);
            if (synced && isMounted.current) {
              setUser(synced);
              
              if (unsubSnapshot) unsubSnapshot();
              unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
                if (s.exists() && isMounted.current) setUser(s.data() as User);
              });

              setCurrentState(AppState.DASHBOARD);
            }
          } else if (isMounted.current) {
            setUser(null);
            setCurrentState(AppState.LANDING);
          }
          
          // 확정적인 상태가 되었을 때만 로딩 화면을 제거합니다.
          setIsInitializing(false);
          setIsAuthProcessing(false);
        });

      } catch (err) {
        console.error("Critical Auth Boot Error:", err);
        if (isMounted.current) setIsInitializing(false);
      }
    };

    bootApp();

    return () => {
      isMounted.current = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserData]);

  const handleGoogleLogin = async () => {
    setIsAuthProcessing(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        // 모바일은 리다이렉트 방식 (지메일 앱 등으로 이동했다 돌아옴)
        await signInWithRedirect(auth, provider);
      } else {
        // 데스크톱은 팝업 방식
        const result = await signInWithPopup(auth, provider);
        const synced = await syncUserData(result.user);
        if (synced) {
          setUser(synced);
          setCurrentState(AppState.DASHBOARD);
          setShowLoginModal(false);
        }
        setIsAuthProcessing(false);
      }
    } catch (error) {
      console.error("Google Login Exception:", error);
      setIsAuthProcessing(false);
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

  // 초기 로딩 화면: Firebase 응답이 오기 전까지는 절대 앱 진입을 허용하지 않음
  if (isInitializing || isAuthProcessing) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-950 text-white font-black text-center px-10">
      <div className="relative w-24 h-24 mb-10">
        <div className="absolute inset-0 border-8 border-white/10 rounded-full"></div>
        <div className="absolute inset-0 border-8 border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-2xl tracking-[0.2em] uppercase mb-2 font-black">EPS-TOPIK Mate</h2>
      <p className="animate-pulse text-indigo-300 font-medium tracking-widest text-[10px] uppercase">
        {isInitializing ? "로그인 정보 확인 중..." : "프로필 동기화 중..."}
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