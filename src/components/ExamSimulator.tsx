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
        if (!data || data.length === 0) throw new Error("No data");
        setQuestions(data);
      } catch (err) {
        onExit();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mode, setNumber, plan]);

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
    <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
      <LoadingSpinner message="AI 출제 위원이 문제를 검토 중입니다..." />
    </div>
  );

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;

  if (!audioContextReady && isListening) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-950 text-white p-10 text-center pt-safe">
        <Headphones className="w-20 h-20 mb-8 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4">AUDIO READY</h2>
        <p className="mb-12 text-indigo-200/70 font-medium">실제 시험장과 동일한 음성 환경을 구성합니다.</p>
        <button onClick={initAudio} className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95">입장하기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans overflow-hidden">
      {/* 최상단 네비게이션 - 모바일/태블릿 통합 */}
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-6 py-4 flex justify-between items-center max-w-screen-xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 active:bg-indigo-50 rounded-full transition-all">
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:block">
                <span className="text-xs font-black uppercase text-indigo-900 tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Round {setNumber}</span>
              </div>
              <span className="text-sm font-black text-gray-900">Q {currentIndex + 1} / {questions.length}</span>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-2.5 rounded-2xl shadow-lg">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-bold text-lg leading-none">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>
        </div>
      </div>

      {/* 메인 시험 영역 - 반응형 레이아웃 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 pb-40 hide-scrollbar">
         <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* 좌측: 문제 및 시각 자료 */}
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border ${isListening ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                        {isListening ? <Headphones className="w-3 h-3"/> : <ImageIcon className="w-3 h-3"/>}
                        {currentQ.type} SECTION
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">{currentQ.questionText}</h2>
                    {currentQ.category && <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{currentQ.category}</p>}
                </div>

                <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col items-center justify-center p-8 transition-all min-h-[400px]">
                    {isGeneratingVisuals && !questionImage ? (
                      <div className="flex flex-col items-center gap-6 py-12 text-center animate-pulse">
                        <Sparkles className="w-16 h-16 text-indigo-400 animate-spin" />
                        <span className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">AI Illustrator Rendering...</span>
                      </div>
                    ) : (
                      <>
                        {questionImage ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img src={questionImage} className="max-h-[450px] w-auto object-contain rounded-[2rem] shadow-2xl animate-fade-in" alt="Exam Visual" />
                          </div>
                        ) : (
                          !isListening && currentQ.context ? (
                            <div className="p-10 text-xl md:text-2xl font-serif leading-relaxed text-gray-800 bg-indigo-50/30 rounded-[2.5rem] w-full border border-indigo-100 italic shadow-inner">
                                "{currentQ.context}"
                            </div>
                          ) : (
                            isListening && (
                              <div className="flex flex-col items-center justify-center gap-8 w-full py-10">
                                 <button 
                                   onClick={handlePlayAudio} 
                                   className={`relative w-40 h-40 rounded-[3rem] flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isPlaying ? 'bg-indigo-600 text-white ring-8 ring-indigo-100' : 'bg-white text-indigo-600 border border-indigo-100 hover:border-indigo-300'}`}
                                 >
                                    {loadingAudio ? <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-20 h-20" />}
                                 </button>
                                 <div className="text-center">
                                    <p className="text-sm font-black text-indigo-900 uppercase tracking-[0.2em] mb-2">{isPlaying ? "NOW PLAYING" : "CLICK TO PLAY"}</p>
                                    <div className="flex gap-1 justify-center">
                                       {[...Array(3)].map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-indigo-500 animate-bounce' : 'bg-gray-200'}`} style={{animationDelay: `${i*0.2}s`}} />)}
                                    </div>
                                 </div>
                              </div>
                            )
                          )
                        )}
                      </>
                    )}
                </div>
            </div>

            {/* 우측: 정답 옵션 (태블릿 이상에서 나란히 배치) */}
            <div className="grid grid-cols-1 gap-4 h-full content-start">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button 
                          key={idx} 
                          onClick={() => handleAnswer(idx)} 
                          className={`w-full p-6 md:p-10 rounded-[2.5rem] text-left transition-all flex items-center gap-8 border-2 shadow-sm active:scale-[0.99] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xl translate-x-2' : 'border-white bg-white text-gray-700 hover:border-indigo-100'}`}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                            {idx + 1}
                          </div>
                          <span className="text-xl md:text-2xl font-bold flex-1 leading-tight">{option}</span>
                          {isSelected && <CheckCircle className="w-8 h-8 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      {/* 하단 내비게이션 바 - 모바일 터치 대응 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-6 pb-safe z-40">
          <div className="max-w-screen-xl mx-auto flex gap-4">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
                disabled={currentIndex === 0} 
                className="px-8 py-5 rounded-3xl bg-gray-100 text-gray-500 disabled:opacity-30 font-black active:scale-95 transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button 
                onClick={isLast ? handleSubmit : () => setCurrentIndex(p => p + 1)} 
                className={`flex-1 ${isLast ? 'bg-green-600 shadow-green-100' : 'bg-indigo-600 shadow-indigo-100'} text-white font-black rounded-3xl shadow-2xl active:scale-95 text-xl uppercase tracking-widest transition-all py-5`}
              >
                {isLast ? 'SUBMIT EXAM' : 'NEXT QUESTION'}
              </button>
          </div>
      </div>

      {/* 질문 관리 드로어 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 md:w-96 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-2xl text-gray-900 uppercase tracking-tight">Status</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-gray-50 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-4 gap-4 hide-scrollbar">
               {questions.map((q, idx) => (
                  <button 
                    key={q.id} 
                    onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} 
                    className={`aspect-square rounded-2xl font-black text-lg border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-110' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-200'}`}
                  >
                    {idx + 1}
                  </button>
               ))}
            </div>
            <div className="p-8 bg-gray-50">
               <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  <span>Answered</span>
                  <span>{Object.keys(answers).length} / {questions.length}</span>
               </div>
               <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{width: `${(Object.keys(answers).length / questions.length) * 100}%`}} />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
