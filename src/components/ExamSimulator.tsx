import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession } from '../types';
import { generateQuestions, generateSpeech } from '../services/geminiService';
import { Play, CheckCircle, AlertCircle, Clock, Menu, X, ChevronRight, ChevronLeft, Headphones } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ExamSimulatorProps {
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ onComplete, onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(50 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const generated = await generateQuestions(12, true); 
        if (generated.length === 0) throw new Error("Failed to generate questions.");
        setQuestions(generated);
      } catch (err) {
        console.error(err);
        setError("Unable to load exam questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (loading || timeLeft <= 0 || error) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, error]);

  // Scroll to top when question changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo(0, 0);
    }
  }, [currentIndex]);

  const handlePlayAudio = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.context) return;
    if (isPlaying) return;

    setLoadingAudio(true);
    try {
      const buffer = await generateSpeech(currentQuestion.context);
      if (buffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        setIsPlaying(true);
        source.onended = () => setIsPlaying(false);
      } else {
        alert("Audio generation failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error playing audio.");
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: optionIndex }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correctCount++;
    });
    const session: ExamSession = {
      id: Date.now().toString(),
      questions,
      userAnswers: answers,
      score: correctCount,
      completedAt: new Date().toISOString()
    };
    onComplete(session);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isImageUrl = (text?: string) => {
    return text && (text.startsWith('http') || text.startsWith('data:image'));
  };

  if (loading) return <LoadingSpinner message="Preparing your Exam..." />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
      <AlertCircle className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-bold">Connection Error</h2>
      <p className="text-gray-600">{error}</p>
      <button onClick={onExit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Exit</button>
    </div>
  );

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
      
      {/* 1. Header (Fixed Top) */}
      <div className="bg-white border-b border-gray-200 z-30 pt-safe shrink-0 shadow-sm">
        <div className="px-4 py-3 flex justify-between items-center h-14">
            <div className="flex items-center gap-3">
            <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-lg">
                <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">EPS-TOPIK</span>
                <span className="text-sm font-bold text-gray-900">Q {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></span>
            </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            <span className={`font-mono font-bold text-sm ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
            </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
      </div>

      {/* 2. Content (Scrollable Middle) */}
      <div ref={contentRef} className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth p-4 pb-28">
         <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Question Text */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${currentQ.type === QuestionType.LISTENING ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {currentQ.type === QuestionType.LISTENING ? <Headphones className="w-3 h-3"/> : "Aa"}
                        {currentQ.type}
                    </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {currentQ.questionText}
                </h2>
            </div>

            {/* Context/Image/Audio */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {currentQ.type === QuestionType.READING && currentQ.context && (
                    isImageUrl(currentQ.context) ? (
                    <div className="w-full bg-gray-50 p-4 flex justify-center">
                        <img 
                        src={currentQ.context} 
                        alt="Context" 
                        className="max-h-[300px] object-contain rounded-lg" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Load+Error'; }}
                        />
                    </div>
                    ) : (
                    <div className="p-6 bg-orange-50/30">
                        <p className="text-base text-gray-800 whitespace-pre-wrap leading-loose font-serif">
                        {currentQ.context}
                        </p>
                    </div>
                    )
                )}

                {currentQ.type === QuestionType.LISTENING && (
                    <div className="p-6 flex justify-center">
                        <button
                        onClick={handlePlayAudio}
                        disabled={loadingAudio || isPlaying}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-indigo-600 text-white animate-pulse scale-105' : 'bg-indigo-100 text-indigo-600 active:scale-95'}`}
                        >
                        {loadingAudio ? <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin"/> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={`
                            w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-4 border shadow-sm active:scale-[0.98]
                            ${isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' 
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}
                        `}
                        >
                        <div className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border
                            ${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-gray-100 text-gray-500 border-gray-200'}
                        `}>
                            {idx + 1}
                        </div>
                        <span className="text-base font-medium leading-snug">{option}</span>
                        {isSelected && <CheckCircle className="ml-auto w-5 h-5 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>

         </div>
      </div>

      {/* 3. Footer (Fixed Bottom) */}
      <div className="bg-white border-t border-gray-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
         <div className="p-4 flex gap-3 max-w-2xl mx-auto">
            <button 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-3.5 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200 transition-colors"
            >
               <ChevronLeft className="w-6 h-6" />
            </button>
            
            {isLast ? (
               <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
                 Submit <CheckCircle className="w-5 h-5" />
               </button>
            ) : (
               <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
                 Next <ChevronRight className="w-5 h-5" />
               </button>
            )}
         </div>
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col pt-safe pb-safe animate-slide-in-right">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
               <span className="font-bold text-lg">Questions</span>
               <button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3 content-start">
               {questions.map((q, idx) => {
                  const isActive = idx === currentIndex;
                  const isDone = answers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsDrawerOpen(false);
                      }}
                      className={`aspect-square rounded-lg font-bold text-sm border-2 flex items-center justify-center transition-all
                        ${isActive ? 'border-indigo-600 bg-indigo-600 text-white' : 
                          isDone ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-400'}
                      `}
                    >
                      {idx + 1}
                    </button>
                  )
               })}
            </div>
            <div className="p-4 border-t border-gray-100">
               <button onClick={onExit} className="w-full py-3 rounded-xl border border-red-100 text-red-600 font-bold hover:bg-red-50">Exit Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};