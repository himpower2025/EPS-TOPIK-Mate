import React from 'react';
import { PlayCircle, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-xl z-20 border-b border-gray-100 pt-safe">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <div className="absolute top-0 left-0 bg-indigo-600 rounded-md text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-white z-10">가</div>
            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-md text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center border-2 border-white">A</div>
          </div>
          <span className="text-lg font-extrabold text-gray-900 tracking-tight">EPS <span className="text-indigo-600">Mate</span></span>
        </div>
        <button 
          onClick={onLoginClick}
          className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-800 transition-all active:scale-95"
        >
          Sign In
        </button>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-safe">
        
        <div className="text-center mb-8">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold mb-6 shadow-sm">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
             </span>
             AI Exam Partner
           </div>
           
           <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 leading-tight tracking-tight">
             Pass Your <br />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
               EPS-TOPIK
             </span>
           </h1>
           
           <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm md:text-base leading-relaxed">
             Unlimited practice exams, AI listening, and instant score analysis.
           </p>

           <button 
             onClick={onLoginClick}
             className="w-full max-w-xs bg-indigo-600 text-white text-lg font-bold py-4 rounded-xl shadow-xl shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mx-auto"
           >
             Start Practice
             <ArrowRight className="w-5 h-5 text-indigo-200" />
           </button>
        </div>

        {/* Horizontal Scroll Features */}
        <div className="mt-auto mb-8">
           <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Features</p>
           <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
              
              <div className="snap-center shrink-0 w-60 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Infinite Exams</h3>
                <p className="text-xs text-gray-500 mt-1">New questions every time.</p>
              </div>

              <div className="snap-center shrink-0 w-60 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-3">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Real Voice TTS</h3>
                <p className="text-xs text-gray-500 mt-1">Native-level listening practice.</p>
              </div>

              <div className="snap-center shrink-0 w-60 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Smart Analysis</h3>
                <p className="text-xs text-gray-500 mt-1">Track your weak points.</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};