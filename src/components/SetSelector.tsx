
import React from 'react';
import { ExamMode, PlanType } from '../types';
import { ChevronLeft, BookOpen, Globe, PlayCircle } from 'lucide-react';

interface SetSelectorProps {
  mode: ExamMode;
  plan: PlanType;
  onSelect: (setNumber: number) => void;
  onBack: () => void;
}

export const SetSelector: React.FC<SetSelectorProps> = ({ mode, plan, onSelect, onBack }) => {
  const isPremium = plan !== 'free';
  
  const getMaxSets = () => {
    if (plan === 'free') return 15;
    if (plan === '1m') return 3;
    if (plan === '3m') return 12;
    if (plan === '6m') return 25;
    return 15;
  };

  const maxSets = getMaxSets();
  
  const getModeInfo = () => {
    switch(mode) {
      case 'FULL': return { title: 'Mock Exam', icon: <PlayCircle className="w-5 h-5"/>, color: 'text-indigo-600' };
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
              {isPremium ? `${plan.toUpperCase()} Plan • Select Round` : "Free Demo • 15 Rounds"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24 hide-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: maxSets }, (_, i) => {
            const setNum = i + 1;

            return (
              <button
                key={setNum}
                onClick={() => onSelect(setNum)}
                className="group relative aspect-square rounded-[2.5rem] border-2 border-white bg-white shadow-sm hover:border-indigo-600 hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center p-4"
              >
                <div className="text-4xl font-black mb-1 text-indigo-950 group-hover:scale-110 transition-transform">
                  {setNum}
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Round</div>
              </button>
            );
          })}
        </div>
        

      </div>
    </div>
  );
};
