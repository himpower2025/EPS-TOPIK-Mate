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
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto animate-fade-in safe-area-pb">
      {/* Navbar for Dashboard */}
      <div className="bg-indigo-800 px-5 md:px-8 lg:px-12 py-4 flex justify-between items-center text-white shrink-0 shadow-md z-10 sticky top-0 safe-area-pt">
         <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 shrink-0">
                <div className="absolute top-0 left-0 bg-white rounded-tl-lg rounded-tr-lg rounded-bl-lg text-indigo-800 text-[10px] font-bold w-6 h-6 flex items-center justify-center z-10 shadow-sm border border-indigo-100">가</div>
                <div className="absolute bottom-0 right-0 bg-purple-400 rounded-tr-lg rounded-br-lg rounded-bl-lg text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center shadow-sm border border-purple-300">A</div>
            </div>
            <div className="font-bold text-xl tracking-tight">EPS Mate</div>
         </div>
         
         <div className="flex items-center gap-3">
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-2 hover:bg-indigo-700/50 py-1.5 px-2 md:px-3 rounded-full transition-colors border border-transparent hover:border-indigo-500/50"
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

      {/* Hero Section */}
      <div className="bg-indigo-700 text-white pb-24 pt-8 px-5 md:px-8 lg:px-12 rounded-b-[3rem] shadow-xl relative overflow-hidden shrink-0">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="max-w-6xl mx-auto text-center md:text-left relative z-10 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2 md:gap-4 mb-4">
             <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">Hi, {user.name.split(' ')[0]}!</h1>
             {isPremium && (
               <span className="bg-yellow-400/90 backdrop-blur-sm text-indigo-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wide shadow-sm w-fit mx-auto md:mx-0">
                 <Star className="w-3 h-3 fill-current" /> Premium
               </span>
             )}
          </div>
         
          <p className="text-indigo-100 text-base md:text-lg max-w-2xl mb-8 leading-relaxed mx-auto md:mx-0 opacity-90">
            {isPremium 
              ? "Unlimited access to AI exams & TTS enabled."
              : "Let's study Korean today. You are on the Starter plan."
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button 
              onClick={onStartExam}
              className="bg-white text-indigo-700 hover:bg-indigo-50 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-3 transition-all transform active:scale-95 group touch-manipulation"
            >
              <div className="bg-indigo-100 p-1.5 rounded-full group-hover:bg-indigo-200 transition-colors">
                 <PlayCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-lg">Start New Exam</span>
            </button>
            {!isPremium && (
              <button 
                onClick={onUpgrade}
                className="bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:opacity-90 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 touch-manipulation"
              >
                <Lock className="w-5 h-5" />
                Unlock Unlimited
              </button>
            )}
          </div>
          {!isPremium && (
             <p className="mt-4 text-sm text-indigo-300 font-medium">
               Free Trial: {user.examsRemaining} exam(s) left.
             </p>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="flex-1 px-5 md:px-8 lg:px-12 -mt-12 mb-10 z-10 pb-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:border-indigo-100 transition-all group">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">New Questions</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              AI generates fresh questions every time based on the latest trends.
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:border-green-100 transition-all group">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Smart Analysis</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Instant feedback on your weak points to help you improve faster.
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 hover:border-orange-100 transition-all group md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Listening (TTS)</h3>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Practice with AI audio that sounds just like the real exam proctors.
            </p>
          </div>

        </div>
      </div>
      
      <div className="text-center py-6 text-gray-400 text-xs font-medium uppercase tracking-widest bg-gray-50 mt-auto">
        © EPS-TOPIK Mate
      </div>
    </div>
  );
};