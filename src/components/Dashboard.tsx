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
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-indigo-800 px-4 md:px-10 py-4 flex justify-between items-center text-white">
         <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
                <div className="absolute top-0 left-0 bg-indigo-600 rounded-tl-md rounded-tr-md rounded-bl-md text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center z-10 shadow-sm border border-white">가</div>
                <div className="absolute bottom-0 right-0 bg-purple-400 rounded-tr-md rounded-br-md rounded-bl-md text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center shadow-sm border border-white">A</div>
            </div>
            <div className="font-bold text-lg tracking-tight">EPS-TOPIK Mate</div>
         </div>
         
         <div className="flex items-center gap-3">
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-2 hover:bg-indigo-700/50 py-1.5 px-3 rounded-full transition-colors"
            >
                <span className="text-sm font-medium hidden md:block">{user.name}</span>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Me" className="w-8 h-8 rounded-full border-2 border-indigo-300" />
                ) : (
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
            </button>
         </div>
      </div>

      <div className="bg-indigo-700 text-white pb-20 pt-6 px-4 md:px-10 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-5xl mx-auto text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
             <h1 className="text-3xl md:text-5xl font-bold">Welcome, {user.name.split(' ')[0]}!</h1>
             {isPremium && (
               <span className="bg-yellow-400 text-indigo-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-wide">
                 <Star className="w-3 h-3 fill-current" /> Premium
               </span>
             )}
          </div>
         
          <p className="text-indigo-200 text-lg max-w-2xl mb-8">
            Ready to practice with your Mate today? <br/>
            {isPremium 
              ? "You have unlimited access to AI mock exams."
              : "You are on the Free Starter plan."
            }
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
            <button 
              onClick={onStartExam}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-8 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform transform hover:scale-105"
            >
              <PlayCircle className="w-6 h-6" />
              Start New Exam
            </button>
            {!isPremium && (
              <button 
                onClick={onUpgrade}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 hover:opacity-90 px-8 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                Unlock Unlimited
              </button>
            )}
          </div>
          {!isPremium && (
             <p className="mt-4 text-sm text-indigo-300">
               Free Trial: {user.examsRemaining} exam remaining.
             </p>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-10 -mt-10 mb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-indigo-500">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">New Questions</h3>
            <p className="text-gray-600">
              AI generates fresh questions every time based on the latest exam trends.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-green-500">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Analysis</h3>
            <p className="text-gray-600">
              Identify your weak points in vocabulary, grammar, or reading.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-orange-500">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Listening</h3>
            <p className="text-gray-600">
              Unlimited listening practice using AI Text-to-Speech (TTS).
            </p>
          </div>
        </div>
      </div>
      
      <div className="text-center py-6 text-gray-400 text-sm">
        © EPS-TOPIK Mate. Powered by Google Gemini.
      </div>
    </div>
  );
};
