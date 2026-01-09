'use client';

import { useState, useEffect } from 'react';
import { WorkoutSession } from '@/lib/types';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { loadSessions, formatTime } from '@/lib/storage';

export default function ProgressTracker() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const getStationName = (stationId: string) =>
    HYROX_STATIONS.find(s => s.id === stationId)?.name || stationId;

  const getPersonalBests = () => {
    const bests: Record<string, number> = {};
    let bestTotal = Infinity;

    for (const session of sessions) {
      if (session.totalTime > 0 && session.totalTime < bestTotal) {
        bestTotal = session.totalTime;
      }
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

  const { stationBests, bestTotal } = getPersonalBests();
  const averages = getAverageTimes();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Progress Tracker</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-orange-400">{sessions.length}</div>
          <div className="text-xs sm:text-sm text-gray-400">Total Sessions</div>
        </div>
        <div className="p-3 sm:p-4 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {bestTotal > 0 ? formatTime(bestTotal) : '--:--'}
          </div>
          <div className="text-xs sm:text-sm text-yellow-100">Best Time</div>
        </div>
        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">
            {sessions.length > 0
              ? formatTime(Math.round(sessions.reduce((a, s) => a + s.totalTime, 0) / sessions.length))
              : '--:--'}
          </div>
          <div className="text-xs sm:text-sm text-gray-400">Avg Time</div>
        </div>
        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-green-400">
            {sessions.filter(s => s.type === 'full_simulation').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-400">Full Sims</div>
        </div>
      </div>

      {/* Station Personal Bests */}
      <div className="mb-6 sm:mb-8">
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

      {/* Recent Sessions */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Recent Sessions</h3>
        <div className="space-y-2 sm:space-y-3">
          {sessions.slice(0, 10).map(session => (
            <div key={session.id} className="p-3 sm:p-4 bg-gray-800 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-white font-medium text-sm sm:text-base">
                    {session.type === 'full_simulation' ? 'Full Simulation' :
                     session.type === 'quick_workout' ? 'Quick Workout' : 'Station Practice'}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm">
                    {formatDate(session.date)}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-orange-400">
                  {formatTime(session.totalTime)}
                </div>
              </div>

              {/* Station breakdown */}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
