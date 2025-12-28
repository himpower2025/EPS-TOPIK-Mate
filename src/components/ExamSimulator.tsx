
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImageForQuestion } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles, Play } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ExamSimulatorProps {
  mode: ExamMode;
  setNumber: number;
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
  isPremium?: boolean;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ 
  mode,
  setNumber,
  onComplete, 
  onExit, 
  isPremium = false 
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 25 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentAiImage, setCurrentAiImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const generated = await generateQuestionsBySet(mode, setNumber, isPremium); 
        setQuestions(generated);
      } catch (err) {
        console.error("Fetch questions failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [mode, setNumber, isPremium]);

  const initAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setAudioContextReady(true);
    } catch (e) {
      setAudioContextReady(true);
    }
  };

  useEffect(() => {
    if (questions.length === 0 || loading) return;
    
    const currentQ = questions[currentIndex];
    setCurrentAiImage(null);

    if (currentQ.type === QuestionType.READING && currentQ.context && !currentQ.context.startsWith('http')) {
      setIsGeneratingImage(true);
      generateImageForQuestion(currentQ.context).then(img => {
        setCurrentAiImage(img);
        setIsGeneratingImage(false);
      });
    }

    if (currentQ.type === QuestionType.LISTENING && audioContextReady) {
      handlePlayAudio();
    }
  }, [currentIndex, questions, audioContextReady, loading]);

  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  const handlePlayAudio = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion?.context || isPlaying) return;

    if (currentAudioSource.current) {
      try { currentAudioSource.current.stop(); } catch(e) {}
    }

    setLoadingAudio(true);
    try {
      const buffer = await generateSpeech(currentQuestion.context);
      if (buffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        currentAudioSource.current = source;
        setIsPlaying(true);
        source.onended = () => {
          setIsPlaying(false);
          setLoadingAudio(false);
        };
      } else {
        setLoadingAudio(false);
      }
    } catch (e) {
      setIsPlaying(false);
      setLoadingAudio(false);
    }
  };

  const handleAnswer = (idx: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: idx }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => { if (answers[q.id] === q.correctAnswer) correctCount++; });
    onComplete({
      id: Date.now().toString(),
      mode,
      setNumber,
      questions,
      userAnswers: answers,
      score: correctCount,
      completedAt: new Date().toISOString()
    });
  };

  if (loading) return <LoadingSpinner message={`Generating Set ${setNumber}...`} />;

  if (!audioContextReady && (mode === 'LISTENING' || mode === 'FULL')) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 text-center pt-safe">
        <Headphones className="w-20 h-20 mb-6 text-indigo-300 animate-bounce" />
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Round {setNumber} Ready</h2>
        <p className="mb-10 opacity-70 font-medium tracking-tight">Syncing native Korean audio engine for your success.</p>
        <button onClick={initAudio} className="bg-white text-indigo-900 px-12 py-5 rounded-2xl font-black text-xl shadow-2xl active:scale-95 flex items-center gap-3">
          <Play className="w-6 h-6 fill-current" /> START EXAM
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans">
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600"><Menu className="w-6 h-6" /></button>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Round {setNumber} • {mode}</span>
                  <span className="text-sm font-bold uppercase">Question {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-mono font-bold text-gray-700">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40">
         <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentQ.type === QuestionType.LISTENING ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {currentQ.type === QuestionType.LISTENING ? <Headphones className="w-3 h-3"/> : "Aa"}
                        {currentQ.type}
                    </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-relaxed selectable">
                  <span className="text-indigo-600 mr-2">Q{currentIndex + 1}.</span>
                  {currentQ.questionText}
                </h2>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden min-h-[280px] flex items-center justify-center relative bg-gray-50/50 shadow-inner">
                {isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">AI Sketching...</span>
                  </div>
                ) : currentAiImage ? (
                  <img src={currentAiImage} className="max-h-[350px] object-contain w-full p-6 animate-fade-in" />
                ) : currentQ.context && currentQ.context.startsWith('http') ? (
                  <img src={currentQ.context} className="max-h-[350px] object-contain w-full p-6" />
                ) : currentQ.type === QuestionType.LISTENING ? (
                   <button onClick={handlePlayAudio} className="w-full h-full flex flex-col items-center justify-center gap-4 py-12">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${isPlaying ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 border'}`}>
                        {loadingAudio ? <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-12 h-12" />}
                      </div>
                      <span className="font-bold text-indigo-900 uppercase text-xs tracking-widest">{isPlaying ? "Listening Now..." : "Play Audio"}</span>
                   </button>
                ) : currentQ.context ? (
                   <div className="p-10 text-xl font-serif leading-loose text-gray-800 bg-white w-full border border-gray-100 rounded-xl selectable whitespace-pre-wrap">{currentQ.context}</div>
                ) : <span className="text-gray-300 font-black uppercase tracking-widest text-[10px]">No Reference Image</span>}
            </div>

            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full p-6 rounded-2xl text-left transition-all flex items-center gap-4 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'border-gray-100 bg-white text-gray-700'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                          <span className="text-base font-bold">{option}</span>
                          {isSelected && <CheckCircle className="ml-auto w-6 h-6 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-6 pb-safe flex gap-4 max-w-2xl mx-auto z-20">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
            disabled={currentIndex === 0} 
            className="px-6 py-5 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          {isLast ? (
             <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 active:scale-95 text-lg uppercase tracking-tight">Submit Round</button>
          ) : (
             <button onClick={handleNext} className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 text-lg uppercase tracking-tight">Next Question</button>
          )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><span className="font-black text-lg uppercase tracking-tight">Question Map</span><button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3 content-start">
               {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} className={`aspect-square rounded-xl font-black text-xs border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>{idx + 1}</button>
               ))}
            </div>
            <div className="p-6 border-t border-gray-100 text-center">
              <button onClick={onExit} className="w-full py-4 text-red-500 font-bold border border-red-100 rounded-2xl uppercase tracking-widest text-xs">Exit Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
