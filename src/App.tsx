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
  
  useEffect(() => {
    const savedUser = localStorage.getItem('eps_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.id) {
          setUser(parsedUser);
          setCurrentState(AppState.DASHBOARD);
        } else {
          localStorage.removeItem('eps_user');
        }
      } catch (e) {
        console.error("Failed to restore user session:", e);
        localStorage.removeItem('eps_user');
      }
    }
  }, []);

  const handleLogin = () => {
    const mockUser: User = {
      id: 'user_123',
      name: 'Nepal Student',
      email: 'student@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      plan: 'free',
      subscriptionExpiry: null,
      examsRemaining: 1
    };
    setUser(mockUser);
    localStorage.setItem('eps_user', JSON.stringify(mockUser));
    setShowLoginModal(false);
    setCurrentState(AppState.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eps_user');
    setCurrentState(AppState.LANDING);
    setShowProfile(false);
  };

  const startExam = () => {
    if (!user) return;
    if (user.plan === 'free' && user.examsRemaining <= 0) {
      setShowPaywall(true);
      return;
    }
    setCurrentState(AppState.EXAM);
  };

  const handleExamComplete = (session: ExamSession) => {
    if (user && user.plan === 'free') {
       const updatedUser = { ...user, examsRemaining: Math.max(0, user.examsRemaining - 1) };
       setUser(updatedUser);
       localStorage.setItem('eps_user', JSON.stringify(updatedUser));
    }
    setLastSession(session);
    setCurrentState(AppState.ANALYTICS);
  };

  const handleBackToDashboard = () => {
    setCurrentState(AppState.DASHBOARD);
  };

  const handleUpgrade = (plan: PlanType = '3m') => {
    if (!user) return;
    const now = new Date();
    if (plan === '1m') now.setMonth(now.getMonth() + 1);
    if (plan === '3m') now.setMonth(now.getMonth() + 3);
    if (plan === '6m') now.setMonth(now.getMonth() + 6);

    const upgradedUser: User = {
      ...user,
      plan: plan,
      subscriptionExpiry: now.toISOString(),
      examsRemaining: 9999
    };

    alert(`Upgraded to ${plan} plan!`);
    setUser(upgradedUser);
    localStorage.setItem('eps_user', JSON.stringify(upgradedUser));
    setShowPaywall(false);
    setShowProfile(false);
  };

  if (!user && currentState === AppState.LANDING) {
    return (
      <div className="h-[100dvh] w-full bg-white overflow-hidden flex flex-col">
        <FaviconManager />
        <InstallPwa />
        <LandingPage onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onLogin={handleLogin} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-gray-100 overflow-hidden flex flex-col relative">
      <FaviconManager />
      <InstallPwa />
      
      {currentState === AppState.DASHBOARD && user && (
        <Dashboard 
          user={user}
          onStartExam={startExam} 
          onUpgrade={() => setShowPaywall(true)}
          onProfileClick={() => setShowProfile(true)}
        />
      )}
      
      {currentState === AppState.EXAM && (
        <ExamSimulator 
          onComplete={handleExamComplete} 
          onExit={handleBackToDashboard} 
        />
      )}
      
      {currentState === AppState.ANALYTICS && lastSession && (
        <Analytics 
          session={lastSession} 
          onBack={handleBackToDashboard} 
        />
      )}

      {showPaywall && (
        <PaywallModal 
          onClose={() => setShowPaywall(false)}
          onUpgrade={() => handleUpgrade('3m')}
        />
      )}

      {showProfile && user && (
        <ProfileModal 
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
          onRenew={() => {
            setShowProfile(false);
            setShowPaywall(true);
          }}
        />
      )}
    </div>
  );
};

export default App;