import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession } from '../types';
import { generateQuestions, generateSpeech } from '../services/geminiService';
import { Play, CheckCircle, AlertCircle, Clock, Menu, X, ChevronRight, ChevronLeft, Headphones } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner'; // Changed to default import

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
    <div className="flex flex-col h-full bg-gray-100 text-gray-900 font-sans">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600 lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
             <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">EPS-TOPIK Test</span>
             <span className="text-sm font-bold text-gray-900">Question {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
           <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
           <span className={`font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div 
        ref={mobileScrollRef}
        className="flex-1 overflow-y-auto lg:overflow-hidden relative flex flex-col lg:flex-row bg-gray-100 scroll-smooth"
      >
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-gray-200">
           <div className="p-5 lg:p-8 max-w-2xl mx-auto">
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
              <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-1 overflow-hidden shadow-inner min-h-[160px] flex flex-col justify-center">
                <div className="bg-white rounded-xl w-full h-full p-4 flex flex-col items-center justify-center text-center">
                  {currentQ.type === QuestionType.READING && currentQ.context && (
                     isImageUrl(currentQ.context) ? (
                       <div className="w-full h-auto">
                         <img 
                            src={currentQ.context} 
                            alt="Question Context" 
                            className="w-full h-auto max-h-[400px] object-contain rounded-lg mx-auto" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Load+Error';
                            }}
                          />
                       </div>
                     ) : (
                       <div className="w-full text-left bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                         <p className="text-lg text-gray-800 whitespace-pre-wrap leading-loose font-medium font-serif">
                           {currentQ.context}
                         </p>
                       </div>
                     )
                  )}

                  {currentQ.type === QuestionType.LISTENING && (
                     <button
                      onClick={handlePlayAudio}
                      disabled={loadingAudio || isPlaying}
                      className={`w-full py-8 rounded-xl flex flex-col items-center justify-center gap-3 transition-all ${isPlaying ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200 hover:border-indigo-400 hover:bg-gray-50'}`}
                     >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${isPlaying ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
                          {loadingAudio ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </div>
                        <span className="font-bold text-indigo-900">{isPlaying ? 'Playing Audio...' : 'Tap to Listen'}</span>
                     </button>
                  )}
                  {!currentQ.context && (
                     <span className="text-gray-400 text-sm">No image or text provided.</span>
                  )}
                </div>
              </div>
           </div>
        </div>

        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto bg-gray-50/50">
           <div className="p-5 lg:p-8 max-w-2xl mx-auto pb-32 lg:pb-8">
              <div className="flex flex-col gap-3">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Select Answer</h3>
                 {currentQ.options.map((option, idx) => {
                   const isSelected = answers[currentQ.id] === idx;
                   return (
                     <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={`
                          relative w-full p-4 md:p-5 rounded-xl text-left transition-all duration-200 flex items-start gap-4 shadow-sm group border
                          ${isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 ring-1 ring-indigo-600' 
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-white'}
                        `}
                     >
                        <div className={`
                          w-7 h-7 mt-0.5 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors border
                          ${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-gray-50 text-gray-500 border-gray-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:text-indigo-600'}
                        `}>
                          {idx + 1}
                        </div>
                        <span className="text-base md:text-lg font-medium leading-snug pt-0.5 break-words w-full">{option}</span>
                        {isSelected && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />}
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex gap-3 max-w-lg mx-auto">
            <button 
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-30 font-medium active:bg-gray-200"
            >
               <ChevronLeft className="w-6 h-6" />
            </button>
            
            {isLast ? (
               <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2 py-3">
                 Submit <CheckCircle className="w-5 h-5" />
               </button>
            ) : (
               <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 py-3">
                 Next <ChevronRight className="w-5 h-5" />
               </button>
            )}
         </div>
      </div>

      <div className="hidden lg:flex absolute bottom-8 right-8 gap-4 z-20">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
             Previous
          </button>
          {isLast ? (
             <button onClick={handleSubmit} className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transform hover:-translate-y-1 transition-all">
               Finish Exam
             </button>
          ) : (
             <button onClick={() => setCurrentIndex(prev => prev + 1)} className="px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 shadow-lg transform hover:-translate-y-1 transition-all flex items-center gap-2">
               Next <ChevronRight className="w-4 h-4" />
             </button>
          )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-64 bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <span className="font-bold text-gray-900">Question List</span>
               <button onClick={() => setIsDrawerOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-2 content-start">
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
                        ${isActive ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 
                          isDone ? 'border-gray-200 bg-gray-100 text-gray-600' : 'border-gray-100 bg-white text-gray-400'}
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