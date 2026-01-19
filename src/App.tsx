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
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setShowLoginModal(false);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // 초기 데이터 로드
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUser(snap.data() as User);
        } else {
          const newUser: User = { 
            id: firebaseUser.uid, 
            name: firebaseUser.displayName || 'Learner', 
            email: firebaseUser.email || '', 
            avatarUrl: firebaseUser.photoURL || '', 
            plan: 'free', 
            subscriptionExpiry: null, 
            examsRemaining: 3 
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }

        // 실시간 업데이트 구독
        const unsubSnapshot = onSnapshot(userRef, (s) => {
          if (s.exists()) {
            setUser(s.data() as User);
          }
        });

        if (currentState === AppState.LANDING) setCurrentState(AppState.DASHBOARD);
        return () => unsubSnapshot();
      } else {
        setUser(null);
        setCurrentState(AppState.LANDING);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentState]);

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
    setLastSession(session);
    setCurrentState(AppState.ANALYTICS);
    
    // 무료 사용자 남은 횟수 차감
    if (user.plan === 'free') {
      const userRef = doc(db, 'users', user.id);
      setDoc(userRef, { examsRemaining: Math.max(0, user.examsRemaining - 1) }, { merge: true });
    }
  };

  const handleBackToDashboard = () => setCurrentState(AppState.DASHBOARD);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-indigo-900 text-white font-black text-center p-10">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
      <p className="animate-pulse tracking-widest uppercase text-sm">준비 중입니다...</p>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative font-sans">
      <FaviconManager />
      <InstallPwa />
      
      {!user && <LandingPage onLoginClick={() => setShowLoginModal(true)} />}
      
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} 
        />
      )}
      
      {currentState === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user} 
          onModeSelect={handleModeSelect} 
          onUpgrade={() => setShowPaywall(true)} 
          onProfileClick={() => setShowProfile(true)} 
          onViewAnalysis={() => { if(lastSession) setCurrentState(AppState.ANALYTICS); }} 
        />
      )}

      {currentState === AppState.SET_SELECTION && user && (
        <SetSelector 
          mode={examMode} 
          plan={user.plan}
          onSelect={handleSetSelect} 
          onBack={handleBackToDashboard} 
        />
      )}
      
      {currentState === AppState.EXAM && user && (
        <ExamSimulator 
          mode={examMode}
          setNumber={selectedSet}
          onComplete={handleExamComplete} 
          onExit={handleBackToDashboard} 
          /* [Fix] plan 프로퍼티로 전달하여 컴포넌트 인터페이스와 일치시킴 */
          plan={user.plan} 
        />
      )}
      
      {currentState === AppState.ANALYTICS && lastSession && (
        <Analytics session={lastSession} onBack={handleBackToDashboard} />
      )}

      {showPaywall && user && <PaywallModal user={user} onClose={() => setShowPaywall(false)} />}
      
      {showProfile && user && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onLogout={() => signOut(auth)} 
          onRenew={() => { setShowProfile(false); setShowPaywall(true); }} 
        />
      )}
    </div>
  );
};

export default App;