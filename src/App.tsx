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
  const [isLoading, setIsLoading] = useState(true);
  
  const isSyncing = useRef(false);

  // Firestore와 사용자 정보 동기화 및 상태 전환
  const syncUserWithFirestore = useCallback(async (firebaseUser: any) => {
    if (!firebaseUser || isSyncing.current) return;
    isSyncing.current = true;
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userRef);
      let userData: User;
      
      const isAdminEmail = firebaseUser.email === 'abraham0715@gmail.com';
      
      if (snap.exists()) {
        userData = snap.data() as User;
        if (isAdminEmail && userData.plan === 'free') {
           userData.plan = '3m';
           const expiryDate = new Date();
           expiryDate.setDate(expiryDate.getDate() + 90);
           userData.subscriptionExpiry = expiryDate.toISOString();
           await setDoc(userRef, { plan: '3m', subscriptionExpiry: userData.subscriptionExpiry }, { merge: true });
        }
      } else {
        userData = { 
          id: firebaseUser.uid, 
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Learner', 
          email: firebaseUser.email || '', 
          avatarUrl: firebaseUser.photoURL || '', 
          plan: isAdminEmail ? '3m' : 'free', 
          subscriptionExpiry: isAdminEmail ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null, 
          examsRemaining: 3 
        };
        await setDoc(userRef, userData);
      }
      
      setUser(userData);
      // [중요] 동기화 성공 시 즉시 대시보드로 상태 전환
      setCurrentState(AppState.DASHBOARD);
      setShowLoginModal(false);
    } catch (error) {
      console.error("User Sync Error:", error);
    } finally {
      isSyncing.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const initAuth = async () => {
      await setPersistence(auth, browserLocalPersistence);

      // 리다이렉트 결과 처리 (로그인 루프 해결 핵심)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await syncUserWithFirestore(result.user);
        }
      } catch (err) {
        console.error("Redirect Error:", err);
      }

      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // 사용자가 있는데 상태가 LANDING이라면 강제로 DASHBOARD 전환 시도
          if (currentState === AppState.LANDING) {
            setCurrentState(AppState.DASHBOARD);
          }
          
          if (!user) {
            await syncUserWithFirestore(firebaseUser);
          }
          
          if (unsubSnapshot) unsubSnapshot();
          unsubSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (s) => {
            if (s.exists()) {
              setUser(s.data() as User);
              setIsLoading(false);
            }
          });
        } else {
          setUser(null);
          setCurrentState(AppState.LANDING);
          setIsLoading(false);
        }
      });

      return unsubscribeAuth;
    };

    const unsubAuthPromise = initAuth();

    return () => {
      unsubAuthPromise.then(unsub => unsub && unsub());
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [syncUserWithFirestore, user, currentState]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    setIsLoading(true);
    try {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        if (result.user) await syncUserWithFirestore(result.user);
      }
    } catch (error) {
      console.error("Login Error:", error);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (email: string, pass: string, isSignUp: boolean) => {
    setIsLoading(true);
    try {
      const result = isSignUp 
        ? await createUserWithEmailAndPassword(auth, email, pass)
        : await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) await syncUserWithFirestore(result.user);
    } catch (error) {
      setIsLoading(false);
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

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-indigo-950 text-white font-black text-center px-6">
      <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-8"></div>
      <p className="animate-pulse tracking-[0.3em] uppercase text-[10px] text-indigo-300">인증 정보를 확인 중입니다...</p>
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
                setIsLoading(true);
                await signOut(auth); 
                setUser(null); 
                setCurrentState(AppState.LANDING); 
                setIsLoading(false);
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