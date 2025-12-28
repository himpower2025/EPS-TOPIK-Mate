
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
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setShowLoginModal(false);
        onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as User);
          } else {
            const newUser: User = { 
              id: firebaseUser.uid, 
              name: firebaseUser.displayName || 'Guest', 
              email: firebaseUser.email || '', 
              avatarUrl: firebaseUser.photoURL || '', 
              plan: 'free', 
              subscriptionExpiry: null, 
              examsRemaining: 1 
            };
            setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
          if (currentState === AppState.LANDING) setCurrentState(AppState.DASHBOARD);
        });
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
    setSelectedSet(setNum);
    setCurrentState(AppState.EXAM);
  };

  const handleViewAnalysis = async () => {
    if (!user) return;
    const q = query(collection(db, 'exams'), where('userId', '==', user.id), orderBy('completedAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setLastSession(snap.docs[0].data() as ExamSession);
      setCurrentState(AppState.ANALYTICS);
    } else {
      alert("No results found. Complete an exam first!");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-indigo-900 text-white font-black animate-pulse uppercase tracking-widest">EPS Mate Loading...</div>;

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative">
      <FaviconManager />
      <InstallPwa />
      
      {!user && <LandingPage onLoginClick={() => setShowLoginModal(true)} />}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} />}
      
      {currentState === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user} 
          onModeSelect={handleModeSelect} 
          onUpgrade={() => setShowPaywall(true)} 
          onProfileClick={() => setShowProfile(true)} 
          onViewAnalysis={handleViewAnalysis} 
        />
      )}

      {currentState === AppState.SET_SELECTION && user && (
        <SetSelector 
          mode={examMode} 
          onSelect={handleSetSelect} 
          onBack={() => setCurrentState(AppState.DASHBOARD)} 
          isPremium={user.plan !== 'free'}
        />
      )}
      
      {currentState === AppState.EXAM && user && (
        <ExamSimulator 
          mode={examMode}
          setNumber={selectedSet}
          onComplete={(s) => { 
            setDoc(doc(db, 'exams', s.id), { ...s, userId: user.id });
            setDoc(doc(db, 'users', user.id), { examsRemaining: user.plan === 'free' ? 0 : 9999 }, { merge: true });
            setLastSession(s); 
            setCurrentState(AppState.ANALYTICS); 
          }} 
          onExit={() => setCurrentState(AppState.SET_SELECTION)} 
          isPremium={user.plan !== 'free'} 
        />
      )}
      
      {currentState === AppState.ANALYTICS && lastSession && (
        <Analytics session={lastSession} onBack={() => setCurrentState(AppState.DASHBOARD)} />
      )}

      {showPaywall && user && <PaywallModal user={user} onClose={() => setShowPaywall(false)} />}
      {showProfile && user && <ProfileModal user={user} onClose={() => setShowProfile(false)} onLogout={() => signOut(auth)} onRenew={() => setShowPaywall(true)} />}
    </div>
  );
};

export default App;
