
import React from 'react';
import { PlayCircle, Target, BookOpen, Globe, Lock, Star, User as UserIcon, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface DashboardProps {
  user: User;
  onStartExam: (mode?: 'FULL' | 'LISTENING' | 'READING') => void;
  onUpgrade: () => void;
  onProfileClick: () => void;
  onViewAnalysis: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onStartExam, onUpgrade, onProfileClick, onViewAnalysis }) => {
  const isPremium = user.plan !== 'free';

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-indigo-900 pt-safe text-white shrink-0 shadow-lg z-20">
         <div className="px-5 py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="relative w-9 h-9">
                    <div className="absolute top-0 left-0 bg-white rounded-lg text-indigo-900 text-[10px] font-black w-6 h-6 flex items-center justify-center z-10 shadow-md">가</div>
                    <div className="absolute bottom-0 right-0 bg-purple-500 rounded-lg text-white text-[10px] font-black w-6 h-6 flex items-center justify-center shadow-md">A</div>
                </div>
                <div className="font-black text-xl tracking-tighter uppercase">EPS Mate</div>
            </div>
            <button onClick={onProfileClick} className="w-10 h-10 rounded-full border-2 border-indigo-400 overflow-hidden shadow-sm">
                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-500 flex items-center justify-center"><UserIcon className="w-6 h-6" /></div>}
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="bg-indigo-900 text-white rounded-b-[3rem] px-5 pb-16 pt-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center">
              <h1 className="text-4xl font-black mb-2 tracking-tight">Hi, {user.name.split(' ')[0]}!</h1>
              {isPremium ? (
                <span className="bg-yellow-400 text-indigo-950 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5 mb-8">
                  <Star className="w-3 h-3 fill-current" /> Premium Member
                </span>
              ) : (
                <p className="text-indigo-200 mb-10 text-sm font-bold opacity-80 uppercase tracking-widest">Join the ranks of successful students</p>
              )}
              
              <div className="w-full max-w-sm space-y-4">
                <button onClick={() => onStartExam('FULL')} className="bg-white text-indigo-900 w-full py-5 rounded-[1.5rem] font-black shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-95 group">
                  <PlayCircle className="w-7 h-7 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xl font-black uppercase">Start Mock Exam</span>
                </button>
                {!isPremium && (
                  <button onClick={onUpgrade} className="bg-indigo-800/50 backdrop-blur-md border border-indigo-400/30 text-white w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95">
                    <Lock className="w-5 h-5 text-indigo-300" /> Unlock Unlimited Access
                  </button>
                )}
              </div>
           </div>
        </div>

        <div className="px-5 py-10 max-w-4xl mx-auto">
          <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-6 opacity-40">Training Center</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => onStartExam('READING')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 hover:border-indigo-200 active:scale-[0.98] transition-all text-left group">
               <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-colors">
                  <Globe className="w-8 h-8 text-blue-600 group-hover:text-white" />
               </div>
               <div className="flex-1">
                  <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Reading Practice</h4>
                  <p className="text-xs text-gray-400 font-bold mt-1">Focus on Reading Sections (1-20)</p>
               </div>
               <ArrowRight className="w-5 h-5 text-gray-200" />
            </button>

            <button onClick={() => onStartExam('LISTENING')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 hover:border-indigo-200 active:scale-[0.98] transition-all text-left group">
               <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-600 transition-colors">
                  <BookOpen className="w-8 h-8 text-orange-600 group-hover:text-white" />
               </div>
               <div className="flex-1">
                  <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Listening Drills</h4>
                  <p className="text-xs text-gray-400 font-bold mt-1">AI-Powered Conversation Practice (21-40)</p>
               </div>
               <ArrowRight className="w-5 h-5 text-gray-200" />
            </button>

            <button onClick={onViewAnalysis} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 hover:border-indigo-200 active:scale-[0.98] transition-all text-left group">
               <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-green-600 transition-colors">
                  <Target className="w-8 h-8 text-green-600 group-hover:text-white" />
               </div>
               <div className="flex-1">
                  <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Performance Analytics</h4>
                  <p className="text-xs text-gray-400 font-bold mt-1">Review your growth and exam history</p>
               </div>
               <ArrowRight className="w-5 h-5 text-gray-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
