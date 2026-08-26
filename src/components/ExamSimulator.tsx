import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, ExamSession, ExamMode, PlanType } from '../types';
import { generateQuestionsBySet, generateSpeech, generateImage, cleanText, prepareAudioScript } from '../services/geminiService';
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
  const [timeLeft, setTimeLeft] = useState(mode === 'FULL' ? 50 * 60 : 30 * 60);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

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
        if (!data || data.length === 0) throw new Error("Question generation failed");
        setQuestions(data);
      } catch (err) {
        console.error(err);
        onExit();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mode, setNumber, plan, onExit]);

  const initAudio = async () => {
    try {
      if (!audioContextRef.current) {
        // Let the browser choose the best sample rate for the hardware
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setAudioContextReady(true);
      return true;
    } catch (err) {
      console.error("Failed to initialize AudioContext:", err);
      return false;
    }
  };

  useEffect(() => {
    if (questions.length === 0 || loading) return;
    const q = questions[currentIndex];

    setQuestionImage(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const loadVisuals = async () => {
      // imageUrl(로컬 파일) 있으면 즉시 표시, 없으면 AI 생성
      if (q.imageUrl || q.imagePrompt) {
        setIsGeneratingVisuals(true);
        try {
          const img = await generateImage(q.imagePrompt || '', q.imageUrl);
          setQuestionImage(img);
        } catch (err) {
          console.error("Image generation failed:", err);
          setQuestionImage(null);
        } finally {
          setIsGeneratingVisuals(false);
        }
      }
    };
    loadVisuals();

    if (currentAudioSource.current) {
      try { currentAudioSource.current.stop(); } catch {}
      currentAudioSource.current = null;
    }
    // 문제 이동 시 TTS 즉시 중단
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setLoadingAudio(false);

    // 자동 재생 로직 삭제 (학습자가 Play 버튼을 누를 때만 실행되도록 변경)
    // const timer = setTimeout(() => {
    //   if (q.type === QuestionType.LISTENING && audioContextReady && !isPlaying && !loadingAudio) {
    //     handlePlayAudio();
    //   }
    // }, 500);

    return () => {
      // clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, questions, audioContextReady, loading]);

  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);
  const handlePlayAudio = async () => {
    const q = questions[currentIndex];

    // 실제 EPS-TOPIK 은 대화가 끝난 뒤 질문을 읽어줍니다.
    // context(대본) 와 questionText(질문) 가 다르면 질문을 뒤에 이어 붙입니다.
    const isInstruction = /고르십시오|고르세요|들은 것을/.test(q.questionText || '');
    const rawScript =
      q.context && q.questionText && !isInstruction && q.context !== q.questionText
        ? `${q.context}\n${q.questionText}`
        : q.context || q.questionText;

    const { script, lines } = prepareAudioScript(rawScript);

    if (!script) return;
    
    // 강제 초기화: 이전 오디오나 TTS가 돌고 있다면 모두 중지
    window.speechSynthesis.cancel();
    if (currentAudioSource.current) {
      try { currentAudioSource.current.stop(); } catch {}
      currentAudioSource.current = null;
    }
    
    // 이미 로딩 중이거나 재생 중이면 잠시 중단 후 재시도 가능하게 함
    if (loadingAudio) return; 

    // iOS/Safari Autoplay Unlock for TTS fallback
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    window.speechSynthesis.speak(unlockUtterance);

    setLoadingAudio(true);
    try {
      // 대화형도 Gemini 멀티스피커 TTS 로 재생합니다.
      // (기존에는 여기서 강제로 throw 해서 항상 브라우저 음성으로 떨어졌습니다)
      const success = await initAudio();
      if (!success || !audioContextRef.current) {
        throw new Error("AudioContext initialization failed");
      }

      let buffer: AudioBuffer | null = null;

      // 사전 생성된 음성 파일(public/audio/...)이 있으면 API 호출 없이 재생
      if (q.audioUrl) {
        try {
          const res = await fetch(q.audioUrl);
          if (res.ok) {
            buffer = await audioContextRef.current.decodeAudioData(await res.arrayBuffer());
          }
        } catch (e) {
          console.warn('사전 생성 음성 로드 실패, 실시간 TTS 로 전환:', e);
        }
      }

      if (!buffer) buffer = await generateSpeech(rawScript, audioContextRef.current);

      if (buffer && audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
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
        throw new Error("AI returned no audio buffer");
      }
    } catch (err) {
      console.warn("AI Audio failed, falling back to browser Sequential TTS:", err);

      setLoadingAudio(false);
      setIsPlaying(true);
      window.speechSynthesis.cancel();

      // 한국어 목소리 선택: 실제 차이나는 두 목소리를 선택시도
      const getKoreanVoice = (preferMale: boolean): SpeechSynthesisVoice | null => {
        const voices = window.speechSynthesis.getVoices();
        const koVoices = voices.filter(v => v.lang.startsWith('ko'));
        if (koVoices.length === 0) return null;
        if (koVoices.length === 1) return koVoices[0];

        // 이름으로 성별을 먼저 판별 (기기마다 목록 순서가 달라 인덱스 추측은 부정확)
        const MALE = /male|남성|남자|InJoon|Gook|Hyunsu|Yuna_male/i;
        const FEMALE = /female|여성|여자|Yuna|Sora|SunHi|Heami|Jiyoung/i;
        const named = koVoices.find(v => (preferMale ? MALE : FEMALE).test(v.name));
        if (named) return named;

        return preferMale ? koVoices[0] : koVoices[koVoices.length - 1];
      };

      const pause = (ms: number): Promise<void> =>
        new Promise(resolve => setTimeout(resolve, ms));

      const playAllLines = async () => {
        // 첫 문장 전 준비 시간
        await pause(300);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const utterance = new SpeechSynthesisUtterance(line.text);
          utterance.lang = 'ko-KR';
          utterance.volume = 1.0;

          // 화자별 목소리 및 톤 설정 (성별이 같더라도 순서에 따라 피치를 다르게 함)
          // 시험 낭독용 톤: 피치를 올리지 않습니다.
          // (기존 1.1 / 1.25 설정이 "하이톤으로 거북하다"의 직접 원인이었습니다)
          if (line.speaker === 'Man') {
            const maleVoice = getKoreanVoice(true);
            if (maleVoice) utterance.voice = maleVoice;
            utterance.pitch = 0.85;
            utterance.rate = 0.85;
          } else if (line.speaker === 'Woman') {
            const femaleVoice = getKoreanVoice(false);
            if (femaleVoice) utterance.voice = femaleVoice;
            utterance.pitch = 1.0;
            utterance.rate = 0.85;
          } else {
            utterance.pitch = 0.95;
            utterance.rate = 0.85;
          }

          await new Promise<void>((resolve) => {
            utterance.onend = async () => {
              const gapMs = (line.speaker === 'Narrator') ? 800 : 1200;
              await pause(gapMs);
              resolve();
            };
            utterance.onerror = () => resolve();
            window.speechSynthesis.speak(utterance);
          });
        }
        setIsPlaying(false);
      };

      playAllLines();
    }
  };

  const handleAnswer = (idx: number) => {
    setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: idx }));
  };

  const handleSubmit = (latestAnswers?: Record<string, number>) => {
    const finalAnswers = latestAnswers ?? answers;
    let score = 0;
    questions.forEach(q => { if (finalAnswers[q.id] === q.correctAnswer) score++; });
    onComplete({
      id: Date.now().toString(),
      mode,
      setNumber,
      questions,
      userAnswers: finalAnswers,
      score,
      completedAt: new Date().toISOString()
    });
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
      <LoadingSpinner message="AI Examiner is tailoring your personalized questions..." />
    </div>
  );

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isListening = currentQ.type === QuestionType.LISTENING;
  // 그림 표시 규칙
  //   읽기  : 그림이 있으면 항상 표시
  //   듣기  : imageRole === 'stimulus' 일 때만 표시.
  //           'hint' 는 대본에 이미 답이 나오는 삽화라 표시하면 정답이 유출됩니다.
  const hasImage =
    !!(currentQ.imageUrl || currentQ.imagePrompt) &&
    (currentQ.type !== QuestionType.LISTENING || currentQ.imageRole === 'stimulus');

  const displayQuestionText = cleanText(currentQ.questionText);
  const displayContext = cleanText(currentQ.context || "");

  if (!audioContextReady && isListening) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-950 text-white p-10 text-center pt-safe">
        <Headphones className="w-20 h-20 mb-8 text-indigo-300 animate-pulse" />
        <h2 className="text-3xl font-black mb-4">Listening Test Ready</h2>
        <p className="mb-12 text-indigo-200/70 font-medium">Please turn on your sound for a realistic exam experience.</p>
        <button
          onClick={async () => {
            const success = await initAudio();
            if (success) {
              // 초기화 직후 첫 문제 즉시 재생 트리거
              setTimeout(() => handlePlayAudio(), 300);
            }
          }}
          className="bg-white text-indigo-900 px-12 py-5 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95"
        >
          Begin Audio
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans overflow-hidden">
      <div className="bg-white border-b border-gray-200 pt-safe shrink-0 shadow-sm z-30">
        <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center max-w-screen-xl mx-auto w-full">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-2 text-gray-400 hover:text-indigo-600 active:bg-indigo-50 rounded-full transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden xs:block">
              <span className="text-[10px] md:text-xs font-black uppercase text-indigo-900 tracking-widest bg-indigo-50 px-2 md:px-3 py-1 rounded-full">
                Round {setNumber}
              </span>
            </div>
            <span className="text-xs md:text-sm font-black text-gray-900">
              Q {currentIndex + 1} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3 bg-indigo-950 text-white px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl md:rounded-2xl shadow-lg border border-white/10">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
            <span className="font-mono font-bold text-base md:text-lg leading-none">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-40 hide-scrollbar">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">

          <div className="space-y-4 md:space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-gray-100">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-4 md:mb-6 border ${isListening ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {isListening ? <Headphones className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                {isListening ? "Listening" : currentQ.category} Section
              </div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 leading-tight mb-2 md:mb-4">
                {displayQuestionText}
              </h2>
              <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest opacity-60">
                {isListening ? "Listening Comprehension" : currentQ.category}
              </p>
            </div>

            {/* 보여줄 자료(그림·지문·재생 버튼)가 하나도 없으면 빈 상자를 그리지 않습니다.
                보기가 그림인 표지판 문제 등이 여기 해당합니다. */}
            {(isListening || hasImage || displayContext) && (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-gray-200 overflow-hidden shadow-sm flex flex-col items-center justify-center p-4 md:p-8 transition-all min-h-[250px] md:min-h-[400px]">
              {isGeneratingVisuals && !questionImage ? (
                <div className="flex flex-col items-center gap-4 md:gap-6 py-8 md:py-12 text-center animate-pulse">
                  <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 animate-spin" />
                  <span className="text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-[0.3em]">
                    Loading Visual...
                  </span>
                </div>
              ) : (
                <div className="w-full space-y-4 md:space-y-8">
                  {/* 이미지가 있는 문제: 읽기 문제인 경우에만 표시 (듣기는 이미지 제거) */}
                  {hasImage && questionImage ? (
                    <div className="w-full flex items-center justify-center">
                      <img
                        src={questionImage}
                        className="max-h-[200px] md:max-h-[350px] w-auto object-contain rounded-2xl md:rounded-[2.5rem] shadow-2xl animate-fade-in"
                        alt="Exam Visual"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    hasImage && !isGeneratingVisuals && (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <p className="text-gray-400 text-sm font-medium">Image failed to load</p>
                        <button
                          onClick={() => {
                            const q = questions[currentIndex];
                            if (q.imageUrl || q.imagePrompt) {
                              setIsGeneratingVisuals(true);
                              generateImage(q.imagePrompt || '', q.imageUrl)
                                .then(img => {
                                  setQuestionImage(img);
                                  setIsGeneratingVisuals(false);
                                })
                                .catch(() => setIsGeneratingVisuals(false));
                            }
                          }}
                          className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                          Retry Loading Image
                        </button>
                      </div>
                    )
                  )}

                  {/* 지문과 그림이 모두 있는 문제(안내문+사진 등)는 둘 다 보여줍니다 */}
                  {!isListening && displayContext && (
                    <div className="p-6 md:p-10 text-lg md:text-xl lg:text-2xl font-serif leading-relaxed text-gray-800 bg-indigo-50/30 rounded-2xl md:rounded-[2.5rem] w-full border border-indigo-100 italic shadow-inner text-center whitespace-pre-line">
                      {displayContext}
                    </div>
                  )}

                  {isListening ? (
                    <div className="flex flex-col items-center justify-center gap-4 md:gap-6 w-full py-2 md:py-4">
                      <button
                        onClick={handlePlayAudio}
                        disabled={loadingAudio}
                        className={`relative w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isPlaying ? 'bg-indigo-600 text-white ring-8 ring-indigo-100' : 'bg-white text-indigo-600 border border-indigo-100 hover:border-indigo-300'} disabled:opacity-50`}
                      >
                        {loadingAudio
                          ? <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
                          : <Volume2 className="w-10 h-10 md:w-16 md:h-16" />
                        }
                      </button>
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs font-black text-indigo-900 uppercase tracking-[0.2em] mb-1 md:mb-2">
                          {isPlaying ? "Now Playing" : loadingAudio ? "Generating Audio..." : "Tap to Listen"}
                        </p>
                        <div className="flex gap-1 justify-center">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isPlaying ? 'bg-indigo-500 animate-bounce' : 'bg-gray-200'}`}
                              style={{ animationDelay: `${i * 0.2}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 h-full content-start">
            {currentQ.options.map((option, idx) => {
              const isSelected = answers[currentQ.id] === idx;
              const optionImage = currentQ.optionImages?.[idx];
              
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 md:p-6 lg:p-8 rounded-xl md:rounded-[2.5rem] text-left transition-all flex items-center gap-4 md:gap-8 border-2 shadow-sm active:scale-[0.99] ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xl translate-x-1 md:translate-x-2' : 'border-white bg-white text-gray-700 hover:border-indigo-100'}`}
                >
                  <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center text-sm md:text-xl font-black shrink-0 ${isSelected ? 'bg-white text-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                    {idx + 1}
                  </div>
                  
                  {optionImage ? (
                    <div className="flex-1 flex justify-center">
                      <div className="bg-white p-2 rounded-xl overflow-hidden shadow-inner border border-gray-100">
                        <img src={optionImage} alt={`Option ${idx + 1}`} className="max-h-24 md:max-h-32 object-contain" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm md:text-lg lg:text-xl font-bold flex-1 leading-tight">{option}</span>
                  )}
                  
                  {isSelected && <CheckCircle className="w-5 h-5 md:w-8 md:h-8 text-indigo-200" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-gray-100 p-4 md:p-6 pb-safe z-40">
        <div className="max-w-screen-xl mx-auto flex flex-col gap-2 md:gap-3">
          <div className="flex gap-3 md:gap-4">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-5 md:px-8 py-4 md:py-5 rounded-xl md:rounded-3xl bg-gray-100 text-gray-500 disabled:opacity-30 font-black active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
              onClick={() => {
                if (isLast) {
                  const finalAnswers = { ...answers };
                  handleSubmit(finalAnswers);
                } else {
                  setCurrentIndex(p => p + 1);
                }
              }}
              className="flex-1 bg-indigo-600 shadow-indigo-100 text-white font-black rounded-xl md:rounded-3xl shadow-2xl active:scale-95 text-base md:text-xl uppercase tracking-widest transition-all py-4 md:py-5"
            >
              {isLast ? 'Complete Exam' : 'Next Question'}
            </button>
          </div>
          {!isLast && (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="w-full py-3 rounded-xl md:rounded-3xl bg-green-50 text-green-700 border border-green-200 font-black text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-green-100"
            >
              ✓ Complete Exam Now
            </button>
          )}
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-80 md:w-96 bg-white h-full shadow-2xl flex flex-col pt-safe animate-slide-in-right">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-2xl text-gray-900 uppercase tracking-tight">Status</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-gray-50 rounded-full">
                <X className="w-6 h-6" />
              </button>
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
            {/* Return to Dashboard button at the bottom of drawer */}
            <div className="p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => { setIsDrawerOpen(false); setShowExitConfirm(true); }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-100 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Exit Exam?</h3>
            <p className="text-gray-400 text-sm font-medium mb-8 leading-relaxed">
              Your progress will be lost.<br />Are you sure you want to return to the dashboard?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onExit}
                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
              >
                Yes, Exit
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-4 bg-gray-100 text-gray-500 font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
              >
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Exam Confirmation Modal */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-green-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">시험 제출</h3>
            <p className="text-gray-500 text-sm font-medium mb-2 leading-relaxed">
              현재 <span className="font-black text-indigo-600">{currentIndex + 1}</span> / {questions.length} 번 문제까지 진행했습니다.
            </p>
            {(() => {
              const unanswered = questions.filter(q => answers[q.id] === undefined).length;
              return unanswered > 0 ? (
                <p className="text-orange-500 text-sm font-black mb-6">
                  ⚠ 아직 {unanswered}문제가 미응답입니다.
                </p>
              ) : (
                <p className="text-green-600 text-sm font-black mb-6">
                  ✓ 모든 문제에 답했습니다!
                </p>
              );
            })()}
            <p className="text-gray-400 text-xs mb-8">미응답 문제는 오답으로 처리되며, 지금 바로 결과를 확인할 수 있습니다.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowCompleteConfirm(false);
                  setIsGeneratingVisuals(false); // 이미지 로딩 중단
                  handleSubmit({ ...answers });
                }}
                className="w-full py-4 bg-green-600 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
              >
                결과 보기
              </button>
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="w-full py-4 bg-gray-100 text-gray-500 font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all"
              >
                계속 풀기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
