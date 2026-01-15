import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode, PlanType } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImage } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles, Play, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ExamSimulatorProps {
  mode: ExamMode;
  setNumber: number;
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
  plan: PlanType;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ 
  mode,
  setNumber,
  onComplete, 
  onExit, 
  plan
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 25 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
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
        const data = await generateQuestionsBySet(mode, setNumber, plan);
        setQuestions(data);
      } catch (err) {
        alert("Failed to load exam.");
        onExit();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, setNumber, plan, onExit]);

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
    setQuestionImage(null);
    setOptionImages([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const generateVisuals = async () => {
      setIsGeneratingVisuals(true);
      if (q.imagePrompt) {
        const img = await generateImage(q.imagePrompt);
        setQuestionImage(img);
      } else if (q.context?.startsWith('http')) {
        setQuestionImage(q.context);
      }
      if (q.optionImagePrompts && q.optionImagePrompts.length > 0) {
        const imgs = await Promise.all(q.optionImagePrompts.map(p => generateImage(p)));
        setOptionImages(imgs);
      }
      setIsGeneratingVisuals(false);
    };

    generateVisuals();

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
    let audioText = isSpokenOptionsType 
      ? `${q.questionText}. 1번 ${q.options[0]}. 2번 ${q.options[1]}. 3번 ${q.options[2]}. 4번 ${q.options[3]}.`
      : q.context || q.questionText;

    if (!audioText || isPlaying) return;
    if (currentAudioSource.current) { try { currentAudioSource.current.stop(); } catch {} }
    
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

  if (loading) return <div className="h-full flex items-center justify-center p-12 bg-white"><LoadingSpinner message={`Preparing Round ${setNumber} with AI...`} /></div>;

  if (!audioContextReady && mode !== 'READING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 text-center pt-safe">
        <Headphones className="w-24 h-24 mb-6 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4 uppercase">Round {setNumber}</h2>
        <button onClick={initAudio} className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 flex items-center gap-3"><Play className="w-6 h-6 fill-current" /> START SESSION</button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 pb-40">
         <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isListening ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {isListening ? <Headphones className="w-3 h-3"/> : "Aa"}
                        {currentQ.type}
                    </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug"><span className="text-indigo-600 mr-2">{currentIndex + 1}.</span>{currentQ.questionText}</h2>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 overflow-hidden relative shadow-sm min-h-[200px] flex flex-col items-center justify-center p-6">
                {isGeneratingVisuals ? (
                  <div className="flex flex-col items-center gap-2 py-12 animate-pulse text-center">
                    <Sparkles className="w-12 h-12 text-indigo-400 mb-2" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">AI Drawing...</span>
                  </div>
                ) : (
                  <>
                    {questionImage && <img src={questionImage} className="max-h-[400px] object-contain w-full rounded-2xl animate-fade-in mb-4" alt="Visual" />}
                    {!isListening && currentQ.context && !questionImage && <div className="p-4 text-lg md:text-xl font-serif leading-loose text-gray-800 bg-indigo-50/20 rounded-2xl w-full whitespace-pre-wrap">{currentQ.context}</div>}
                    {isListening && (
                      <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <button onClick={handlePlayAudio} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all ${isPlaying ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                          {loadingAudio ? <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-12 h-12" />}
                        </button>
                      </div>
                    )}
                  </>
                )}
            </div>

            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full p-5 md:p-6 rounded-[2rem] text-left transition-all flex items-center gap-4 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-100 bg-white text-gray-700'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                          <span className="text-base md:text-lg font-bold">{option}</span>
                          {isSelected && <CheckCircle className="ml-auto w-6 h-6 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-6 pb-safe flex gap-4 max-w-2xl mx-auto z-40">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-6 py-5 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200"><ChevronLeft className="w-7 h-7" /></button>
          <button onClick={isLast ? handleSubmit : () => setCurrentIndex(p => p + 1)} className={`flex-1 ${isLast ? 'bg-green-600' : 'bg-indigo-600'} text-white font-black rounded-2xl shadow-xl active:scale-95 text-lg uppercase`}>{isLast ? 'Finish' : 'Next'} <ChevronRight className="inline w-5 h-5 ml-2"/></button>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center font-black">Question List<button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3">
               {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} className={`aspect-square rounded-xl font-black text-xs border-2 flex items-center justify-center ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>{idx + 1}</button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
