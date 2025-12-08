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
  
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
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
    <div className="flex flex-col items-center justify-center h-[100dvh] p-8 text-center space-y-4">
      <AlertCircle className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-bold">Connection Error</h2>
      <p className="text-gray-600">{error}</p>
      <button onClick={onExit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Exit</button>
    </div>
  );

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    // [OPTIMIZATION] Use 100dvh to prevent address bar overlap on mobile
    <div className="flex flex-col h-[100dvh] bg-gray-100 text-gray-900 font-sans overflow-hidden">
      
      {/* 1. Header (Fixed) */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center z-30 shadow-sm shrink-0 h-16 safe-area-pt">
        <div className="flex items-center gap-3">
          {/* Menu button visible on mobile and tablet */}
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600 lg:hidden hover:bg-gray-100 rounded-lg transition-colors touch-manipulation">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
             <span className="text-[10px] md:text-xs font-bold text-indigo-600 uppercase tracking-wider">EPS-TOPIK</span>
             <span className="text-sm md:text-base font-bold text-gray-900">Question {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
           <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
           <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* 2. Main Layout - Scrolling area */}
      <div 
        ref={mobileScrollRef}
        className="flex-1 overflow-y-auto lg:overflow-hidden relative flex flex-col lg:flex-row bg-gray-100 scroll-smooth"
      >
        
        {/* Left Pane (Question Context) */}
        {/* Mobile: Full width. Desktop (lg): 50% width, independent scroll */}
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-gray-200">
           <div className="p-5 md:p-8 lg:p-10 max-w-3xl mx-auto min-h-full flex flex-col justify-start lg:justify-center">
              
              <div className="mb-4">
                 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${currentQ.type === QuestionType.LISTENING ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {currentQ.type === QuestionType.LISTENING ? <Headphones className="w-3 h-3"/> : <span className="text-[10px] font-serif">Aa</span>}
                    {currentQ.type} Question
                 </span>
              </div>
              
              <div className="bg-white rounded-xl mb-6">
                 <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                   {currentQ.questionText}
                 </h2>
              </div>

              {/* Context Area (Image/Text/Audio) */}
              <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-2 overflow-hidden shadow-inner flex flex-col justify-center min-h-[180px]">
                <div className="bg-white rounded-xl w-full h-full p-6 flex flex-col items-center justify-center text-center shadow-sm">
                  {currentQ.type === QuestionType.READING && currentQ.context && (
                     isImageUrl(currentQ.context) ? (
                       <div className="w-full h-auto flex justify-center bg-gray-100/50 rounded-lg p-2">
                         <img 
                            src={currentQ.context} 
                            alt="Context" 
                            className="max-w-full h-auto max-h-[35vh] lg:max-h-[400px] object-contain rounded-lg shadow-sm" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Load+Error';
                            }}
                          />
                       </div>
                     ) : (
                       <div className="w-full text-left bg-orange-50/50 p-6 rounded-xl border border-orange-100">
                         <p className="text-lg md:text-xl text-gray-800 whitespace-pre-wrap leading-loose font-medium font-serif">
                           {currentQ.context}
                         </p>
                       </div>
                     )
                  )}

                  {currentQ.type === QuestionType.LISTENING && (
                     <button
                      onClick={handlePlayAudio}
                      disabled={loadingAudio || isPlaying}
                      className={`w-full py-8 md:py-12 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group active:scale-95 touch-manipulation ${isPlaying ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200 hover:border-indigo-400 hover:bg-gray-50'}`}
                     >
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-md transition-all ${isPlaying ? 'bg-indigo-600 text-white animate-pulse scale-110' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                          {loadingAudio ? <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin"/> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />}
                        </div>
                        <span className="font-bold text-lg text-indigo-900 group-hover:text-indigo-700">{isPlaying ? 'Playing...' : 'Tap to Listen'}</span>
                     </button>
                  )}
                  {!currentQ.context && (
                     <span className="text-gray-400 text-sm italic">No context needed.</span>
                  )}
                </div>
              </div>
           </div>
        </div>

        {/* Right Pane (Options) */}
        {/* Mobile: Added pb-28 to allow scrolling past fixed bottom bar */}
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto bg-gray-50/50">
           <div className="p-5 md:p-8 lg:p-10 max-w-3xl mx-auto pb-32 lg:pb-12 min-h-full flex flex-col justify-start lg:justify-center">
              <div className="flex flex-col gap-3 md:gap-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Select Answer</h3>
                 {currentQ.options.map((option, idx) => {
                   const isSelected = answers[currentQ.id] === idx;
                   return (
                     <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={`
                          relative w-full p-4 md:p-6 rounded-2xl text-left transition-all duration-200 flex items-start gap-4 md:gap-5 shadow-sm group border touch-manipulation
                          ${isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' 
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-white hover:shadow-md active:bg-gray-50'}
                        `}
                     >
                        <div className={`
                          w-8 h-8 md:w-9 md:h-9 mt-0.5 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors border
                          ${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-gray-50 text-gray-500 border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:text-indigo-600'}
                        `}>
                          {idx + 1}
                        </div>
                        <span className="text-lg md:text-xl font-medium leading-snug pt-0.5 break-words w-full">{option}</span>
                        {isSelected && <CheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-200" />}
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>

      </div>

      {/* 3. Mobile Navigation Bar (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 lg:hidden z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-pb">
         <div className="flex gap-3 max-w-lg mx-auto">
            <button 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200 transition-colors touch-manipulation"
              aria-label="Previous Question"
            >
               <ChevronLeft className="w-6 h-6" />
            </button>
            
            {isLast ? (
               <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2 py-4 text-lg touch-manipulation">
                 Submit <CheckCircle className="w-5 h-5" />
               </button>
            ) : (
               <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 py-4 text-lg touch-manipulation">
                 Next <ChevronRight className="w-5 h-5" />
               </button>
            )}
         </div>
      </div>

      {/* Desktop Navigation (Floating Bottom Right) */}
      <div className="hidden lg:flex absolute bottom-10 right-10 gap-4 z-20">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-8 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 shadow-md transition-all text-lg"
          >
             Previous
          </button>
          {isLast ? (
             <button onClick={handleSubmit} className="px-10 py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-xl shadow-green-200 transform hover:-translate-y-1 transition-all text-lg flex items-center gap-2">
               Finish Exam <CheckCircle className="w-6 h-6" />
             </button>
          ) : (
             <button onClick={() => setCurrentIndex(prev => prev + 1)} className="px-10 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transform hover:-translate-y-1 transition-all flex items-center gap-2 text-lg">
               Next <ChevronRight className="w-6 h-6" />
             </button>
          )}
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 safe-area-pt">
               <span className="font-bold text-lg text-gray-900">Question List</span>
               <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-4 gap-3 content-start">
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
                      className={`aspect-square rounded-xl font-bold text-lg border-2 flex items-center justify-center transition-all shadow-sm touch-manipulation
                        ${isActive ? 'border-indigo-600 bg-indigo-600 text-white scale-110' : 
                          isDone ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-400 hover:border-indigo-300'}
                      `}
                    >
                      {idx + 1}
                    </button>
                  )
               })}
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 safe-area-pb">
               <button onClick={onExit} className="w-full py-4 rounded-xl border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 hover:border-red-200 transition-colors text-lg">Exit Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};