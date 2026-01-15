
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImage } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles, Play, ChevronRight } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 30 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Visual Generation States
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [optionImages, setOptionImages] = useState<(string | null)[]>([]);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  
  const [audioContextReady, setAudioContextReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await generateQuestionsBySet(mode, setNumber, isPremium);
        setQuestions(data);
      } catch (err) {
        alert("Failed to load exam.");
        onExit();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, setNumber, isPremium, onExit]);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setAudioContextReady(true);
  };

  useEffect(() => {
    if (questions.length === 0 || loading) return;
    const q = questions[currentIndex];
    
    // Clear previous visuals
    setQuestionImage(null);
    setOptionImages([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const generateVisuals = async () => {
      setIsGeneratingVisuals(true);
      
      // 1. Generate Main Context Image
      if (q.imagePrompt) {
        const img = await generateImage(q.imagePrompt);
        setQuestionImage(img);
      } else if (q.context?.startsWith('http')) {
        setQuestionImage(q.context);
      }

      // 2. Generate Option Images if needed
      if (q.optionImagePrompts && q.optionImagePrompts.length > 0) {
        const imgs = await Promise.all(q.optionImagePrompts.map(p => generateImage(p)));
        setOptionImages(imgs);
      }

      setIsGeneratingVisuals(false);
    };

    generateVisuals();

    // Auto-play Listening
    if (q.type === QuestionType.LISTENING && audioContextReady) {
      handlePlayAudio();
    }
  }, [currentIndex, questions, audioContextReady, loading]);

  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  const handlePlayAudio = async () => {
    const q = questions[currentIndex];
    const isSpokenOptionsType = q.category.includes("그림") || q.questionText.includes("무엇입니까");
    
    let audioText = "";
    if (isSpokenOptionsType) {
      audioText = `${q.questionText}. 1번 ${q.options[0]}. 2번 ${q.options[1]}. 3번 ${q.options[2]}. 4번 ${q.options[3]}.`;
    } else {
      audioText = q.context || q.questionText;
    }

    if (!audioText || isPlaying) return;
    if (currentAudioSource.current) {
       try { currentAudioSource.current.stop(); } catch {}
    }
    setLoadingAudio(true);
    try {
      const buffer = await generateSpeech(audioText);
      if (buffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        currentAudioSource.current = source;
        setIsPlaying(true);
        source.onended = () => { setIsPlaying(false); setLoadingAudio(false); };
      }
    } catch { setIsPlaying(false); setLoadingAudio(false); }
  };

  const handleAnswer = (idx: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: idx }));
  };

  const handleSubmit = () => {
    let score = 0;
    questions.forEach(q => { if(answers[q.id] === q.correctAnswer) score++; });
    onComplete({ id: Date.now().toString(), mode, setNumber, questions, userAnswers: answers, score, completedAt: new Date().toISOString() });
  };

  if (loading) return <div className="h-full flex items-center justify-center p-12 text-center bg-white"><LoadingSpinner message={`AI Examiners are creating unique Round ${setNumber} questions...`} /></div>;

  if (!audioContextReady && mode !== 'READING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 text-center pt-safe">
        <Headphones className="w-24 h-24 mb-6 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Round {setNumber}</h2>
        <p className="mb-10 opacity-70 font-bold max-w-[280px]">Please enable your speakers for the listening part.</p>
        <button onClick={initAudio} className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 flex items-center gap-3">
          <Play className="w-6 h-6 fill-current" /> Enter Simulator
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;
  const isImageOptions = optionImages.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600"><Menu className="w-6 h-6" /></button>
              <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">SET {setNumber}</span>
                  <span className="text-sm font-bold uppercase">Q {currentIndex + 1} <span className="text-gray-400 font-normal">/ {questions.length}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-bold text-indigo-700">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 selectable">
         <div className="max-w-2xl mx-auto space-y-6">
            
            {/* 1. Question Card */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isListening ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {isListening ? <Headphones className="w-3 h-3"/> : "Aa"}
                        {currentQ.type}
                    </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
                  <span className="text-indigo-600 mr-2">{currentIndex + 1}.</span>
                  {currentQ.questionText}
                </h2>
            </div>

            {/* 2. Visual / Context Area */}
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 overflow-hidden relative shadow-sm min-h-[200px] flex flex-col items-center justify-center p-6">
                
                {isGeneratingVisuals ? (
                  <div className="flex flex-col items-center gap-2 py-12 animate-pulse text-center">
                    <Sparkles className="w-12 h-12 text-indigo-400 mb-2" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">AI is sketching the exam materials...</span>
                  </div>
                ) : (
                  <>
                    {/* Main Image for Context (Signs, Charts, IDs) */}
                    {questionImage && (
                      <div className="w-full flex flex-col items-center">
                        <img src={questionImage} className="max-h-[400px] object-contain w-full rounded-2xl animate-fade-in shadow-md mb-4 bg-white" alt="Exam Visual" />
                      </div>
                    )}

                    {/* Passage text (if no image) */}
                    {!isListening && currentQ.context && !questionImage && (
                      <div className="p-4 text-lg md:text-xl font-serif leading-loose text-gray-800 bg-indigo-50/20 rounded-2xl w-full whitespace-pre-wrap">{currentQ.context}</div>
                    )}

                    {/* Listening Controls */}
                    {isListening && (
                      <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <button onClick={handlePlayAudio} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isPlaying ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 border border-indigo-100 hover:scale-105'}`}>
                          {loadingAudio ? <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-12 h-12" />}
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">{isPlaying ? "Now Playing..." : "Tap to Listen"}</span>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* 3. Answer Options */}
            {isImageOptions ? (
              <div className="grid grid-cols-2 gap-4">
                {optionImages.map((img, idx) => {
                  const isSelected = answers[currentQ.id] === idx;
                  return (
                    <button key={idx} onClick={() => handleAnswer(idx)} className={`relative aspect-square rounded-[2.5rem] overflow-hidden border-4 transition-all shadow-sm active:scale-95 ${isSelected ? 'border-indigo-600 bg-white ring-8 ring-indigo-50 shadow-xl' : 'border-white bg-white hover:border-indigo-100'}`}>
                       {img ? (
                         <img src={img} className="w-full h-full object-cover p-2" alt={`Choice ${idx + 1}`} />
                       ) : (
                         <div className="w-full h-full bg-gray-50 flex items-center justify-center animate-pulse"><Sparkles className="w-6 h-6 text-gray-200" /></div>
                       )}
                       <div className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-500'}`}>{idx + 1}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                      const isSelected = answers[currentQ.id] === idx;
                      // Special pattern: Hide text if listening question requires choosing from spoken options
                      const isOptionSpokenOnly = isListening && (currentQ.category.includes("그림") || currentQ.questionText.includes("무엇입니까"));
                      const displayOption = isOptionSpokenOnly ? `보기 ${idx + 1}` : option;

                      return (
                          <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full p-5 md:p-6 rounded-[2rem] text-left transition-all flex items-center gap-4 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'border-gray-100 bg-white text-gray-700 hover:border-indigo-200'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                            <span className="text-base md:text-lg font-bold">{displayOption}</span>
                            {isSelected && <CheckCircle className="ml-auto w-6 h-6 text-indigo-200" />}
                          </button>
                      );
                  })}
              </div>
            )}
         </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-6 pb-safe flex gap-4 max-w-2xl mx-auto z-40">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-6 py-5 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200"><ChevronLeft className="w-7 h-7" /></button>
          {isLast ? (
             <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-lg uppercase tracking-tight">Finish Exam</button>
          ) : (
             <button onClick={() => setCurrentIndex(p => p + 1)} className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-lg uppercase tracking-tight flex items-center justify-center gap-2">Next Question <ChevronRight className="w-5 h-5"/></button>
          )}
      </div>

      {/* Question Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center font-black text-lg uppercase tracking-widest">Question List<button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3">
               {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} className={`aspect-square rounded-xl font-black text-xs border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>{idx + 1}</button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
