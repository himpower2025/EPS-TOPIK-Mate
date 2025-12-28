
import React from 'react';
import { ExamMode } from '../types';
import { ChevronLeft, Lock, Star } from 'lucide-react';

interface SetSelectorProps {
  mode: ExamMode;
  onSelect: (setNumber: number) => void;
  onBack: () => void;
  isPremium: boolean;
}

export const SetSelector: React.FC<SetSelectorProps> = ({ mode, onSelect, onBack, isPremium }) => {
  const maxSets = mode === 'FULL' ? 40 : 30;
  
  const getModeTitle = () => {
    switch(mode) {
      case 'FULL': return 'Full Mock Exam';
      case 'READING': return 'Reading Lab';
      case 'LISTENING': return 'Listening Lab';
    }
  };

  const getModeDesc = () => {
    switch(mode) {
      case 'FULL': return '40 Questions (20 Reading + 20 Listening)';
      case 'READING': return '20 Intensive Reading Questions';
      case 'LISTENING': return '20 Intensive Listening Questions';
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
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{getModeDesc()}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: maxSets }, (_, i) => {
              const setNum = i + 1;
              const isLocked = !isPremium && setNum > 1;
              
              return (
                <button
                  key={setNum}
                  disabled={isLocked}
                  onClick={() => onSelect(setNum)}
                  className={`relative group aspect-square rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center p-4 ${isLocked ? 'bg-gray-100 border-gray-200 grayscale opacity-60' : 'bg-white border-white shadow-sm hover:border-indigo-600 hover:shadow-xl active:scale-95'}`}
                >
                  <div className={`text-3xl font-black mb-1 ${isLocked ? 'text-gray-400' : 'text-indigo-900'}`}>
                    {setNum}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Round</div>
                  
                  {isLocked ? (
                    <div className="absolute top-4 right-4 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    setNum === 1 && !isPremium && (
                      <div className="absolute top-4 right-4 text-green-500">
                        <div className="text-[8px] font-black bg-green-100 px-2 py-0.5 rounded-full">FREE</div>
                      </div>
                    )
                  )}

                  {!isLocked && (
                    <div className="absolute inset-0 bg-indigo-600 rounded-[2rem] opacity-0 group-hover:opacity-10 transition-opacity" />
                  )}
                </button>
              );
            })}
          </div>

          {!isPremium && (
            <div className="mt-12 bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <Star className="w-10 h-10 text-yellow-400 fill-current mb-4" />
                <h3 className="text-2xl font-black mb-2 tracking-tight">Unlock all {maxSets} Rounds</h3>
                <p className="text-indigo-200 text-sm font-medium mb-6 opacity-80 max-w-xs">
                  Premium members get unlimited access to all practice sets and AI-generated infinite mock exams.
                </p>
                <button className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-transform active:scale-95">
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
