
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

  if (loading) return <LoadingSpinner message="Generating your Score Report..." />;

  const totalQuestions = session.questions.length;
  const percentage = Math.round((session.score / totalQuestions) * 100);
  const isPassed = percentage >= 60; // Assume 60% is passing for mock test

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-8 overflow-y-auto pb-safe">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 1. Header & Score Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 relative overflow-hidden">
           {/* Background Decor */}
           <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none ${isPassed ? 'bg-green-400' : 'bg-red-400'}`}></div>
           
           <div className="relative z-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div>
                 <h1 className="text-2xl font-bold text-gray-900">Exam Report</h1>
                 <p className="text-gray-500 text-sm">{new Date(session.completedAt).toLocaleDateString()} • Mock Test</p>
               </div>
               <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${isPassed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                 {isPassed ? "PASS" : "FAIL"}
               </div>
             </div>

             <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * percentage) / 100} className={`${isPassed ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out`} />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-4xl font-black text-gray-900">{session.score}</span>
                    <span className="text-gray-400 text-sm block">/ {totalQuestions}</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isPassed ? "Excellent Job!" : "Keep Practicing!"}
                </h2>
                <p className="text-gray-500 max-w-md mx-auto mt-2">
                  {feedback?.overallAssessment || "Analysis complete."}
                </p>
             </div>
           </div>
        </div>

        {/* 2. Detailed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Radar Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              Skill Analysis
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="My Score" dataKey="score" stroke="#6366f1" strokeWidth={3} fill="#6366f1" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feedback Lists */}
          <div className="space-y-4">
             {/* Strengths */}
             <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
               <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-green-500" /> Strong Areas
               </h3>
               <ul className="space-y-2">
                 {feedback?.strengths.map((s, i) => (
                   <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0"></span>
                     {s}
                   </li>
                 ))}
                 {(!feedback?.strengths || feedback.strengths.length === 0) && <li className="text-sm text-gray-400">No specific strengths detected yet.</li>}
               </ul>
             </div>

             {/* Weaknesses */}
             <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-500">
               <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5 text-red-500" /> Focus Needed
               </h3>
               <ul className="space-y-2">
                 {feedback?.weaknesses.map((w, i) => (
                   <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                     {w}
                   </li>
                 ))}
                 {(!feedback?.weaknesses || feedback.weaknesses.length === 0) && <li className="text-sm text-gray-400">Great job! No major weaknesses.</li>}
               </ul>
             </div>
          </div>
        </div>

        {/* 3. Study Plan */}
        <div className="bg-indigo-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
            <BookOpen className="w-6 h-6 text-indigo-300" />
            AI Study Plan
          </h3>
          <p className="leading-relaxed text-indigo-100 text-base md:text-lg relative z-10 opacity-90">
            {feedback?.studyPlan}
          </p>
          
          <div className="mt-8 flex justify-end relative z-10">
            <button 
              onClick={onBack} 
              className="bg-white text-indigo-900 hover:bg-indigo-50 px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              Back to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
