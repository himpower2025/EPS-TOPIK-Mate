import React from 'react';
import { ExamMode, PlanType } from '../types';
import { ChevronLeft, Lock, Star, Sparkles } from 'lucide-react';

interface SetSelectorProps {
  mode: ExamMode;
  plan: PlanType;
  onSelect: (setNumber: number) => void;
  onBack: () => void;
}

export const SetSelector: React.FC<SetSelectorProps> = ({ mode, plan, onSelect, onBack }) => {
  const isPremium = plan !== 'free';
  
  // 모드 및 플랜별 최대 세트 수 계산
  const getMaxSets = () => {
    if (!isPremium) return 2;

    if (mode === 'FULL') {
      if (plan === '1m') return 5;   // 5세트 (200문제)
      if (plan === '3m') return 30;  // 30세트 (1200문제)
      if (plan === '6m') return 70;  // 700세트 (2800문제)
    } else {
      // Reading/Listening Lab 모드 (기존 정책)
      if (plan === '1m') return 20;
      if (plan === '3m') return 70;
      if (plan === '6m') return 150;
    }
    return 2;
  };

  const maxSets = getMaxSets();
  
  const getModeTitle = () => {
    switch(mode) {
      case 'FULL': return 'Full Mock Exam (40Q)';
      case 'READING': return 'Reading Lab (10Q)';
      case 'LISTENING': return 'Listening Lab (9-11Q)';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 pt-safe flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{getModeTitle()}</h1>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
            {isPremium ? `${plan.toUpperCase()} Plan • ${maxSets} Sets Available` : "Free Trial Mode"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {!isPremium && (
            <div className="mb-8 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] text-white shadow-xl">
               <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span className="font-black text-sm uppercase tracking-tighter">Experience Success</span>
               </div>
               <h2 className="text-xl font-bold mb-2">Try the first 2 Rounds for free.</h2>
               <p className="text-indigo-100 text-xs opacity-90 leading-relaxed">
                 Access professional EPS-TOPIK questions. Upgrade to unlock up to 70 full mock exams and infinite practice.
               </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: maxSets }, (_, i) => {
              const setNum = i + 1;
              const isOdd = setNum % 2 !== 0;
              
              let label = "";
              if (mode === 'READING') {
                label = isOdd ? "Items 1-4" : "Items 5-8";
              } else if (mode === 'LISTENING') {
                label = isOdd ? "Q 21-29" : "Q 30-40";
              } else {
                label = "Full 40Q";
              }

              // DB vs AI 표시 (사용자 경험용)
              const isAISet = (mode === 'FULL' && ((plan === '3m' && setNum > 15) || (plan === '6m' && setNum > 30)));

              return (
                <button
                  key={setNum}
                  onClick={() => onSelect(setNum)}
                  className="relative group aspect-square rounded-[2rem] border-2 border-white bg-white shadow-sm hover:border-indigo-600 hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center p-4"
                >
                  <div className="text-3xl font-black text-indigo-900 mb-1">{setNum}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Round</div>
                  <div className="mt-1 text-[9px] font-bold text-indigo-500/60 uppercase tracking-tighter">
                    {isAISet ? "AI Premium" : label}
                  </div>
                  {!isPremium && (
                    <div className="absolute top-4 right-4">
                      <div className="text-[8px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded-full">FREE</div>
                    </div>
                  )}
                </button>
              );
            })}
            
            {!isPremium && Array.from({ length: 3 }, (_, i) => (
              <div key={`locked-${i}`} className="aspect-square rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center opacity-40">
                <Lock className="w-6 h-6 text-gray-300 mb-1" />
                <div className="text-[10px] font-black text-gray-300 uppercase">Locked</div>
              </div>
            ))}
          </div>

          {!isPremium && (
            <div className="mt-12 bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <Star className="w-10 h-10 text-yellow-400 fill-current mb-4" />
                <h3 className="text-2xl font-black mb-2 tracking-tight">Unlock Full Access</h3>
                <p className="text-gray-400 text-sm font-medium mb-6 max-w-xs">
                  Get up to 70 full mock exams (2800+ questions) and master the latest EPS-TOPIK standards.
                </p>
                <button className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-50 transition-all active:scale-95">
                  UPGRADE NOW
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
