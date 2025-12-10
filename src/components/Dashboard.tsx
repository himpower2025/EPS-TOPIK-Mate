import React from 'react';
import { PlayCircle, Target, BookOpen, Globe, Lock, Star, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onStartExam: () => void;
  onUpgrade: () => void;
  onProfileClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onStartExam, onUpgrade, onProfileClick }) => {
  const isPremium = user.plan !== 'free';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* 1. Fixed Header with Safe Area */}
      <div className="bg-indigo-800 pt-safe text-white shrink-0 shadow-lg z-20">
         <div className="px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 shrink-0">
                    <div className="absolute top-0 left-0 bg-white rounded-tl-lg rounded-tr-lg rounded-bl-lg text-indigo-800 text-[10px] font-bold w-6 h-6 flex items-center justify-center z-10 shadow-sm border border-indigo-100">가</div>
                    <div className="absolute bottom-0 right-0 bg-purple-400 rounded-tr-lg rounded-br-lg rounded-bl-lg text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center shadow-sm border border-purple-300">A</div>
                </div>
                <div className="font-bold text-xl tracking-tight">EPS Mate</div>
            </div>
            
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-2 hover:bg-white/10 py-1 pl-2 pr-2 md:pr-4 rounded-full transition-colors"
            >
                <span className="text-sm font-medium hidden md:block text-indigo-100">{user.name}</span>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Me" className="w-9 h-9 rounded-full border-2 border-indigo-300 shadow-sm object-cover" />
                ) : (
                  <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-indigo-100 shadow-inner">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
            </button>
         </div>
      </div>

      {/* 2. Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-safe scroll-smooth">
        
        {/* Hero Section */}
        <div className="bg-indigo-800 text-white rounded-b-[2rem] px-5 pb-10 pt-4 shadow-xl relative overflow-hidden">
           {/* Abstract BG */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           
           <div className="relative z-10 max-w-2xl mx-auto text-center">
              <div className="flex flex-col items-center gap-2 mb-4">
                 <h1 className="text-3xl font-extrabold">Hi, {user.name.split(' ')[0]}!</h1>
                 {isPremium && (
                   <span className="bg-yellow-400/90 text-indigo-900 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wide shadow-sm">
                     <Star className="w-3 h-3 fill-current" /> Premium
                   </span>
                 )}
              </div>
              
              <p className="text-indigo-100 text-base mb-6 opacity-90 leading-relaxed">
                {isPremium 
                  ? "Unlimited mock exams & AI listening practice active."
                  : "Let's study Korean. You are on the Starter plan."
                }
              </p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <button 
                  onClick={onStartExam}
                  className="bg-white text-indigo-700 w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                  <PlayCircle className="w-6 h-6 text-indigo-600" />
                  <span className="text-lg">Start Exam</span>
                </button>
                
                {!isPremium && (
                  <button 
                    onClick={onUpgrade}
                    className="bg-gradient-to-r from-orange-400 to-pink-500 text-white w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Lock className="w-5 h-5" />
                    Unlock Unlimited
                  </button>
                )}
              </div>
              
              {!isPremium && (
                 <p className="mt-4 text-xs text-indigo-300/80">
                   {user.examsRemaining} free exam(s) remaining today.
                 </p>
              )}
           </div>
        </div>

        {/* Features Grid */}
        <div className="px-5 py-8 max-w-4xl mx-auto">
          <h3 className="text-gray-900 font-bold text-lg mb-4 ml-1">Today's Goals</h3>
          
          <div className="grid grid-cols-1 gap-4">
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Globe className="w-7 h-7 text-indigo-600" />
               </div>
               <div>
                  <h4 className="font-bold text-gray-900">New Questions</h4>
                  <p className="text-xs text-gray-500 mt-1">AI generates fresh questions daily.</p>
               </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Target className="w-7 h-7 text-green-600" />
               </div>
               <div>
                  <h4 className="font-bold text-gray-900">Smart Analysis</h4>
                  <p className="text-xs text-gray-500 mt-1">Instant feedback on your weak points.</p>
               </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-orange-600" />
               </div>
               <div>
                  <h4 className="font-bold text-gray-900">Listening (TTS)</h4>
                  <p className="text-xs text-gray-500 mt-1">Native-level AI voice practice.</p>
               </div>
            </div>

          </div>
        </div>
        
        <div className="h-20"></div> {/* Spacer for scrolling */}
      </div>

    </div>
  );
};