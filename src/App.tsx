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
  
  // 인증 로딩 상태 제어
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Securing connection...");
  
  const isMounted = useRef(true);

  // Firestore 사용자 데이터 동기화
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
    let unsubAuth: (() => void) | null = null;

    const startBootSequence = async () => {
      try {
        setLoadingMessage("Checking session...");
        
        // 1. 브라우저 세션 영속성 설정
        await setPersistence(auth, browserLocalPersistence);

        // 2. 모바일 리다이렉트 힌트 확인 (매우 중요)
        const isRedirectPending = sessionStorage.getItem('auth_redirect_pending') === 'true';

        // 3. 리다이렉트 결과 처리
        if (isRedirectPending) {
          setLoadingMessage("Finalizing login...");
        }
        
        const redirectResult = await getRedirectResult(auth);
        
        if (redirectResult?.user && isMounted.current) {
          const synced = await syncUserData(redirectResult.user);
          if (synced) {
            setUser(synced);
            setCurrentState(AppState.DASHBOARD);
            sessionStorage.removeItem('auth_redirect_pending');
            setIsInitializing(false);
            return;
          }
        }

        // 4. 리다이렉트 결과가 없더라도 힌트가 있으면 잠시 대기 (Firebase 내부 처리 시간 확보)
        if (isRedirectPending) {
           await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 5. 실시간 인증 상태 감시
        unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            setLoadingMessage("Syncing profile...");
            const synced = await syncUserData(firebaseUser);
            if (synced && isMounted.current) {
              setUser(synced);
              sessionStorage.removeItem('auth_redirect_pending');
              
              if (unsubSnapshot) unsubSnapshot();
              unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
                if (s.exists() && isMounted.current) setUser(s.data() as User);
              });
              
              setCurrentState(AppState.DASHBOARD);
            }
          } else if (isMounted.current) {
            // [결정적 포인트] 리다이렉트 처리 중이 아닐 때만 랜딩으로 보냄
            const stillPending = sessionStorage.getItem('auth_redirect_pending') === 'true';
            if (!stillPending) {
              setUser(null);
              setCurrentState(AppState.LANDING);
            }
          }
          
          if (isMounted.current) {
            setIsInitializing(false);
          }
        });

      } catch (err) {
        console.error("Auth Boot Sequence Failed:", err);
        sessionStorage.removeItem('auth_redirect_pending');
        if (isMounted.current) setIsInitializing(false);
      }
    };

    startBootSequence();

    return () => {
      isMounted.current = false;
      if (unsubAuth) unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserData]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        // [중요] 리다이렉트 직전에 힌트 저장
        sessionStorage.setItem('auth_redirect_pending', 'true');
        setIsInitializing(true);
        setLoadingMessage("Redirecting to Google...");
        await signInWithRedirect(auth, provider);
      } else {
        setIsInitializing(true);
        setLoadingMessage("Opening login window...");
        const result = await signInWithPopup(auth, provider);
        const synced = await syncUserData(result.user);
        if (synced) {
          setUser(synced);
          setCurrentState(AppState.DASHBOARD);
          setShowLoginModal(false);
        }
        setIsInitializing(false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      sessionStorage.removeItem('auth_redirect_pending');
      setIsInitializing(false);
    }
  };

  const handleEmailAuth = async (email: string, pass: string, isSignUp: boolean) => {
    setIsInitializing(true);
    setLoadingMessage(isSignUp ? "Creating account..." : "Logging in...");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch (error: any) {
      setIsInitializing(false);
      throw error;
    }
  };

  const handleModeSelect = (mode: ExamMode, explicitSet?: number) => {
    setExamMode(mode);
    if (explicitSet) {
      setSelectedSet(explicitSet);
      setCurrentState(AppState.EXAM);
    } else {
      setCurrentState(AppState.SET_SELECTION);
    }
  };

  const handleSetSelect = (setNum: number) => {
    if (user?.plan === 'free' && setNum !== 10) {
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

  // 강력한 초기 로딩 화면 (Gate)
  if (isInitializing) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-950 text-white font-sans overflow-hidden">
      <div className="relative w-24 h-24 mb-12">
        <div className="absolute inset-0 border-[6px] border-white/10 rounded-[2.5rem]"></div>
        <div className="absolute inset-0 border-[6px] border-indigo-400 rounded-[2.5rem] border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
      </div>
      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">EPS-TOPIK Mate</h2>
        <div className="flex flex-col items-center gap-2">
           <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">
             {loadingMessage}
           </p>
           <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]"></div>
           </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }
      `}</style>
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
                setIsInitializing(true);
                setLoadingMessage("Signing out...");
                sessionStorage.removeItem('auth_redirect_pending');
                await signOut(auth); 
                setUser(null); 
                setCurrentState(AppState.LANDING); 
                setIsInitializing(false);
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