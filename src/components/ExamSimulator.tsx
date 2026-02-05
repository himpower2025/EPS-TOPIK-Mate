import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode, PlanType } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImage } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ExamSimulatorProps {
  mode: ExamMode;
  setNumber: number;
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
  plan: PlanType;
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ mode, setNumber, onComplete, onExit, plan }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 25 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  
  const [audioContextReady, setAudioContextReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await generateQuestionsBySet(mode, setNumber, plan);
        if (!data || data.length === 0) {
          alert("Could not load exam data. Redirecting...");
          onExit();
          return;
        }
        setQuestions(data);
      } catch (err) {
        console.error("Data load error:", err);
        onExit();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mode, setNumber, plan, onExit]);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const handleVisuals = async () => {
      if (q.imagePrompt) {
        setIsGeneratingVisuals(true);
        const img = await generateImage(q.imagePrompt);
        setQuestionImage(img);
        setIsGeneratingVisuals(false);
      }
    };
    handleVisuals();

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
    const script = q.context || q.questionText;
    if (!script || isPlaying) return;
    
    if (currentAudioSource.current) {
      try { currentAudioSource.current.stop(); } catch {}
    }
    
    setLoadingAudio(true);
    try {
      if (!audioContextRef.current) await initAudio();
      
      const buffer = await generateSpeech(script);
      if (buffer && audioContextRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        currentAudioSource.current = source;
        setIsPlaying(true);
        source.onended = () => { setIsPlaying(false); setLoadingAudio(false); };
      }
    } catch (err) { 
      console.error("Audio error:", err);
      setIsPlaying(false); 
      setLoadingAudio(false); 
    }
  };

  const handleAnswer = (idx: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: idx }));
  };

  const handleSubmit = () => {
    let score = 0;
    questions.forEach(q => { if(answers[q.id] === q.correctAnswer) score++; });
    onComplete({ 
      id: Date.now().toString(), 
      mode, 
      setNumber, 
      questions, 
      userAnswers: answers, 
      score, 
      completedAt: new Date().toISOString() 
    });
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-12 bg-white text-center">
      <LoadingSpinner message="AI is synchronizing with the official DB..." />
      <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-widest animate-pulse">Calculating Difficulty & Generating Content</p>
    </div>
  );

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;

  if (!audioContextReady && isListening) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-950 text-white p-10 text-center pt-safe">
        <Headphones className="w-20 h-20 mb-8 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4 uppercase">Audio Ready</h2>
        <p className="mb-12 text-indigo-200/70 font-medium leading-relaxed">
          Prepare for the listening section. Real voice audio will be provided.
        </p>
        <button 
          onClick={initAudio} 
          className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 uppercase tracking-tighter"
        >
          Begin Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans overflow-hidden">
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-full transition-colors"><Menu className="w-6 h-6" /></button>
              <span className="text-xs font-black uppercase text-indigo-900 tracking-tight">Q {currentIndex + 1} / {questions.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-bold text-indigo-700">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 hide-scrollbar">
         <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border ${isListening ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                    {currentQ.type}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{currentQ.questionText}</h2>
            </div>

            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 overflow-hidden relative shadow-sm min-h-[340px] flex flex-col items-center justify-center p-6 transition-all">
                {isGeneratingVisuals && !questionImage ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <Sparkles className="w-12 h-12 text-indigo-400 animate-spin" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Illustrator drawing...</span>
                  </div>
                ) : (
                  <>
                    {questionImage ? (
                      <img src={questionImage} className="max-h-[400px] object-contain w-full mb-4 rounded-3xl shadow-lg animate-fade-in" alt="Visual Aid" />
                    ) : (
                      !isListening && currentQ.context ? (
                        <div className="p-8 text-lg font-serif leading-loose text-gray-800 bg-indigo-50/20 rounded-[2rem] w-full whitespace-pre-wrap italic">"{currentQ.context}"</div>
                      ) : (
                        <div className="flex flex-col items-center text-gray-300 gap-2 opacity-50">
                           <ImageIcon className="w-16 h-16" />
                           <span className="text-[10px] font-black uppercase tracking-widest">No Image Needed</span>
                        </div>
                      )
                    )}
                    {isListening && (
                      <div className="flex flex-col items-center justify-center gap-6 py-10 w-full">
                         <button 
                           onClick={handlePlayAudio} 
                           className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${isPlaying ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}
                         >
                            {loadingAudio ? <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-14 h-14" />}
                         </button>
                         <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{isPlaying ? "Audio playing..." : "Tap to listen"}</span>
                      </div>
                    )}
                  </>
                )}
            </div>

            <div className="space-y-4">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full p-6 md:p-8 rounded-[2rem] text-left transition-all flex items-center gap-6 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl' : 'border-gray-100 bg-white text-gray-700 hover:border-indigo-100'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                          <span className="text-lg md:text-xl font-bold flex-1">{option}</span>
                          {isSelected && <CheckCircle className="w-8 h-8 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-6 pb-safe flex gap-4 max-w-2xl mx-auto z-40">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-8 py-5 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200 transition-colors"><ChevronLeft className="w-8 h-8" /></button>
          <button onClick={isLast ? handleSubmit : () => setCurrentIndex(p => p + 1)} className={`flex-1 ${isLast ? 'bg-green-600 shadow-green-100' : 'bg-indigo-600 shadow-indigo-100'} text-white font-black rounded-2xl shadow-xl active:scale-95 text-xl uppercase tracking-tight transition-all`}>{isLast ? 'Complete' : 'Next'}</button>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center font-black text-xl uppercase tracking-tight">Status<button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6" /></button></div>
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-4 gap-4">
               {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} className={`aspect-square rounded-2xl font-black text-sm border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>{idx + 1}</button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
