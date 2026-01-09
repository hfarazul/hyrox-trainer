'use client';

import { useState, useEffect, useCallback } from 'react';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { WorkoutSession, StationResult, UserEquipment } from '@/lib/types';
import { getBestAlternative } from '@/lib/workout-generator';
import { addSession, generateId, formatTime, loadEquipment } from '@/lib/storage';

type SimulationPhase = 'not_started' | 'running' | 'station' | 'completed';

interface CurrentActivity {
  type: 'run' | 'station';
  stationIndex: number;
  startTime: number;
}

export default function RaceSimulator() {
  const [phase, setPhase] = useState<SimulationPhase>('not_started');
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stationResults, setStationResults] = useState<StationResult[]>([]);
  const [runTimes, setRunTimes] = useState<number[]>([]);
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  useEffect(() => {
    setEquipment(loadEquipment());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase !== 'not_started' && phase !== 'completed' && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - sessionStartTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [phase, isPaused, sessionStartTime]);

  const availableEquipmentIds = equipment.filter(e => e.available).map(e => e.equipmentId);

  const startSimulation = () => {
    const now = Date.now();
    setSessionStartTime(now);
    setElapsedTime(0);
    setPhase('running');
    setCurrentActivity({ type: 'run', stationIndex: 0, startTime: now });
    setStationResults([]);
    setRunTimes([]);
  };

  const completeCurrentActivity = useCallback(() => {
    if (!currentActivity) return;

    const activityTime = Date.now() - currentActivity.startTime;

    if (currentActivity.type === 'run') {
      setRunTimes(prev => [...prev, activityTime]);
      setPhase('station');
      setCurrentActivity({
        type: 'station',
        stationIndex: currentActivity.stationIndex,
        startTime: Date.now()
      });
    } else {
      const station = HYROX_STATIONS[currentActivity.stationIndex];
      const alternative = getBestAlternative(station.id, availableEquipmentIds);

      setStationResults(prev => [...prev, {
        stationId: station.id,
        alternativeUsed: alternative?.name,
        timeSeconds: Math.round(activityTime / 1000),
        completed: true
      }]);

      if (currentActivity.stationIndex < 7) {
        setPhase('running');
        setCurrentActivity({
          type: 'run',
          stationIndex: currentActivity.stationIndex + 1,
          startTime: Date.now()
        });
      } else {
        // Race complete!
        setPhase('completed');
        setCurrentActivity(null);
      }
    }
  }, [currentActivity, availableEquipmentIds]);

  const saveSession = () => {
    const session: WorkoutSession = {
      id: generateId(),
      date: new Date().toISOString(),
      type: 'full_simulation',
      stations: stationResults,
      totalTime: Math.round(elapsedTime / 1000)
    };
    addSession(session);
    alert('Session saved!');
  };

  const resetSimulation = () => {
    setPhase('not_started');
    setCurrentActivity(null);
    setElapsedTime(0);
    setStationResults([]);
    setRunTimes([]);
    setIsPaused(false);
    setSessionStartTime(0);
  };

  const getCurrentStation = () => {
    if (!currentActivity) return null;
    return HYROX_STATIONS[currentActivity.stationIndex];
  };

  const getCurrentAlternative = () => {
    const station = getCurrentStation();
    if (!station) return null;
    return getBestAlternative(station.id, availableEquipmentIds);
  };

  const getActivityTime = () => {
    if (!currentActivity) return 0;
    return Date.now() - currentActivity.startTime;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Race Simulator</h2>

      {phase === 'not_started' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏁</div>
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Race?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Complete a full HYROX simulation with all 8 stations and 8x 1km runs.
            We&apos;ll track your time for each segment.
          </p>
          <button
            onClick={startSimulation}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-xl font-bold text-white"
          >
            Start Simulation
          </button>
        </div>
      )}

      {(phase === 'running' || phase === 'station') && (
        <div>
          {/* Main Timer */}
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold text-white mb-2">
              {formatTime(Math.round(elapsedTime / 1000))}
            </div>
            <div className="text-gray-400">Total Time</div>
          </div>

          {/* Current Activity */}
          <div className={`p-6 rounded-xl mb-6 ${
            phase === 'running'
              ? 'bg-blue-900/50 border-2 border-blue-500'
              : 'bg-orange-900/50 border-2 border-orange-500'
          }`}>
            <div className="text-center">
              <div className="text-5xl mb-3">{phase === 'running' ? '🏃' : '💪'}</div>
              <div className="text-sm text-gray-400 mb-1">
                {phase === 'running' ? `Run ${(currentActivity?.stationIndex || 0) + 1}/8` : `Station ${(currentActivity?.stationIndex || 0) + 1}/8`}
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {phase === 'running'
                  ? '1km Run'
                  : getCurrentAlternative()?.name || getCurrentStation()?.name}
              </div>
              {phase === 'station' && getCurrentAlternative() && (
                <p className="text-gray-300 mb-2">{getCurrentAlternative()?.description}</p>
              )}
              <div className="text-4xl font-mono text-orange-400">
                {formatTime(Math.round(getActivityTime() / 1000))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={completeCurrentActivity}
              disabled={isPaused}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg font-semibold text-white"
            >
              Complete {phase === 'running' ? 'Run' : 'Station'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white"
            >
              Reset
            </button>
          </div>

          {/* Progress */}
          <div className="mt-8">
            <div className="flex gap-1 mb-2">
              {HYROX_STATIONS.map((station, idx) => (
                <div
                  key={station.id}
                  className={`flex-1 h-2 rounded ${
                    stationResults.find(r => r.stationId === station.id)
                      ? 'bg-green-500'
                      : currentActivity?.stationIndex === idx
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Station 1</span>
              <span>Station 8</span>
            </div>
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl font-bold text-white mb-2">Race Complete!</h3>
            <div className="text-5xl font-mono font-bold text-orange-400 mb-4">
              {formatTime(Math.round(elapsedTime / 1000))}
            </div>
          </div>

          {/* Results Breakdown */}
          <div className="space-y-4 mb-6">
            <h4 className="text-lg font-semibold text-white">Breakdown</h4>

            {/* Runs */}
            <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">8x 1km Runs</span>
                <span className="text-blue-400 font-bold">
                  {formatTime(Math.round(runTimes.reduce((a, b) => a + b, 0) / 1000))}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {runTimes.map((time, idx) => (
                  <span key={idx} className="text-sm px-2 py-1 bg-blue-900 rounded text-blue-300">
                    Run {idx + 1}: {formatTime(Math.round(time / 1000))}
                  </span>
                ))}
              </div>
            </div>

            {/* Stations */}
            {stationResults.map((result, idx) => {
              const station = HYROX_STATIONS.find(s => s.id === result.stationId);
              return (
                <div key={result.stationId} className="p-4 bg-gray-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-orange-500 rounded-full text-white font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-white font-medium">
                        {result.alternativeUsed || station?.name}
                      </div>
                      {result.alternativeUsed && result.alternativeUsed !== station?.name && (
                        <div className="text-xs text-gray-500">({station?.name})</div>
                      )}
                    </div>
                  </div>
                  <span className="text-orange-400 font-bold text-xl">
                    {formatTime(result.timeSeconds)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button
              onClick={saveSession}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-white"
            >
              Save Results
            </button>
            <button
              onClick={resetSimulation}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-white"
            >
              New Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
