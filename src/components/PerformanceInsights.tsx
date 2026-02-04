'use client';

import { useState, useEffect } from 'react';
import { PerformanceAnalysis, RaceReadinessScore, PerformanceAlert } from '@/lib/performance-analyzer';

interface PerformanceInsightsData {
  analysis: PerformanceAnalysis;
  raceReadiness: RaceReadinessScore;
  programProgress: {
    currentWeek: number;
    totalWeeks: number;
    completedWorkouts: number;
    totalWorkouts: number;
  };
}

interface PerformanceInsightsProps {
  className?: string;
}

export default function PerformanceInsights({ className = '' }: PerformanceInsightsProps) {
  const [data, setData] = useState<PerformanceInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch('/api/user-program/analysis');
        if (!response.ok) {
          if (response.status === 404) {
            setError('no-program');
            return;
          }
          throw new Error('Failed to fetch analysis');
        }
        const analysisData = await response.json();
        setData(analysisData);
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('fetch-error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <div className={`bg-[#141414] rounded-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-[#262626] rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-[#262626] rounded mb-4"></div>
          <div className="h-4 bg-[#262626] rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error === 'no-program' || !data) {
    return null; // Don't show if no program
  }

  if (error) {
    return (
      <div className={`bg-[#141414] rounded-xl p-6 ${className}`}>
        <p className="text-gray-500 text-sm">Unable to load performance insights</p>
      </div>
    );
  }

  const { analysis, raceReadiness, programProgress } = data;

  return (
    <div className={`bg-[#141414] rounded-xl p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-block bg-[#ffed00] px-3 py-1.5">
          <h3 className="text-black font-black tracking-wider uppercase text-sm">
            Performance Insights
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          Week {programProgress.currentWeek} of {programProgress.totalWeeks}
        </span>
      </div>

      {/* Race Readiness Gauge */}
      <div className="flex flex-col items-center mb-6">
        <RaceReadinessGauge score={raceReadiness.score} />
        <p className="text-gray-400 text-sm mt-3 text-center max-w-xs">
          {raceReadiness.message}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Completion"
          value={`${analysis.recentCompletionRate}%`}
          subtext="Last 7 days"
          color={analysis.recentCompletionRate >= 70 ? 'green' : analysis.recentCompletionRate >= 50 ? 'yellow' : 'red'}
        />
        <StatCard
          label="Avg RPE"
          value={analysis.averageRPE !== null ? analysis.averageRPE.toString() : '-'}
          subtext="Rate of effort"
          color={
            analysis.averageRPE === null ? 'gray' :
            analysis.averageRPE <= 6 ? 'green' :
            analysis.averageRPE <= 8 ? 'yellow' : 'red'
          }
        />
        <StatCard
          label="Trend"
          value={
            analysis.overallTrend === 'improving' ? '↑' :
            analysis.overallTrend === 'declining' ? '↓' : '→'
          }
          subtext={analysis.overallTrend.charAt(0).toUpperCase() + analysis.overallTrend.slice(1)}
          color={
            analysis.overallTrend === 'improving' ? 'green' :
            analysis.overallTrend === 'declining' ? 'red' : 'yellow'
          }
        />
        <StatCard
          label="Fatigue"
          value={analysis.fatigueScore <= 40 ? 'Low' : analysis.fatigueScore <= 70 ? 'Med' : 'High'}
          subtext={`${analysis.fatigueScore}/100`}
          color={analysis.fatigueScore <= 40 ? 'green' : analysis.fatigueScore <= 70 ? 'yellow' : 'red'}
        />
      </div>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm text-gray-400 font-medium uppercase tracking-wide mb-2">
            Alerts
          </h4>
          <div className="space-y-2">
            {analysis.alerts.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm text-gray-400 font-medium uppercase tracking-wide mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1">
            {analysis.recommendations.slice(0, 3).map((rec, idx) => (
              <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-[#ffed00] mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RaceReadinessGauge({ score }: { score: number }) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStrokeColor = () => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  // SVG arc for gauge
  const radius = 60;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-40 h-24">
      <svg className="w-full h-full" viewBox="0 0 140 80">
        {/* Background arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="#262626"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className={`text-3xl font-black ${getScoreColor()}`}>
          {score}
        </span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          Race Ready
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClasses = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-[#1f1f1f] rounded-lg p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-black ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: PerformanceAlert }) {
  const severityStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  const icons = {
    info: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    critical: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${severityStyles[alert.severity]}`}>
      <span className="flex-shrink-0 mt-0.5">{icons[alert.severity]}</span>
      <p className="text-sm">{alert.message}</p>
    </div>
  );
}
