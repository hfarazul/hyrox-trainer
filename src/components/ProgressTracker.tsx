'use client';

import { useState, useEffect } from 'react';
import { WorkoutSession, PerformanceRanking } from '@/lib/types';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { loadSessions, formatTime } from '@/lib/storage';
import { getRankingInfo } from '@/lib/workout-generator';

type TabType = 'overview' | 'trends' | 'history';

export default function ProgressTracker() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

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

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Progress Tracker</h2>
        <div className="text-center py-8 sm:py-12">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📊</div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Sessions Yet</h3>
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
                isLowest ? 'bg-green-500' : 'bg-orange-500'
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
      improving: { icon: '📈', color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Improving' },
      stable: { icon: '➡️', color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Stable' },
      declining: { icon: '📉', color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Declining' }
    }[trendDir];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <span className="text-lg">{config.icon}</span>
        <span className={`font-medium ${config.color}`}>
          {config.label} {percentage > 0 ? `(${percentage.toFixed(1)}%)` : ''}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-2xl font-bold text-white mb-4">Progress Tracker</h2>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 sm:mb-6 bg-gray-800 p-1 rounded-lg">
        {(['overview', 'trends', 'history'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
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
            <div className="p-3 sm:p-4 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {bestTotal > 0 ? formatTime(bestTotal) : '--:--'}
              </div>
              <div className="text-xs sm:text-sm text-yellow-100">Personal Best</div>
            </div>
            <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-400">{sessions.length}</div>
              <div className="text-xs sm:text-sm text-gray-400">Total Sessions</div>
            </div>
            <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400">{workoutStats.thisWeek}</div>
              <div className="text-xs sm:text-sm text-gray-400">This Week</div>
            </div>
            <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-red-400">{workoutStats.streak}</span>
                {workoutStats.streak > 0 && <span className="text-lg">🔥</span>}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Day Streak</div>
            </div>
          </div>

          {/* Performance Trend + Recent Times Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Performance Trend</h4>
              <TrendIndicator />
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
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
            <div className="p-4 bg-gray-800 rounded-lg mb-6">
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
                        <span className="text-lg">{info.emoji}</span>
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
                <div key={station.id} className="p-2 sm:p-3 bg-gray-800 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1 truncate">{station.name}</div>
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2">
                    <span className="text-lg sm:text-xl font-bold text-orange-400">
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
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-400">{workoutStats.thisMonth}</div>
              <div className="text-xs text-gray-400">This Month</div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-400">
                {sessions.length > 0
                  ? formatTime(Math.round(sessions.filter(s => !s.partial).reduce((a, s) => a + s.totalTime, 0) / Math.max(1, sessions.filter(s => !s.partial).length)))
                  : '--:--'}
              </div>
              <div className="text-xs text-gray-400">Avg Time</div>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-400">
                {sessions.filter(s => s.isPR).length}
              </div>
              <div className="text-xs text-gray-400">PRs Set</div>
            </div>
          </div>

          {/* Performance Trend Card */}
          <div className="p-4 bg-gray-800 rounded-lg mb-6">
            <h4 className="text-base font-medium text-white mb-3">Overall Trend</h4>
            <TrendIndicator />
            <p className="text-gray-500 text-sm mt-3">
              Based on comparing your last 5 sessions to your previous 5 sessions
            </p>
          </div>

          {/* Recent Times Chart with Labels */}
          <div className="p-4 bg-gray-800 rounded-lg mb-6">
            <h4 className="text-base font-medium text-white mb-3">Performance History</h4>
            {recentTimes.length >= 2 ? (
              <>
                <MiniBarChart data={recentTimes} maxHeight={80} />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Oldest</span>
                  <span className="text-green-400">Green = Best</span>
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
          <div className="p-4 bg-gray-800 rounded-lg">
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
                      <span className="text-sm text-orange-400 font-medium">
                        {formatTime(best)}
                      </span>
                      <span className="text-xs text-gray-500">
                        (avg {formatTime(avg)})
                      </span>
                      {diff > 0 && (
                        <span className="text-xs text-green-400">
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
              <div key={session.id} className="p-3 sm:p-4 bg-gray-800 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-white font-medium text-sm sm:text-base">
                      {session.type === 'full_simulation' ? 'Full Simulation' :
                       session.type === 'quick_workout' ? 'Quick Workout' :
                       session.type === 'race_coverage' ? 'Race Coverage' : 'Station Practice'}
                    </span>
                    {session.partial && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 rounded">
                        Partial
                      </span>
                    )}
                    {session.ranking && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getRankingInfo(session.ranking).bgColor}`}>
                        {getRankingInfo(session.ranking).emoji} {getRankingInfo(session.ranking).label}
                      </span>
                    )}
                    {session.isPR && (
                      <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded text-white font-medium">
                        🔥 PR
                      </span>
                    )}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-400">
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
                            ? 'bg-yellow-600 text-yellow-100'
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
        </div>
      )}
    </div>
  );
}
