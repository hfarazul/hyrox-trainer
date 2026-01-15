'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { WorkoutSession, PerformanceRanking } from '@/lib/types';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { loadSessions, deleteSession, formatTime } from '@/lib/storage';
import { fetchSessions, deleteSessionAPI } from '@/lib/api';
import { getRankingInfo, RankingIcon } from '@/lib/workout-generator';

// SVG icon component for rankings
function RankingIconSVG({ icon, className = "w-4 h-4" }: { icon: RankingIcon; className?: string }) {
  switch (icon) {
    case 'trophy':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 3h14v2H5V3zm2 2v8c0 2.5 2 4.5 4.5 4.5h1c2.5 0 4.5-2 4.5-4.5V5h2v8c0 3-2 5.5-4.5 6.3V21h2v2H7v-2h2v-1.7C6.5 18.5 4.5 16 4.5 13V5H5V3h2v2z"/>
        </svg>
      );
    case 'bolt':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'muscle':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 11.5a4.5 4.5 0 01-3-1.13A4.5 4.5 0 012 7a4.5 4.5 0 018.85-1h2.3A4.5 4.5 0 0122 7a4.5 4.5 0 01-2 3.73A4.5 4.5 0 0117 11.5h-2v2h-6v-2H7z"/>
        </svg>
      );
    case 'check':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'flag':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
        </svg>
      );
  }
}

type TabType = 'overview' | 'trends' | 'history';

