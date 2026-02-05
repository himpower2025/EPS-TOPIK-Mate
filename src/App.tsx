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
  
  // 앱 초기화 상태 - 가장 중요함
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  
  const isMounted = useRef(true);

  // 유저 데이터 싱크
  const syncUserData = useCallback(async (firebaseUser: any) => {
    if (!firebaseUser) return null;
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as User;
      } else {
        const userData: User = { 
          id: firebaseUser.uid, 
          name: firebaseUser.displayName || 'Learner', 
          email: firebaseUser.email || '', 
          avatarUrl: firebaseUser.photoURL || '', 
          plan: 'free', 
          subscriptionExpiry: null, 
          examsRemaining: 3 
        };
        await setDoc(userRef, userData);
        return userData;
      }
    } catch (error) {
      console.error("Firestore sync error:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let unsubSnapshot: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const runAuthSequence = async () => {
      try {
        // 1. 브라우저 세션 영속성 강제 설정
        await setPersistence(auth, browserLocalPersistence);

        // 2. 리다이렉트 처리 (모바일은 여기서 잡힘)
        const redirectResult = await getRedirectResult(auth);
        
        // 3. 리다이렉트 힌트 검사
        const authFlag = localStorage.getItem('auth_redirect_active') === 'true';

        if (redirectResult?.user && isMounted.current) {
          const synced = await syncUserData(redirectResult.user);
          if (synced) {
            setUser(synced);
            localStorage.removeItem('auth_redirect_active');
            setCurrentState(AppState.DASHBOARD);
            setIsInitializing(false);
            return; // 리다이렉트 성공 시 즉시 종료
          }
        }

        // 4. 일반적인 상태 리스너 (새로고침 등)
        unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const synced = await syncUserData(firebaseUser);
            if (synced && isMounted.current) {
              setUser(synced);
              localStorage.removeItem('auth_redirect_active');
              
              if (unsubSnapshot) unsubSnapshot();
              unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
                if (s.exists() && isMounted.current) setUser(s.data() as User);
              });
              
              setCurrentState(AppState.DASHBOARD);
            }
          } else if (isMounted.current) {
            // [결정적 포인트] 리다이렉트 중이 아닐 때만 유저를 날리고 랜딩으로 보냄
            if (!authFlag) {
              setUser(null);
              setCurrentState(AppState.LANDING);
            }
          }
          
          // 모든 비동기 인증 절차가 확정된 후 게이트 해제
          if (isMounted.current) {
            setIsInitializing(false);
            setIsAuthProcessing(false);
          }
        });

      } catch (err) {
        console.error("Critical Auth Error:", err);
        localStorage.removeItem('auth_redirect_active');
        if (isMounted.current) setIsInitializing(false);
      }
    };

    runAuthSequence();

    return () => {
      isMounted.current = false;
      if (unsubAuth) unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserData]);

  const handleGoogleLogin = async () => {
    setIsAuthProcessing(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // 모바일 판단
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        localStorage.setItem('auth_redirect_active', 'true');
        await signInWithRedirect(auth, provider);
      } else {
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
      console.error("Login Trigger Failed:", error);
      localStorage.removeItem('auth_redirect_active');
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

  // 인증 게이트 로딩 (심플하고 전문적인 디자인)
  if (isInitializing || isAuthProcessing) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-950 text-white text-center px-10">
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-2">EPS-TOPIK Mate</h2>
      <p className="animate-pulse text-indigo-300 font-bold text-[9px] uppercase tracking-widest">
        Verifying Secure Session...
      </p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative font-sans">
      <FaviconManager />
      <InstallPwa />
      
      {currentState === AppState.LANDING && !user && (
        <LandingPage onLoginClick={() => setShowLoginModal(true)} />
      )}
      
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
                localStorage.removeItem('auth_redirect_active');
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