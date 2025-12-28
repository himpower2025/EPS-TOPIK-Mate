
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
import { ExamSession, User, PlanType } from './types';

// Firebase 도구
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

enum AppState {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  EXAM = 'EXAM',
  ANALYTICS = 'ANALYTICS'
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentState, setCurrentState] = useState<AppState>(AppState.LANDING);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lastSession, setLastSession] = useState<ExamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 사용자 상태 감시 (이것이 자동 승인의 핵심입니다)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firestore의 해당 사용자 문서를 실시간으로 지켜봅니다.
        // 나중에 API나 관리자가 여기서 plan을 바꾸면 사용자의 앱이 즉시 반응합니다.
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser(userData);
            
            // 만약 대기중이던 결제가 성공했다면 모달을 닫아주거나 알림을 줄 수 있음
            if (userData.plan !== 'free' && showPaywall) {
              // 축하 메시지나 자동 닫기 처리 가능
            }
          } else {
            // 새 유저 초기 생성
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Student',
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || '',
              plan: 'free',
              subscriptionExpiry: null,
              examsRemaining: 1
            };
            setDoc(userRef, newUser);
            setUser(newUser);
          }
          if (currentState === AppState.LANDING) setCurrentState(AppState.DASHBOARD);
        });
        
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setCurrentState(AppState.LANDING);
      }
      setIsLoading(false);
    });
    return () => unsubscribeAuth();
  }, [currentState, showPaywall]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      console.error("Login Error:", error);
      alert("로그인에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setShowProfile(false);
    setCurrentState(AppState.LANDING);
  };

  const handleExamComplete = async (session: ExamSession) => {
    if (!user) return;
    
    try {
       const userRef = doc(db, 'users', user.id);
       const updatedExams = user.plan === 'free' ? Math.max(0, user.examsRemaining - 1) : 9999;
       await setDoc(userRef, { examsRemaining: updatedExams }, { merge: true });
       
       const examRef = doc(db, 'exams', session.id);
       await setDoc(examRef, { ...session, userId: user.id, createdAt: serverTimestamp() });
    } catch (error) {
       console.error("Save Error:", error);
    }
    
    setLastSession(session);
    setCurrentState(AppState.ANALYTICS);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-indigo-900 text-white font-black animate-pulse uppercase tracking-widest">EPS Mate Loading...</div>;

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative">
      <FaviconManager />
      <InstallPwa />
      
      {!user && currentState === AppState.LANDING && (
        <LandingPage onLoginClick={() => setShowLoginModal(true)} />
      )}

      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLogin={handleLogin} 
        />
      )}
      
      {currentState === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user}
          onStartExam={() => (user.plan === 'free' && user.examsRemaining <= 0) ? setShowPaywall(true) : setCurrentState(AppState.EXAM)} 
          onUpgrade={() => setShowPaywall(true)}
          onProfileClick={() => setShowProfile(true)}
        />
      )}
      
      {currentState === AppState.EXAM && user && (
        <ExamSimulator 
          onComplete={handleExamComplete} 
          onExit={() => setCurrentState(AppState.DASHBOARD)} 
          isPremium={user.plan !== 'free'}
        />
      )}
      
      {currentState === AppState.ANALYTICS && lastSession && (
        <Analytics session={lastSession} onBack={() => setCurrentState(AppState.DASHBOARD)} />
      )}

      {showPaywall && user && (
        <PaywallModal 
          user={user} 
          onClose={() => setShowPaywall(false)} 
        />
      )}
      
      {showProfile && user && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onLogout={handleLogout} 
          onRenew={() => setShowPaywall(true)} 
        />
      )}
    </div>
  );
};

export default App;
