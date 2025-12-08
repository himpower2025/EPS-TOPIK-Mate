import React, { useEffect, useState } from 'react';
import { ExamSession, AnalyticsFeedback } from '../types';
import { analyzePerformance } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner'; // Changed to default import
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, BookOpen, Trophy, ArrowRight, Brain, CheckSquare } from 'lucide-react';

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
    score: (categoryData[cat].correct / categoryData[cat].total) * 100,
    fullMark: 100
  }));

  if (loading) return <LoadingSpinner message="AI is analyzing your performance..." />;

  const percentage = Math.round((session.score / session.questions.length) * 100);

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Exam Results</h2>
            <p className="text-gray-500 mt-1">Check your AI-powered feedback and improve your weak areas.</p>
          </div>
          <button 
            onClick={onBack}
            className="px-6 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Score</span>
            <div className="relative">
              <Trophy className={`w-12 h-12 mb-2 ${percentage >= 80 ? 'text-yellow-500' : 'text-gray-300'}`} />
            </div>
            <span className="text-5xl font-bold text-gray-900">{session.score} <span className="text-xl text-gray-400">/ {session.questions.length}</span></span>
          </div>
          <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" /> AI Feedback
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {feedback?.overallAssessment || "Loading analysis..."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Performance by Category</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#4B5563', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="My Score" dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" /> Strengths (Keep it up!)
              </h3>
              <ul className="space-y-2">
                {feedback?.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-green-900">
                    <CheckSquare className="w-5 h-5 shrink-0 text-green-600 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-xl p-6 border border-red-100">
              <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Weaknesses (Focus here!)
              </h3>
              <ul className="space-y-2">
                {feedback?.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-900">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-indigo-900 rounded-xl p-8 shadow-lg text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-300" />
            Recommended Study Plan
          </h3>
          <div className="prose prose-invert max-w-none">
            <p className="leading-relaxed text-indigo-100 text-lg">
              {feedback?.studyPlan}
            </p>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={onBack} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-6 py-3 rounded-lg font-semibold transition-colors">
              Start New Exam <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};