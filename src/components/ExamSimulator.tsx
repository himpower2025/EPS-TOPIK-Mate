
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImage } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles, Play, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

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
    
    // 리셋
    setQuestionImage(null);
    setOptionImages([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const generateAllVisuals = async () => {
      setIsGeneratingVisuals(true);
      
      try {
        // 1. 메인 질문 이미지 생성
        if (q.imagePrompt) {
          generateImage(q.imagePrompt).then(setQuestionImage);
        }

        // 2. 보기 이미지 생성 (병렬 처리)
        if (q.optionImagePrompts && q.optionImagePrompts.length === 4) {
          const imagePromises = q.optionImagePrompts.map(prompt => generateImage(prompt));
          const images = await Promise.all(imagePromises);
          setOptionImages(images);
        }
      } finally {
        setIsGeneratingVisuals(false);
      }
    };

    generateAllVisuals();

    // 듣기 문제 자동 재생 (오디오 컨텍스트가 준비된 경우)
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
    const audioText = q.context || q.questionText;

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
    } catch { 
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
    onComplete({ id: Date.now().toString(), mode, setNumber, questions, userAnswers: answers, score, completedAt: new Date().toISOString() });
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center p-12 text-center bg-white">
      <LoadingSpinner message={`Round ${setNumber} 문제를 AI가 출제 중입니다...`} />
    </div>
  );

  if (!audioContextReady && mode !== 'READING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 text-center pt-safe">
        <Headphones className="w-24 h-24 mb-6 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">준비 되셨나요?</h2>
        <p className="mb-10 opacity-70 font-bold max-w-[280px]">실제 한국인 음성이 들리는 고퀄리티 듣기 문제가 시작됩니다.</p>
        <button onClick={initAudio} className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 flex items-center gap-3">
          <Play className="w-6 h-6 fill-current" /> 시험 시작
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;
  const isImageOptions = optionImages.length === 4;

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
      {/* Top Header */}
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

      {/* Main Question Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 pb-40 scroll-smooth">
         <div className="max-w-2xl mx-auto space-y-6">
            
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

            {/* AI Image / Context Section */}
            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 overflow-hidden relative shadow-sm min-h-[240px] flex flex-col items-center justify-center p-6">
                
                {isGeneratingVisuals && !questionImage ? (
                  <div className="flex flex-col items-center gap-3 py-12 animate-pulse text-center">
                    <Sparkles className="w-12 h-12 text-indigo-400 mb-2" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">AI Illustrator is drawing the scene...</span>
                  </div>
                ) : (
                  <>
                    {questionImage ? (
                      <img src={questionImage} className="max-h-[380px] object-contain w-full mb-6 rounded-3xl animate-fade-in shadow-md" alt="AI Generated Illustration" />
                    ) : (
                      !isListening && currentQ.context && (
                        <div className="p-6 text-lg md:text-xl font-serif leading-loose text-gray-800 bg-indigo-50/20 rounded-3xl w-full whitespace-pre-wrap">{currentQ.context}</div>
                      )
                    )}

                    {isListening && (
                      <div className="flex flex-col items-center justify-center gap-5 py-8">
                         <button 
                            onClick={handlePlayAudio} 
                            disabled={loadingAudio}
                            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${isPlaying ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 border-2 border-indigo-100 hover:scale-105 active:scale-95'}`}
                          >
                            {loadingAudio ? (
                              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/>
                            ) : (
                              <Volume2 className={`w-14 h-14 ${isPlaying ? 'animate-pulse' : ''}`} />
                            )}
                         </button>
                         <div className="flex flex-col items-center gap-1">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">
                             {isPlaying ? "AI Native Speaker is Reading..." : "Tap to Listen Again"}
                           </span>
                           {loadingAudio && <span className="text-[8px] text-gray-400 animate-pulse">RECORDING VOICE...</span>}
                         </div>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* Answer Options */}
            {isImageOptions ? (
              <div className="grid grid-cols-2 gap-4">
                {optionImages.map((img, idx) => {
                  const isSelected = answers[currentQ.id] === idx;
                  return (
                    <button 
                      key={idx} 
                      onClick={() => handleAnswer(idx)} 
                      className={`relative aspect-square rounded-[2.5rem] overflow-hidden border-4 transition-all shadow-sm active:scale-95 ${isSelected ? 'border-indigo-600 ring-8 ring-indigo-50 shadow-xl' : 'border-white bg-white'}`}
                    >
                       {img ? (
                         <img src={img} className="w-full h-full object-cover" alt={`Option ${idx + 1}`} />
                       ) : (
                         <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center animate-pulse">
                           <ImageIcon className="w-8 h-8 text-gray-200 mb-2" />
                           <span className="text-[8px] font-black text-gray-300 uppercase">AI Loading...</span>
                         </div>
                       )}
                       <div className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white/90 text-gray-500'}`}>{idx + 1}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                      const isSelected = answers[currentQ.id] === idx;
                      return (
                          <button 
                            key={idx} 
                            onClick={() => handleAnswer(idx)} 
                            className={`w-full p-6 md:p-8 rounded-[2.5rem] text-left transition-all flex items-center gap-5 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl' : 'border-gray-100 bg-white text-gray-700 hover:border-indigo-100'}`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                            <span className="text-lg md:text-xl font-bold flex-1">{option}</span>
                            {isSelected && <CheckCircle className="w-8 h-8 text-indigo-200" />}
                          </button>
                      );
                  })}
              </div>
            )}
         </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-6 pb-safe flex gap-4 max-w-2xl mx-auto z-40 shadow-2xl">
          <button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
            disabled={currentIndex === 0} 
            className="px-7 py-5 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          {isLast ? (
             <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-xl uppercase tracking-tighter">Submit Exam</button>
          ) : (
             <button onClick={() => setCurrentIndex(p => p + 1)} className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 text-xl uppercase tracking-tighter flex items-center justify-center gap-2">Next Question <ChevronRight className="w-6 h-6"/></button>
          )}
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center font-black text-xl">Exam Progress<button onClick={() => setIsDrawerOpen(false)}><X className="w-7 h-7" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3">
               {questions.map((q, idx) => (
                  <button 
                    key={q.id} 
                    onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} 
                    className={`aspect-square rounded-2xl font-black text-sm border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}
                  >
                    {idx + 1}
                  </button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
