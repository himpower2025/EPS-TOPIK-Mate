
import React, { useEffect, useState } from 'react';
import { ExamSession, AnalyticsFeedback } from '../types';
import { analyzePerformance } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, BookOpen, ArrowRight, Brain, CheckCircle } from 'lucide-react';

interface AnalyticsProps {
  session: ExamSession;
  onBack: () => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ session, onBack }) => {
  const [feedback, setFeedback] = useState<AnalyticsFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      const data = await analyzePerformance(session);
      setFeedback(data);
      setLoading(false);
    };
    fetchAnalysis();
  }, [session]);

  const categoryData = session.questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = { total: 0, correct: 0 };
    acc[q.category].total += 1;
    if (session.userAnswers[q.id] === q.correctAnswer) acc[q.category].correct += 1;
    return acc;
  }, {} as Record<string, { total: number, correct: number }>);

  const chartData = Object.keys(categoryData).map(cat => ({
    category: cat,
    score: Math.round((categoryData[cat].correct / categoryData[cat].total) * 100),
    fullMark: 100
  }));

  if (loading) return <LoadingSpinner message="AI Examiner is analyzing your performance..." />;

  const totalQuestions = session.questions.length;
  const percentage = Math.round((session.score / totalQuestions) * 100);
  const isPassed = percentage >= 60; 

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8 overflow-y-auto pb-safe">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 1. Header & Score Card */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100 relative overflow-hidden">
           {/* Background Decor */}
           <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 -mr-16 -mt-16 pointer-events-none ${isPassed ? 'bg-green-400' : 'bg-red-400'}`}></div>
           
           <div className="relative z-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
               <div>
                 <h1 className="text-3xl font-black text-gray-900 tracking-tight">Performance Report</h1>
                 <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">{new Date(session.completedAt).toLocaleDateString()} • {session.mode} Mode</p>
               </div>
               <div className={`px-6 py-2 rounded-2xl text-xs font-black tracking-widest border ${isPassed ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                 {isPassed ? "PASSED" : "FAILED"}
               </div>
             </div>

             <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50" />
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (502 * percentage) / 100} className={`${isPassed ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out stroke-round`} />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-5xl font-black text-gray-900">{session.score}</span>
                    <span className="text-gray-400 text-sm font-bold block mt-1">/ {totalQuestions}</span>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  {isPassed ? "Excellent Progress!" : "Keep Pushing Forward!"}
                </h2>
                <p className="text-gray-500 max-w-md mx-auto mt-3 leading-relaxed font-medium">
                  {feedback?.overallAssessment || "Your analysis is being processed by our AI examiner."}
                </p>
             </div>
           </div>
        </div>

        {/* 2. Detailed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Radar Chart */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-widest text-xs">
              <Brain className="w-5 h-5 text-indigo-500" />
              Skill Breakdown
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#f3f4f6" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: '900' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.15} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feedback Lists */}
          <div className="space-y-6">
             {/* Strengths */}
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-900 mb-4 flex items-center gap-3 uppercase tracking-widest text-xs">
                 <CheckCircle className="w-5 h-5 text-green-500" /> Key Strengths
               </h3>
               <ul className="space-y-3">
                 {feedback?.strengths.map((s, i) => (
                   <li key={i} className="text-sm text-gray-600 flex items-start gap-3 bg-green-50/50 p-3 rounded-xl border border-green-100/50">
                     <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></span>
                     <span className="font-medium">{s}</span>
                   </li>
                 ))}
                 {(!feedback?.strengths || feedback.strengths.length === 0) && <li className="text-sm text-gray-400 italic">Identifying your strong suits...</li>}
               </ul>
             </div>

             {/* Weaknesses */}
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
               <h3 className="font-black text-gray-900 mb-4 flex items-center gap-3 uppercase tracking-widest text-xs">
                 <AlertTriangle className="w-5 h-5 text-amber-500" /> Focus Areas
               </h3>
               <ul className="space-y-3">
                 {feedback?.weaknesses.map((w, i) => (
                   <li key={i} className="text-sm text-gray-600 flex items-start gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                     <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                     <span className="font-medium">{w}</span>
                   </li>
                 ))}
                 {(!feedback?.weaknesses || feedback.weaknesses.length === 0) && <li className="text-sm text-gray-400 italic">No major weaknesses detected.</li>}
               </ul>
             </div>
          </div>
        </div>

        {/* 3. Study Plan */}
        <div className="bg-indigo-950 rounded-[3rem] p-8 md:p-12 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <h3 className="text-2xl font-black mb-6 flex items-center gap-3 relative z-10 tracking-tight">
            <BookOpen className="w-8 h-8 text-indigo-400" />
            Personalized Study Plan
          </h3>
          <div className="leading-relaxed text-indigo-100/80 text-base md:text-lg relative z-10 font-medium whitespace-pre-wrap">
            {feedback?.studyPlan}
          </div>
          
          <div className="mt-12 flex justify-end relative z-10">
            <button 
              onClick={onBack} 
              className="bg-white text-indigo-950 hover:bg-indigo-50 px-10 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 flex items-center gap-3 uppercase tracking-widest text-sm"
            >
              Continue Learning <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
