import React from 'react';
import { PlayCircle, Target, BookOpen, Globe, Lock, Star, User as UserIcon, ArrowRight } from 'lucide-react';
import { User, ExamMode } from '../types';

interface DashboardProps {
  user: User;
  onModeSelect: (mode: ExamMode, setNum?: number) => void;
  onUpgrade: () => void;
  onProfileClick: () => void;
  onViewAnalysis: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onModeSelect, onUpgrade, onProfileClick, onViewAnalysis }) => {
  const isPremium = user.plan !== 'free';

  const handlePracticeStart = (mode: ExamMode) => {
    // Round 10 is the demo set
    if (!isPremium) onModeSelect(mode, 10);
    else onModeSelect(mode);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-indigo-900 pt-safe text-white shrink-0 shadow-lg z-20">
         <div className="px-6 py-5 flex justify-between items-center max-w-screen-xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 bg-white rounded-xl text-indigo-900 text-xs font-black w-8 h-8 flex items-center justify-center z-10 shadow-lg border-2 border-indigo-900">Kor</div>
                    <div className="absolute bottom-0 right-0 bg-purple-500 rounded-xl text-white text-xs font-black w-8 h-8 flex items-center justify-center shadow-lg border-2 border-indigo-900">A</div>
                </div>
                <div>
                   <div className="font-black text-2xl tracking-tighter uppercase leading-none">EPS MATE</div>
                   <p className="text-[8px] text-indigo-300 font-black tracking-[0.3em] uppercase mt-1">AI Exam Partner</p>
                </div>
            </div>
            <button 
              onClick={onProfileClick} 
              className="w-12 h-12 rounded-2xl border-2 border-indigo-400/50 overflow-hidden shadow-xl active:scale-90 transition-all hover:border-white"
            >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-500 flex items-center justify-center">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        <div className="bg-indigo-900 text-white rounded-b-[4rem] px-6 pb-20 pt-8 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="relative z-10 max-w-screen-xl mx-auto text-center flex flex-col items-center">
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">Hello, {user.name.split(' ')[0]}!</h1>
              {isPremium ? (
                <div className="bg-yellow-400 text-indigo-950 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 mb-10 animate-bounce">
                  <Star className="w-4 h-4 fill-current" /> Premium Active
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 mb-10">
                   <p className="text-indigo-200 text-lg font-medium opacity-80">Ready to master Korean?</p>
                   <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-300 border border-white/10 uppercase tracking-widest">Trial Mode: Round 10 Available</span>
                </div>
              )}
              
              <div className="w-full max-w-lg space-y-4">
                <button 
                  onClick={() => handlePracticeStart('FULL')} 
                  className="bg-white text-indigo-900 w-full py-6 rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-6 transition-all active:scale-95 group hover:bg-indigo-50"
                >
                  <PlayCircle className="w-10 h-10 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-3xl font-black uppercase tracking-tight">Full Mock Exam</span>
                </button>
                {!isPremium && (
                  <button 
                    onClick={onUpgrade} 
                    className="bg-indigo-800/40 backdrop-blur-xl border border-white/10 text-white w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/10"
                  >
                    <Lock className="w-5 h-5 text-yellow-400" /> Get Full Access
                  </button>
                )}
              </div>
           </div>
        </div>

        <div className="px-6 py-12 max-w-screen-xl mx-auto">
          <h3 className="text-gray-900 font-black text-xs uppercase tracking-[0.4em] mb-8 opacity-30 text-center">Learning Modules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { mode: 'READING', title: 'Reading Lab', desc: 'Focus on passage comprehension & vocabulary', icon: <Globe className="w-10 h-10 text-blue-600" />, bg: 'bg-blue-50', hover: 'hover:border-blue-200' },
              { mode: 'LISTENING', title: 'Listening Lab', desc: 'Hone your ears with AI-driven dialogues', icon: <BookOpen className="w-10 h-10 text-orange-600" />, bg: 'bg-orange-50', hover: 'hover:border-orange-200' },
              { type: 'ANALYSIS', title: 'Analytics', desc: 'Review your AI performance reports', icon: <Target className="w-10 h-10 text-green-600" />, bg: 'bg-green-50', hover: 'hover:border-green-200' }
            ].map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => item.type === 'ANALYSIS' ? onViewAnalysis() : handlePracticeStart(item.mode as ExamMode)}
                className={`bg-white p-8 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all active:scale-95 group ${item.hover} hover:shadow-xl`}
              >
                <div className={`w-20 h-20 ${item.bg} rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
                  {item.icon}
                </div>
                <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight mb-2">{item.title}</h4>
                <p className="text-xs text-gray-400 font-bold leading-relaxed">{item.desc}</p>
                <div className="mt-6 p-2 bg-gray-50 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-center py-8 text-[10px] text-gray-400 font-black uppercase tracking-[0.4em] border-t border-gray-100 shrink-0 bg-white">
        © EPS MATE • Your Partner for Korean Career
      </div>
    </div>
  );
};