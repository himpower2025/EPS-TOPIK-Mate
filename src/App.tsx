import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExamSimulator } from './components/ExamSimulator';
import { Analytics } from './components/Analytics';
import { PaywallModal } from './components/PaywallModal';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { FaviconManager } from './components/FaviconManager'; // Import the new manager
import { ExamSession, User, PlanType } from './types';

enum AppState {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  EXAM = 'EXAM',
  ANALYTICS = 'ANALYTICS'
}

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  
  // App Flow State
  const [currentState, setCurrentState] = useState<AppState>(AppState.LANDING);
  
  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Data
  const [lastSession, setLastSession] = useState<ExamSession | null>(null);
  
  // Initial check (simulating session restore)
  useEffect(() => {
    const savedUser = localStorage.getItem('eps_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.id) {
          setUser(parsedUser);
          setCurrentState(AppState.DASHBOARD);
        } else {
          // Invalid user data, clear it
          localStorage.removeItem('eps_user');
        }
      } catch (e) {
        console.error("Failed to restore user session:", e);
        localStorage.removeItem('eps_user');
      }
    }
  }, []);

  const handleLogin = () => {
    // Mock Login - In production, this would use Firebase/Supabase/NextAuth
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
       // Decrement free exams
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
    
    // Calculate expiry
    const now = new Date();
    if (plan === '1m') now.setMonth(now.getMonth() + 1);
    if (plan === '3m') now.setMonth(now.getMonth() + 3);
    if (plan === '6m') now.setMonth(now.getMonth() + 6);

    const upgradedUser: User = {
      ...user,
      plan: plan,
      subscriptionExpiry: now.toISOString(),
      examsRemaining: 9999 // Unlimited
    };

    alert(`Successfully upgraded to ${plan === '6m' ? '6 Months' : plan === '3m' ? '3 Months' : '1 Month'} plan!`);
    setUser(upgradedUser);
    localStorage.setItem('eps_user', JSON.stringify(upgradedUser));
    setShowPaywall(false);
    setShowProfile(false);
  };

  // Main Render Logic
  if (!user && currentState === AppState.LANDING) {
    return (
      <>
        <FaviconManager /> {/* Generate Favicon */}
        <LandingPage onLoginClick={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginModal 
            onClose={() => setShowLoginModal(false)} 
            onLogin={handleLogin} 
          />
        )}
      </>
    );
  }

  return (
    <div className="h-full w-full bg-gray-100">
      <FaviconManager /> {/* Generate Favicon */}
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
          onUpgrade={() => handleUpgrade('3m')} // Default to popular
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