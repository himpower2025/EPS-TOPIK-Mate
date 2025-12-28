
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession } from '../types';
import { generateQuestions, generateSpeech, generateImageForQuestion } from '../services/geminiService';
import { CheckCircle, Clock, Menu, X, ChevronLeft, Headphones, Volume2, Sparkles } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ExamSimulatorProps {
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
  isPremium?: boolean;
  mode?: 'FULL' | 'LISTENING' | 'READING';
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({ onComplete, onExit, isPremium = false, mode = 'FULL' }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 25 * 60); 
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentAiImage, setCurrentAiImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const count = mode === 'FULL' ? 40 : 20;
        const generated = await generateQuestions(count, isPremium, mode); 
        if (generated.length === 0) throw new Error("문제를 불러오지 못했습니다.");
        setQuestions(generated);
      } catch (err) {
        setError("시험 문제를 로드할 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [isPremium, mode]);

  // 문제 변경 시 자동 트리거 (이미지 생성/오디오 재생)
  useEffect(() => {
    if (questions.length === 0) return;
    const currentQ = questions[currentIndex];
    setCurrentAiImage(null);

    // 1. AI 이미지 생성 (그림 설명은 있지만 URL은 아닌 경우)
    if (currentQ.context && !currentQ.context.startsWith('http') && currentQ.context.length < 100) {
      setIsGeneratingImage(true);
      generateImageForQuestion(currentQ.context).then(img => {
        setCurrentAiImage(img);
        setIsGeneratingImage(false);
      });
    }

    // 2. 듣기 문제 자동 재생
    if (currentQ.type === QuestionType.LISTENING) {
      handlePlayAudio();
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || error) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, error]);

  const handlePlayAudio = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || !currentQuestion.context) return;
    if (isPlaying) return;

    setLoadingAudio(true);
    try {
      const buffer = await generateSpeech(currentQuestion.context);
      if (buffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        setIsPlaying(true);
        source.onended = () => {
          setIsPlaying(false);
          setLoadingAudio(false);
        };
      }
    } catch (e) {
      setIsPlaying(false);
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
    onComplete({
      id: Date.now().toString(),
      questions,
      userAnswers: answers,
      score: correctCount,
      completedAt: new Date().toISOString()
    });
  };

  if (loading) return <LoadingSpinner message="시험지를 생성하고 있습니다..." />;

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans">
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-gray-600"><Menu className="w-6 h-6" /></button>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{mode} MODE</span>
                  <span className="text-sm font-bold">Q{currentIndex + 1} of {questions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
              <span className={`font-mono font-bold text-sm ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28" ref={contentRef}>
         <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentQ.type === QuestionType.LISTENING ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {currentQ.type === QuestionType.LISTENING ? <Headphones className="w-3 h-3"/> : "Aa"}
                        {currentQ.type}
                    </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-relaxed">{currentQ.questionText}</h2>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 overflow-hidden min-h-[260px] flex items-center justify-center relative bg-gray-50/50">
                {isGeneratingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-gray-400">AI가 그림을 그리고 있습니다...</span>
                  </div>
                ) : currentAiImage ? (
                  <img src={currentAiImage} className="max-h-[350px] object-contain w-full p-4 animate-fade-in" />
                ) : currentQ.context && currentQ.context.startsWith('http') ? (
                  <img src={currentQ.context} className="max-h-[350px] object-contain w-full p-4" />
                ) : currentQ.type === QuestionType.LISTENING ? (
                   <button onClick={handlePlayAudio} className="w-full h-full flex flex-col items-center justify-center gap-4 py-10">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-indigo-600 border'}`}>
                        {loadingAudio ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Volume2 className="w-10 h-10" />}
                      </div>
                      <span className="font-bold text-indigo-900 uppercase text-xs tracking-widest">{isPlaying ? "듣는 중..." : "다시 듣기 (Tap to Play)"}</span>
                   </button>
                ) : currentQ.context ? (
                   <div className="p-8 text-lg font-serif leading-loose text-gray-800 bg-white w-full border border-gray-100 rounded-xl">{currentQ.context}</div>
                ) : <span className="text-gray-300 font-bold uppercase tracking-widest text-[10px]">No visual data</span>}
            </div>

            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                        <button key={idx} onClick={() => handleAnswer(idx)} className={`w-full p-5 rounded-2xl text-left transition-all flex items-center gap-4 border-2 shadow-sm active:scale-[0.98] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-100 bg-white text-gray-700'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</div>
                          <span className="text-base font-bold">{option}</span>
                          {isSelected && <CheckCircle className="ml-auto w-6 h-6 text-indigo-200" />}
                        </button>
                    );
                })}
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 pb-safe flex gap-3 max-w-2xl mx-auto z-20">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-5 py-4 rounded-2xl bg-gray-100 text-gray-700 disabled:opacity-30 font-bold active:bg-gray-200 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
          {isLast ? (
             <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 active:scale-95 text-lg">결과 제출하기</button>
          ) : (
             <button onClick={() => setCurrentIndex(prev => prev + 1)} className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 text-lg">다음 문제로</button>
          )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><span className="font-black text-lg uppercase tracking-tight">Exam Map</span><button onClick={() => setIsDrawerOpen(false)}><X className="w-6 h-6" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-3 content-start">
               {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => { setCurrentIndex(idx); setIsDrawerOpen(false); }} className={`aspect-square rounded-xl font-black text-xs border-2 flex items-center justify-center transition-all ${idx === currentIndex ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] !== undefined ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-300'}`}>{idx + 1}</button>
               ))}
            </div>
            <div className="p-6 border-t border-gray-100 text-center"><button onClick={onExit} className="w-full py-4 text-red-500 font-bold border border-red-100 rounded-2xl">시험 종료 (포기)</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
