import React from 'react';
import { PlayCircle, ShieldCheck, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <nav className="flex items-center justify-between px-6 py-5 sticky top-0 bg-white/90 backdrop-blur-xl z-20 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute top-0 left-0 bg-indigo-600 rounded-tl-lg rounded-tr-lg rounded-bl-lg text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center border-2 border-white z-10 shadow-sm">
              가
            </div>
            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-tr-lg rounded-br-lg rounded-bl-lg text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm">
              A
            </div>
          </div>
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">EPS-TOPIK <span className="text-indigo-600">Mate</span></span>
        </div>
        <button 
          onClick={onLoginClick}
          className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200"
        >
          Sign In
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20 bg-gradient-to-b from-white to-indigo-50/50">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Your AI Exam Partner
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-[1.1] tracking-tight">
          Your Mate for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Korean Success.
          </span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-md mx-auto leading-relaxed font-medium">
          Practice reading and listening with your AI study partner. 
          Anytime, anywhere, unlimited.
        </p>
        <div className="w-full max-w-sm relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
           <button 
            onClick={onLoginClick}
            className="relative w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold py-5 px-8 rounded-2xl shadow-xl shadow-indigo-200 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
          >
            Start Practice
            <ArrowRight className="w-5 h-5 text-indigo-100" />
          </button>
        </div>
        <div className="mt-16 w-full max-w-4xl relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-200/20 rounded-full blur-3xl -z-10"></div>
          <div className="bg-white border-4 border-indigo-600 rounded-[2.5rem] p-2 shadow-2xl mx-4">
             <div className="bg-gray-50 rounded-[2rem] overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative">
                <div className="absolute inset-0 grid grid-cols-2 gap-4 p-8 opacity-50">
                   <div className="bg-white rounded-xl shadow-sm h-full w-full"></div>
                   <div className="space-y-4">
                      <div className="bg-indigo-100 h-8 rounded-lg w-3/4"></div>
                      <div className="bg-white h-24 rounded-lg shadow-sm"></div>
                      <div className="bg-white h-24 rounded-lg shadow-sm"></div>
                   </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-lg z-10 flex flex-col items-center">
                   <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                   <span className="font-bold text-gray-900">180 / 200</span>
                   <span className="text-xs text-gray-500">Excellent!</span>
                </div>
             </div>
          </div>
        </div>
      </div>
      <div className="py-10 border-t border-gray-100 bg-white">
        <div className="flex overflow-x-auto gap-4 px-6 pb-4 snap-x hide-scrollbar max-w-6xl mx-auto md:justify-center">
          <div className="snap-center shrink-0 w-64 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Infinite Exams</h3>
            <p className="text-xs text-gray-500 mt-1">AI generates unique questions every time you play.</p>
          </div>
          <div className="snap-center shrink-0 w-64 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-3">
              <PlayCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Real Voice TTS</h3>
            <p className="text-xs text-gray-500 mt-1">Practice listening with native-level AI speakers.</p>
          </div>
          <div className="snap-center shrink-0 w-64 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Smart Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">Detailed feedback on your weak points instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
