
import React from 'react';
import { PlayCircle, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* 모바일/태블릿 최적화 내비게이션 바 */}
      <nav className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-xl z-20 border-b border-gray-100 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute top-0 left-0 bg-indigo-600 rounded-lg text-white text-[11px] font-black w-7 h-7 flex items-center justify-center border-2 border-white z-10 shadow-sm">가</div>
            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-lg text-white text-[11px] font-black w-7 h-7 flex items-center justify-center border-2 border-white shadow-sm">A</div>
          </div>
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">EPS <span className="text-indigo-600">Mate</span></span>
        </div>
        <button 
          onClick={onLoginClick}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
        >
          Sign In
        </button>
      </nav>

      {/* 히어로 섹션 */}
      <div className="flex-1 flex flex-col px-6 pt-12 pb-safe max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-black mb-8 shadow-sm uppercase tracking-widest">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
             </span>
             AI Exam Partner
           </div>
           
           <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-[1.1] tracking-tight">
             Master the <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
               EPS-TOPIK
             </span>
           </h1>
           
           <p className="text-gray-500 mb-10 max-w-md mx-auto text-base md:text-xl leading-relaxed font-medium">
             Unlimited practice exams, AI listening conversations, and instant score analysis.
           </p>

           <div className="w-full max-w-sm mx-auto group">
             <button 
               onClick={onLoginClick}
               className="w-full bg-indigo-600 text-white text-xl font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
             >
               Start Learning
               <ArrowRight className="w-6 h-6 text-indigo-200" />
             </button>
           </div>
        </div>

        {/* 기능 미리보기 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
           {[
             { icon: <Zap className="w-5 h-5" />, title: "Infinite Exams", desc: "Unique AI questions daily." },
             { icon: <PlayCircle className="w-5 h-5" />, title: "Dual Voice TTS", desc: "Natural Korean speakers." },
             { icon: <ShieldCheck className="w-5 h-5" />, title: "Skill Analysis", desc: "Track weak categories." }
           ].map((f, i) => (
             <div key={i} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4">
                  {f.icon}
                </div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">{f.title}</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">{f.desc}</p>
             </div>
           ))}
        </div>
      </div>
      <div className="text-center py-8 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] border-t border-gray-50 shrink-0">
        © EPS Mate • Global Standard
      </div>
    </div>
  );
};
