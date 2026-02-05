import React from 'react';
import { ExamMode, PlanType } from '../types';
import { ChevronLeft, Sparkles, BookOpen, Globe, PlayCircle } from 'lucide-react';

interface SetSelectorProps {
  mode: ExamMode;
  plan: PlanType;
  onSelect: (setNumber: number) => void;
  onBack: () => void;
}

export const SetSelector: React.FC<SetSelectorProps> = ({ mode, plan, onSelect, onBack }) => {
  const isPremium = plan !== 'free';
  
  const getMaxSets = () => {
    if (!isPremium) return 1;

    if (plan === '1m') return 5; // RL:5, LL:5, ME:5
    
    if (plan === '3m') {
      if (mode === 'READING' || mode === 'LISTENING') return 20;
      if (mode === 'FULL') return 20; // 10 Static + 10 AI
    }
    
    if (plan === '6m') {
      return 50; // RL:50, LL:50, ME:50 (Mix of static and AI)
    }
    
    return 5;
  };

  const maxSets = getMaxSets();
  
  const getModeInfo = () => {
    switch(mode) {
      case 'FULL': return { title: 'Full Mock Exam', icon: <PlayCircle className="w-5 h-5"/>, color: 'text-indigo-600' };
      case 'READING': return { title: 'Reading Lab', icon: <Globe className="w-5 h-5"/>, color: 'text-blue-600' };
      case 'LISTENING': return { title: 'Listening Lab', icon: <BookOpen className="w-5 h-5"/>, color: 'text-orange-600' };
    }
  };

  const info = getModeInfo();

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-5 pt-safe flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`${info.color} bg-gray-50 p-2 rounded-xl`}>{info.icon}</div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{info.title}</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              {isPremium ? `${plan.toUpperCase()} PASS • Select Round` : "Free Trial Mode"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24 hide-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: maxSets }, (_, i) => {
            const setNum = i + 1;
            let isAiGenerated = false;

            // AI 생성 여부 판단 (사용자 요구사항 기반)
            if (plan === '3m' && mode === 'FULL' && setNum > 10) isAiGenerated = true;
            if (plan === '6m') {
               if ((mode === 'READING' || mode === 'LISTENING') && setNum > 15) isAiGenerated = true;
               if (mode === 'FULL' && setNum > 15) isAiGenerated = true;
            }

            return (
              <button
                key={setNum}
                onClick={() => onSelect(setNum)}
                className={`group relative aspect-square rounded-[2.5rem] border-2 bg-white shadow-sm hover:border-indigo-600 hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center p-4 ${isAiGenerated ? 'border-purple-100' : 'border-white'}`}
              >
                <div className={`text-4xl font-black mb-1 group-hover:scale-110 transition-transform ${isAiGenerated ? 'text-purple-600' : 'text-indigo-950'}`}>{setNum}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Round</div>
                
                {isAiGenerated && (
                  <div className="absolute top-4 right-4 animate-pulse"><Sparkles className="w-4 h-4 text-purple-400" /></div>
                )}
                
                <div className="absolute bottom-4 inset-x-0 text-center">
                   <div className={`text-[8px] font-black uppercase tracking-widest ${isAiGenerated ? 'text-purple-400' : 'text-indigo-300'}`}>
                      {isAiGenerated ? "AI Generated" : "Premium DB"}
                   </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Info Card */}
        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 text-center">
            <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
              {plan === 'free' ? "You are previewing Set 10 content." : 
               `As a ${plan.toUpperCase()} member, you have access to ${maxSets} specialized rounds.`}
            </p>
        </div>
      </div>
    </div>
  );
};