export default function ProgressTracker() {
  const { data: authSession } = useSession();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        if (authSession?.user?.id) {
          // Load from database for authenticated users
          const apiSessions = await fetchSessions();
          if (apiSessions.length > 0) {
            setSessions(apiSessions);
          } else {
            // Fallback to localStorage if no DB sessions
            setSessions(loadSessions());
          }
        } else {
          // Load from localStorage for guests
          setSessions(loadSessions());
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessions(loadSessions());
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [authSession]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      if (authSession?.user?.id) {
        // Delete from database for authenticated users
        await deleteSessionAPI(sessionId);
        // Refresh sessions from database
        const apiSessions = await fetchSessions();
        setSessions(apiSessions.length > 0 ? apiSessions : loadSessions());
      } else {
        // Delete from localStorage for guests
        deleteSession(sessionId);
        setSessions(loadSessions());
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Fallback to localStorage delete
      deleteSession(sessionId);
      setSessions(loadSessions());
    }
    setDeleteConfirmId(null);
  };

  const getStationName = (stationId: string) =>
    HYROX_STATIONS.find(s => s.id === stationId)?.name || stationId;

  const getPersonalBests = () => {
    const bests: Record<string, number> = {};
    let bestTotal = Infinity;

    for (const session of sessions) {
      // Only count complete sessions for best total time
      if (!session.partial && session.totalTime > 0 && session.totalTime < bestTotal) {
        bestTotal = session.totalTime;
      }
      // Station times count from all sessions
      for (const result of session.stations) {
        if (!bests[result.stationId] || result.timeSeconds < bests[result.stationId]) {
          bests[result.stationId] = result.timeSeconds;
        }
      }
    }

    return { stationBests: bests, bestTotal: bestTotal === Infinity ? 0 : bestTotal };
  };

  const getAverageTimes = () => {
    const totals: Record<string, { sum: number; count: number }> = {};

    for (const session of sessions) {
      for (const result of session.stations) {
        if (!totals[result.stationId]) {
          totals[result.stationId] = { sum: 0, count: 0 };
        }
        totals[result.stationId].sum += result.timeSeconds;
        totals[result.stationId].count++;
      }
    }

    const averages: Record<string, number> = {};
    for (const [stationId, data] of Object.entries(totals)) {
      averages[stationId] = Math.round(data.sum / data.count);
    }
    return averages;
  };

  // Calculate performance trend (improving, stable, declining)
  const getPerformanceTrend = () => {
    const completeSessions = sessions.filter(s => !s.partial && s.totalTime > 0);
    if (completeSessions.length < 3) return { trend: 'neutral' as const, percentage: 0 };

    // Get last 5 vs previous 5 average
    const recent = completeSessions.slice(0, Math.min(5, completeSessions.length));
    const previous = completeSessions.slice(5, Math.min(10, completeSessions.length));

    if (previous.length === 0) return { trend: 'neutral' as const, percentage: 0 };

    const recentAvg = recent.reduce((a, s) => a + s.totalTime, 0) / recent.length;
    const previousAvg = previous.reduce((a, s) => a + s.totalTime, 0) / previous.length;

    const percentChange = ((previousAvg - recentAvg) / previousAvg) * 100;

    if (percentChange > 3) return { trend: 'improving' as const, percentage: Math.abs(percentChange) };
    if (percentChange < -3) return { trend: 'declining' as const, percentage: Math.abs(percentChange) };
    return { trend: 'stable' as const, percentage: Math.abs(percentChange) };
  };

  // Get ranking distribution
  const getRankingDistribution = () => {
    const distribution: Record<PerformanceRanking, number> = {
      elite: 0,
      fast: 0,
      good: 0,
      solid: 0,
      finish: 0
    };

    for (const session of sessions) {
      if (session.ranking) {
        distribution[session.ranking]++;
      }
    }

    return distribution;
  };

  // Get workout streak and frequency
  const getWorkoutStats = () => {
    if (sessions.length === 0) return { streak: 0, thisWeek: 0, thisMonth: 0 };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = sessions.filter(s => new Date(s.date) >= oneWeekAgo).length;
    const thisMonth = sessions.filter(s => new Date(s.date) >= oneMonthAgo).length;

    // Calculate streak (consecutive days with workouts)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = new Set(
      sessions.map(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    let checkDate = new Date(today);
    // If no workout today, start from yesterday
    if (!sessionDates.has(checkDate.getTime())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (sessionDates.has(checkDate.getTime())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return { streak, thisWeek, thisMonth };
  };

  // Get recent times for mini chart (last 10 sessions)
  const getRecentTimes = () => {
    return sessions
      .filter(s => !s.partial && s.totalTime > 0)
      .slice(0, 10)
      .reverse()
      .map(s => s.totalTime);
  };

  const { stationBests, bestTotal } = getPersonalBests();
  const averages = getAverageTimes();
  const trend = getPerformanceTrend();
  const rankingDist = getRankingDistribution();
  const workoutStats = getWorkoutStats();
  const recentTimes = getRecentTimes();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white mb-4 sm:mb-6">Progress Tracker</h2>
        <div className="text-center py-8 sm:py-12">
          <div className="flex justify-center mb-3 sm:mb-4">
            <svg className="w-10 h-10 text-[#ffed00] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white mb-4 sm:mb-6">Progress Tracker</h2>
        <div className="text-center py-8 sm:py-12">
          <div className="flex justify-center mb-3 sm:mb-4">
            <svg className="w-16 h-16 sm:w-20 sm:h-20 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Sessions Yet</h3>
          <p className="text-gray-400 text-sm sm:text-base px-4">
            Complete your first race simulation to start tracking progress!
          </p>
        </div>
      </div>
    );
  }

  // Mini bar chart component
  const MiniBarChart = ({ data, maxHeight = 60 }: { data: number[]; maxHeight?: number }) => {
    if (data.length === 0) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);

    return (
      <div className="flex items-end gap-1 h-16">
        {data.map((value, idx) => {
          const height = max === min ? maxHeight / 2 : ((value - min) / (max - min)) * (maxHeight - 10) + 10;
          const isLowest = value === min && data.length > 1;
          return (
            <div
              key={idx}
              className={`flex-1 rounded-t transition-all ${
                isLowest ? 'bg-[#ffed00]' : 'bg-[#ffed00]/60'
              }`}
              style={{ height: `${height}px` }}
              title={formatTime(value)}
            />
          );
        })}
      </div>
    );
  };

  // Trend indicator component
  const TrendIndicator = () => {
    const { trend: trendDir, percentage } = trend;

    if (trendDir === 'neutral') {
      return (
        <div className="text-gray-400 text-sm">
          Not enough data for trend analysis
        </div>
      );
    }

    const config = {
      improving: { color: 'text-[#ffed00]', bgColor: 'bg-[#ffed00]/20', label: 'Improving' },
      stable: { color: 'text-gray-400', bgColor: 'bg-[#404040]/20', label: 'Stable' },
      declining: { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Declining' }
    }[trendDir];

    const TrendIcon = () => {
      const iconClass = "w-5 h-5";
      if (trendDir === 'improving') {
        return (
          <svg className={`${iconClass} text-[#ffed00]`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        );
      } else if (trendDir === 'stable') {
        return (
          <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
          </svg>
        );
      } else {
        return (
          <svg className={`${iconClass} text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
          </svg>
        );
      }
    };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <TrendIcon />
        <span className={`font-medium ${config.color}`}>
          {config.label} {percentage > 0 ? `(${percentage.toFixed(1)}%)` : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white mb-4">Progress Tracker</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 sm:mb-6 bg-[#1f1f1f] p-1 rounded-lg">
        {(['overview', 'trends', 'history'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === tab
                ? 'bg-[#ffed00] text-black'
                : 'text-gray-400 hover:text-white hover:bg-[#262626]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
            <div className="p-3 sm:p-4 bg-[#ffed00] rounded-lg text-center">
              <div className="text-2xl sm:text-3xl font-black text-black">
                {bestTotal > 0 ? formatTime(bestTotal) : '--:--'}
              </div>
              <div className="text-xs sm:text-sm text-black/70 font-medium">Personal Best</div>
            </div>
            <div className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg text-center border border-[#262626]">
              <div className="text-2xl sm:text-3xl font-bold text-[#ffed00]">{sessions.length}</div>
              <div className="text-xs sm:text-sm text-gray-400">Total Sessions</div>
            </div>
            <div className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg text-center border border-[#262626]">
              <div className="text-2xl sm:text-3xl font-bold text-[#ffed00]">{workoutStats.thisWeek}</div>
              <div className="text-xs sm:text-sm text-gray-400">This Week</div>
            </div>
            <div className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg text-center border border-[#262626]">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#ffed00]">{workoutStats.streak}</span>
                {workoutStats.streak > 0 && (
                  <svg className="w-5 h-5 text-[#ffed00]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67m0 0a9 9 0 01-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" />
                  </svg>
                )}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Day Streak</div>
            </div>
          </div>

          {/* Performance Trend + Recent Times Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[#1f1f1f] rounded-lg border border-[#262626]">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Performance Trend</h4>
              <TrendIndicator />
            </div>
            <div className="p-4 bg-[#1f1f1f] rounded-lg border border-[#262626]">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Times</h4>
              {recentTimes.length > 0 ? (
                <MiniBarChart data={recentTimes} />
              ) : (
                <div className="text-gray-500 text-sm">Complete more workouts to see trends</div>
              )}
            </div>
          </div>

          {/* Ranking Distribution */}
          {Object.values(rankingDist).some(v => v > 0) && (
            <div className="p-4 bg-[#1f1f1f] rounded-lg mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Your Rankings</h4>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(rankingDist) as [PerformanceRanking, number][])
                  .filter(([, count]) => count > 0)
                  .map(([ranking, count]) => {
                    const info = getRankingInfo(ranking);
                    return (
                      <div
                        key={ranking}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${info.bgColor}`}
                      >
                        <RankingIconSVG icon={info.icon} className="w-5 h-5" />
                        <span className="text-white font-medium">{info.label}</span>
                        <span className="text-white/80 text-sm">×{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Station Personal Bests */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Station Personal Bests</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {HYROX_STATIONS.map(station => (
                <div key={station.id} className="p-2 sm:p-3 bg-[#1f1f1f] rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1 truncate">{station.name}</div>
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2">
                    <span className="text-lg sm:text-xl font-bold text-[#ffed00]">
                      {stationBests[station.id] ? formatTime(stationBests[station.id]) : '--:--'}
                    </span>
                    {averages[station.id] && stationBests[station.id] && (
                      <span className="text-xs text-gray-500">
                        avg: {formatTime(averages[station.id])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <>
          {/* Monthly Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-[#1f1f1f] rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-[#ffed00]">{workoutStats.thisMonth}</div>
              <div className="text-xs text-gray-400">This Month</div>
            </div>
            <div className="p-3 bg-[#1f1f1f] rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-300">
                {sessions.length > 0
                  ? formatTime(Math.round(sessions.filter(s => !s.partial).reduce((a, s) => a + s.totalTime, 0) / Math.max(1, sessions.filter(s => !s.partial).length)))
                  : '--:--'}
              </div>
              <div className="text-xs text-gray-400">Avg Time</div>
            </div>
            <div className="p-3 bg-[#1f1f1f] rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-[#ffed00]">
                {sessions.filter(s => s.isPR).length}
              </div>
              <div className="text-xs text-gray-400">PRs Set</div>
            </div>
          </div>

          {/* Performance Trend Card */}
          <div className="p-4 bg-[#1f1f1f] rounded-lg mb-6">
            <h4 className="text-base font-medium text-white mb-3">Overall Trend</h4>
            <TrendIndicator />
            <p className="text-gray-500 text-sm mt-3">
              Based on comparing your last 5 sessions to your previous 5 sessions
            </p>
          </div>

          {/* Recent Times Chart with Labels */}
          <div className="p-4 bg-[#1f1f1f] rounded-lg mb-6">
            <h4 className="text-base font-medium text-white mb-3">Performance History</h4>
            {recentTimes.length >= 2 ? (
              <>
                <MiniBarChart data={recentTimes} maxHeight={80} />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Oldest</span>
                  <span className="text-[#ffed00]">Yellow = Best</span>
                  <span>Recent</span>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm py-4 text-center">
                Complete at least 2 workouts to see performance history
              </div>
            )}
          </div>

          {/* Station Improvement */}
          <div className="p-4 bg-[#1f1f1f] rounded-lg">
            <h4 className="text-base font-medium text-white mb-3">Station Analysis</h4>
            <div className="space-y-3">
              {HYROX_STATIONS.filter(s => stationBests[s.id] && averages[s.id]).map(station => {
                const best = stationBests[station.id];
                const avg = averages[station.id];
                const diff = avg - best;
                const diffPercent = ((diff / avg) * 100).toFixed(0);

                return (
                  <div key={station.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 flex-1">{station.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#ffed00] font-medium">
                        {formatTime(best)}
                      </span>
                      <span className="text-xs text-gray-500">
                        (avg {formatTime(avg)})
                      </span>
                      {diff > 0 && (
                        <span className="text-xs text-[#ffed00]">
                          -{diffPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {HYROX_STATIONS.filter(s => stationBests[s.id] && averages[s.id]).length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">
                  Complete workouts with timed stations to see analysis
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2 sm:space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No workout history yet
            </div>
          ) : (
            sessions.slice(0, 20).map(session => (
              <div key={session.id} className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg relative">
                {/* Delete button */}
                <button
                  onClick={() => setDeleteConfirmId(session.id)}
                  className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete session"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2 pr-8">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-white font-medium text-sm sm:text-base">
                      {session.type === 'full_simulation' ? 'Full Simulation' :
                       session.type === 'quick_workout' ? 'Quick Workout' :
                       session.type === 'station_practice' ? 'Station Practice' : 'Custom'}
                    </span>
                    {session.partial && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#ffed00]/20 text-[#ffed00] rounded">
                        Partial
                      </span>
                    )}
                    {session.gymMode && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                        GYM
                      </span>
                    )}
                    {session.ranking && (
                      <span className={`text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${getRankingInfo(session.ranking).bgColor}`}>
                        <RankingIconSVG icon={getRankingInfo(session.ranking).icon} className="w-3 h-3" />
                        {getRankingInfo(session.ranking).label}
                      </span>
                    )}
                    {session.isPR && (
                      <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded text-white font-medium inline-flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2c.55 0 1 .45 1 1v1.07A8.001 8.001 0 0119.93 11H21c.55 0 1 .45 1 1s-.45 1-1 1h-1.07A8.001 8.001 0 0113 19.93V21c0 .55-.45 1-1 1s-1-.45-1-1v-1.07A8.001 8.001 0 014.07 13H3c-.55 0-1-.45-1-1s.45-1 1-1h1.07A8.001 8.001 0 0111 4.07V3c0-.55.45-1 1-1zm0 4a6 6 0 100 12 6 6 0 000-12z"/>
                        </svg>
                        PR
                      </span>
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-[#ffed00]">
                    {formatTime(session.totalTime)}
                  </div>
                </div>
                <div className="text-gray-500 text-xs mb-2">
                  {formatDate(session.date)}
                </div>

                {/* Station breakdown */}
                {session.stations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {session.stations.map(result => (
                      <span
                        key={result.stationId}
                        className={`text-xs px-1.5 sm:px-2 py-1 rounded ${
                          result.timeSeconds === stationBests[result.stationId]
                            ? 'bg-[#ffed00] text-black'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {getStationName(result.stationId)}: {formatTime(result.timeSeconds)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#141414] rounded-xl p-6 max-w-sm w-full border border-[#262626]">
                <h3 className="text-lg font-bold text-white mb-2">Delete Session?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  This will permanently delete this workout session. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2 bg-[#262626] hover:bg-[#333333] rounded-lg font-medium text-white text-sm border border-[#404040]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteSession(deleteConfirmId)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
