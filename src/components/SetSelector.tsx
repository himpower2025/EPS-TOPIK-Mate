import React from 'react';
import { ExamMode, PlanType } from '../types';
import { ChevronLeft, Sparkles } from 'lucide-react';

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

    if (mode === 'FULL') {
      if (plan === '1m') return 5;
      if (plan === '3m') return 30; // Updated from 15 to 30 as per request
      if (plan === '6m') return 70;
      return 5;
    } else {
      if (plan === '1m') return 20;
      if (plan === '3m') return 70;
      if (plan === '6m') return 150;
      return 20;
    }
  };

  const maxSets = getMaxSets();
  
  const getModeTitle = () => {
    switch(mode) {
      case 'FULL': return 'Full Mock Exam';
      case 'READING': return 'Reading Lab';
      case 'LISTENING': return 'Listening Lab';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 pt-safe flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{getModeTitle()}</h1>
          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">
            {isPremium ? `${plan.toUpperCase()} PASS • ${maxSets} Sets` : "Free Trial"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: maxSets }, (_, i) => {
            const setNum = i + 1;
            let isAiGenerated = false;

            // 6개월 플랜 31번 이후, 3개월 플랜 31번 이후는 AI 생성 표시
            if (mode === 'FULL') {
              if (setNum > 30) isAiGenerated = true;
            } else {
              if (setNum > 60) isAiGenerated = true;
            }

            return (
              <button
                key={setNum}
                onClick={() => onSelect(setNum)}
                className={`relative aspect-square rounded-[2.5rem] border-2 bg-white shadow-sm hover:border-indigo-600 active:scale-95 transition-all flex flex-col items-center justify-center p-4 ${isAiGenerated ? 'border-purple-200' : 'border-white'}`}
              >
                <div className={`text-3xl font-black mb-1 ${isAiGenerated ? 'text-purple-600' : 'text-indigo-900'}`}>{setNum}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Round</div>
                {isAiGenerated && (
                  <div className="absolute top-4 right-4"><Sparkles className="w-3 h-3 text-purple-400" /></div>
                )}
                <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                  {isAiGenerated ? "AI Content" : "Premium Set"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};