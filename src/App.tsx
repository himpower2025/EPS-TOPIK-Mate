
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExamSimulator } from './components/ExamSimulator';
import { Analytics } from './components/Analytics';
import { PaywallModal } from './components/PaywallModal';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { FaviconManager } from './components/FaviconManager';
import { InstallPwa } from './components/InstallPwa';
import { ExamSession, User } from './types';

import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs, orderBy, limit, getDoc } from 'firebase/firestore';

enum AppState { LANDING, DASHBOARD, EXAM, ANALYTICS }

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.LANDING);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lastSession, setLastSession] = useState<ExamSession | null>(null);
  const [examMode, setExamMode] = useState<'FULL' | 'LISTENING' | 'READING'>('FULL');
  const [isLoading, setIsLoading] = useState(true);
  const [startIdx, setStartIdx] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) setUser(snap.data() as User);
          else {
            const newUser: User = { id: firebaseUser.uid, name: firebaseUser.displayName || 'Guest', email: firebaseUser.email || '', avatarUrl: firebaseUser.photoURL || '', plan: 'free', subscriptionExpiry: null, examsRemaining: 1 };
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
  }, []);

  const handleStartExam = async (mode: 'FULL' | 'LISTENING' | 'READING' = 'FULL') => {
    if (user?.plan === 'free' && user.examsRemaining <= 0) {
      setShowPaywall(true);
      return;
    }
    
    setExamMode(mode);
    
    // For Drills, try to fetch last saved progress
    if (mode !== 'FULL' && user) {
      const userRef = doc(db, 'users', user.id);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const savedIdx = data[`last_${mode.toLowerCase()}_index`];
        if (savedIdx && data.plan !== 'free') {
           if (confirm(`Resume from Question ${savedIdx + 1}?`)) {
             setStartIdx(savedIdx);
           } else {
             setStartIdx(0);
           }
        } else {
           setStartIdx(0);
        }
      }
    } else {
      setStartIdx(0);
    }

    setCurrentState(AppState.EXAM);
  };

  const handleProgressUpdate = (index: number) => {
    if (!user || user.plan === 'free' || examMode === 'FULL') return;
    // Persist progress asynchronously
    setDoc(doc(db, 'users', user.id), {
      [`last_${examMode.toLowerCase()}_index`]: index
    }, { merge: true });
  };

  const handleViewAnalysis = async () => {
    if (!user) return;
    const q = query(collection(db, 'exams'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setLastSession(snap.docs[0].data() as ExamSession);
      setCurrentState(AppState.ANALYTICS);
    } else {
      alert("No results found.");
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
        <Dashboard user={user} onStartExam={handleStartExam} onUpgrade={() => setShowPaywall(true)} onProfileClick={() => setShowProfile(true)} onViewAnalysis={handleViewAnalysis} />
      )}
      
      {currentState === AppState.EXAM && user && (
        <ExamSimulator 
          onComplete={(s) => { 
            setDoc(doc(db, 'exams', s.id), { ...s, userId: user.id, createdAt: serverTimestamp() });
            setDoc(doc(db, 'users', user.id), { examsRemaining: user.plan === 'free' ? 0 : 9999 }, { merge: true });
            setLastSession(s); 
            setCurrentState(AppState.ANALYTICS); 
          }} 
          onExit={() => setCurrentState(AppState.DASHBOARD)} 
          isPremium={user.plan !== 'free'} 
          mode={examMode} 
          startFromIndex={startIdx}
          onProgressUpdate={handleProgressUpdate}
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
