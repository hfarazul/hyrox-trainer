'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { WorkoutSession, StationResult, UserEquipment, RaceSimulatorConfig, WorkoutBlock, PerformanceRanking } from '@/lib/types';
import { getBestAlternative, calculateRanking, getRankingInfo } from '@/lib/workout-generator';
import { addSession, updateSession, generateId, formatTime, loadEquipment, loadSessions } from '@/lib/storage';

type SimulationPhase = 'not_started' | 'running' | 'station' | 'rest' | 'completed';

interface CurrentActivity {
  type: 'run' | 'station' | 'rest';
  blockIndex: number;
  startTime: number;
}

interface Props {
  config?: RaceSimulatorConfig;
  onComplete?: (sessionId?: string) => void;
}

export default function RaceSimulator({ config, onComplete }: Props) {
  const [phase, setPhase] = useState<SimulationPhase>('not_started');
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stationResults, setStationResults] = useState<StationResult[]>([]);
  const [runTimes, setRunTimes] = useState<number[]>([]);
  const [restTimes, setRestTimes] = useState<number[]>([]);
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [ranking, setRanking] = useState<PerformanceRanking | null>(null);
  const [isPR, setIsPR] = useState(false);

  // Use refs to avoid stale closures in timer
  const isPausedRef = useRef<boolean>(false);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  const lastTickTimeRef = useRef<number>(0);
  const activityElapsedRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);
  const skipAutoSaveRef = useRef<boolean>(false);

  // Get workout blocks from config or use default full simulation
  const workoutBlocks = useMemo(() => {
    if (config?.workout?.mainWorkout) {
      return config.workout.mainWorkout;
    }
    // Default: generate full simulation blocks
    const blocks: WorkoutBlock[] = [];
    for (const station of HYROX_STATIONS) {
      blocks.push({ type: 'run', distance: 1000, notes: '1km run at race pace' });
      blocks.push({ type: 'station', stationId: station.id, notes: station.officialRequirement });
    }
    return blocks;
  }, [config]);

  const workoutName = config?.workout?.name || 'Full HYROX Simulation';
  const workoutType = config?.type || 'full_simulation';

  // Calculate stats from blocks
  const stationBlocks = useMemo(() => workoutBlocks.filter(b => b.type === 'station'), [workoutBlocks]);
  const runBlocks = useMemo(() => workoutBlocks.filter(b => b.type === 'run'), [workoutBlocks]);

  useEffect(() => {
    setEquipment(loadEquipment());
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Reset lastTickTime when resuming from pause
  useEffect(() => {
    if (!isPaused && phase !== 'not_started' && phase !== 'completed') {
      lastTickTimeRef.current = Date.now();
    }
  }, [isPaused, phase]);

  // Auto-save when workout is paused (skip if triggered by stopAndSave)
  useEffect(() => {
    if (isPaused && phase !== 'not_started' && phase !== 'completed' && !skipAutoSaveRef.current) {
      // Delay slightly to ensure state is updated
      const timeoutId = setTimeout(() => {
        saveSession(true);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isPaused, phase]);

  // Timer effect with accumulator pattern
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = 0;

    const updateTimer = (timestamp: number) => {
      if (phase === 'not_started' || phase === 'completed' || isPausedRef.current) {
        return;
      }

      // Throttle updates to ~10fps for performance
      if (timestamp - lastUpdate >= 100) {
        const now = Date.now();
        const delta = now - lastTickTimeRef.current;
        lastTickTimeRef.current = now;
        setElapsedTime(prev => prev + delta);
        activityElapsedRef.current += delta;
        lastUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(updateTimer);
    };

    if (phase !== 'not_started' && phase !== 'completed' && !isPaused) {
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [phase, isPaused]);

  // Memoize to prevent unnecessary recalculations and stale closures
  const availableEquipmentIds = useMemo(
    () => equipment.filter(e => e.available).map(e => e.equipmentId),
    [equipment]
  );

  const startSimulation = () => {
    const now = Date.now();
    lastTickTimeRef.current = now;
    activityElapsedRef.current = 0;
    lastSessionIdRef.current = undefined; // Reset session ID for new workout
    setElapsedTime(0);

    // Start with first block
    const firstBlock = workoutBlocks[0];
    setPhase(firstBlock.type === 'run' ? 'running' : firstBlock.type === 'station' ? 'station' : 'rest');
    setCurrentActivity({ type: firstBlock.type, blockIndex: 0, startTime: now });
    setStationResults([]);
    setRunTimes([]);
    setRestTimes([]);
    setIsPaused(false);
  };

  const completeCurrentActivity = useCallback(() => {
    if (!currentActivity) return;

    const activityTime = activityElapsedRef.current;
    const currentBlock = workoutBlocks[currentActivity.blockIndex];

    // Record the time based on activity type
    if (currentBlock.type === 'run') {
      setRunTimes(prev => [...prev, activityTime]);
    } else if (currentBlock.type === 'station' && currentBlock.stationId) {
      const station = HYROX_STATIONS.find(s => s.id === currentBlock.stationId);
      const alternative = station ? getBestAlternative(station.id, availableEquipmentIds) : null;

      setStationResults(prev => [...prev, {
        stationId: currentBlock.stationId!,
        alternativeUsed: currentBlock.alternativeName || alternative?.name,
        timeSeconds: Math.round(activityTime / 1000),
        completed: true
      }]);
    } else if (currentBlock.type === 'rest') {
      setRestTimes(prev => [...prev, activityTime]);
    }

    // Move to next block or complete
    const nextBlockIndex = currentActivity.blockIndex + 1;

    if (nextBlockIndex < workoutBlocks.length) {
      const nextBlock = workoutBlocks[nextBlockIndex];
      setPhase(nextBlock.type === 'run' ? 'running' : nextBlock.type === 'station' ? 'station' : 'rest');
      setCurrentActivity({
        type: nextBlock.type,
        blockIndex: nextBlockIndex,
        startTime: Date.now()
      });
      // Reset activity timer for next activity
      activityElapsedRef.current = 0;
    } else {
      // Workout complete! Use accumulated elapsed time
      setElapsedTime(prev => {
        const finalTimeSeconds = Math.round(prev / 1000);

        // Calculate ranking based on estimated duration
        const estimatedDuration = config?.workout?.duration || 75;
        const calculatedRanking = calculateRanking(finalTimeSeconds, estimatedDuration);
        setRanking(calculatedRanking);

        // Check for PR (personal record)
        const sessions = loadSessions();
        const sameTypeSessions = sessions.filter(s => s.type === workoutType && !s.partial);
        const bestPreviousTime = sameTypeSessions.length > 0
          ? Math.min(...sameTypeSessions.map(s => s.totalTime))
          : Infinity;
        const isPersonalRecord = finalTimeSeconds < bestPreviousTime;
        setIsPR(isPersonalRecord);

        return prev;
      });

      setPhase('completed');
      setCurrentActivity(null);
    }
  }, [currentActivity, workoutBlocks, availableEquipmentIds, config, workoutType]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const saveSession = (isPartial = false) => {
    // Prevent duplicate saves from rapid clicks
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    const isUpdate = !!lastSessionIdRef.current;
    const sessionId = lastSessionIdRef.current || generateId();
    const session: WorkoutSession = {
      id: sessionId,
      date: new Date().toISOString(),
      type: workoutType,
      stations: stationResults,
      totalTime: Math.round(elapsedTime / 1000),
      partial: isPartial,
      ranking: isPartial ? undefined : ranking || undefined,
      isPR: isPartial ? undefined : isPR,
      estimatedDuration: config?.workout?.duration
    };

    if (isUpdate) {
      updateSession(session);
    } else {
      addSession(session);
      lastSessionIdRef.current = sessionId;
    }
    showNotification(isPartial ? 'Progress auto-saved!' : 'Session saved successfully!');

    // Reset saving flag after short delay
    setTimeout(() => {
      isSavingRef.current = false;
    }, 500);
  };

  const stopAndSave = () => {
    setShowStopConfirm(false);
    skipAutoSaveRef.current = true; // Prevent auto-save from triggering
    setIsPaused(true);
    saveSession(true);
    setTimeout(() => {
      skipAutoSaveRef.current = false;
      resetSimulation();
    }, 1500);
  };

  const resetSimulation = () => {
    const sessionId = lastSessionIdRef.current;
    setPhase('not_started');
    setCurrentActivity(null);
    setElapsedTime(0);
    setStationResults([]);
    setRunTimes([]);
    setRestTimes([]);
    setIsPaused(false);
    setRanking(null);
    setIsPR(false);
    lastTickTimeRef.current = 0;
    activityElapsedRef.current = 0;
    lastSessionIdRef.current = undefined;
    onComplete?.(sessionId);
  };

  const getCurrentBlock = () => {
    if (!currentActivity) return null;
    return workoutBlocks[currentActivity.blockIndex];
  };

  const getCurrentStation = () => {
    const block = getCurrentBlock();
    if (!block || block.type !== 'station' || !block.stationId) return null;
    return HYROX_STATIONS.find(s => s.id === block.stationId);
  };

  const getCurrentAlternative = () => {
    const block = getCurrentBlock();
    if (block?.alternativeName) return { name: block.alternativeName, description: block.notes };
    const station = getCurrentStation();
    if (!station) return null;
    return getBestAlternative(station.id, availableEquipmentIds);
  };

  const getActivityTime = () => {
    if (!currentActivity) return 0;
    return activityElapsedRef.current;
  };

  const getRunDistance = () => {
    const block = getCurrentBlock();
    if (block?.distance) return `${block.distance}m`;
    return '1km';
  };

  // Calculate progress
  const completedBlocks = currentActivity ? currentActivity.blockIndex : workoutBlocks.length;
  const progressPercent = (completedBlocks / workoutBlocks.length) * 100;

  return (
    <div className="bg-gray-900 rounded-xl p-4 sm:p-6 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-xl z-50 text-sm font-medium animate-bounce">
          {notification}
        </div>
      )}

      <h2 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 pr-8">{workoutName}</h2>

      {phase === 'not_started' && (
        <div className="text-center py-8 sm:py-12">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🏁</div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Ready to Start?</h3>
          <p className="text-gray-400 mb-5 sm:mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
            {stationBlocks.length} station{stationBlocks.length !== 1 ? 's' : ''}
            {runBlocks.length > 0 && ` and ${runBlocks.length} run${runBlocks.length !== 1 ? 's' : ''}`}.
            We&apos;ll track your time for each segment.
          </p>
          <button
            onClick={startSimulation}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-lg sm:text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Start Workout
          </button>
        </div>
      )}

      {(phase === 'running' || phase === 'station' || phase === 'rest') && (
        <div>
          {/* Main Timer */}
          <div className="text-center mb-4 sm:mb-8">
            <div className="text-4xl sm:text-6xl font-mono font-bold text-white mb-1 sm:mb-2">
              {formatTime(Math.round(elapsedTime / 1000))}
            </div>
            <div className="text-gray-400 text-sm sm:text-base">Total Time</div>
          </div>

          {/* Current Activity */}
          <div className={`p-4 sm:p-6 rounded-xl mb-4 sm:mb-6 ${
            phase === 'running'
              ? 'bg-blue-900/50 border-2 border-blue-500'
              : phase === 'rest'
              ? 'bg-gray-800/50 border-2 border-gray-600'
              : 'bg-orange-900/50 border-2 border-orange-500'
          }`}>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">
                {phase === 'running' ? '🏃' : phase === 'rest' ? '😮‍💨' : '💪'}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mb-1">
                Block {(currentActivity?.blockIndex ?? 0) + 1}/{workoutBlocks.length}
              </div>
              <div className="text-xl sm:text-3xl font-bold text-white mb-2">
                {phase === 'running'
                  ? `${getRunDistance()} Run`
                  : phase === 'rest'
                  ? 'Rest'
                  : getCurrentBlock()?.alternativeName || getCurrentAlternative()?.name || getCurrentStation()?.name}
              </div>
              {phase === 'station' && (getCurrentAlternative() || getCurrentBlock()?.notes) && (
                <p className="text-gray-300 mb-2 text-sm sm:text-base">
                  {getCurrentBlock()?.notes || getCurrentAlternative()?.description}
                </p>
              )}
              {phase === 'rest' && getCurrentBlock()?.notes && (
                <p className="text-gray-300 mb-2 text-sm sm:text-base">{getCurrentBlock()?.notes}</p>
              )}
              <div className="text-3xl sm:text-4xl font-mono text-orange-400">
                {formatTime(Math.round(getActivityTime() / 1000))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm sm:text-base"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={completeCurrentActivity}
              disabled={isPaused}
              className="px-6 sm:px-8 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base"
            >
              Complete {phase === 'running' ? 'Run' : phase === 'rest' ? 'Rest' : 'Station'}
            </button>
            <button
              onClick={() => setShowStopConfirm(true)}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
            >
              Stop & Save
            </button>
          </div>

          {/* Stop & Save Confirmation Modal */}
          {showStopConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold text-white mb-2">Stop Workout?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Your progress will be saved. You&apos;ve completed {stationResults.length} station{stationResults.length !== 1 ? 's' : ''} so far.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStopConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white text-sm"
                  >
                    Continue
                  </button>
                  <button
                    onClick={stopAndSave}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium text-white text-sm"
                  >
                    Stop & Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mt-6 sm:mt-8">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Start</span>
              <span>{Math.round(progressPercent)}% complete</span>
              <span>Finish</span>
            </div>
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div>
          <div className="text-center py-6 sm:py-8">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Workout Complete!</h3>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-orange-400 mb-4">
              {formatTime(Math.round(elapsedTime / 1000))}
            </div>

            {/* Ranking Badge */}
            {ranking && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getRankingInfo(ranking).bgColor}`}>
                  <span className="text-2xl">{getRankingInfo(ranking).emoji}</span>
                  <span className="text-xl font-bold text-white">{getRankingInfo(ranking).label}</span>
                </div>
                <p className={`text-sm ${getRankingInfo(ranking).color}`}>
                  {getRankingInfo(ranking).description}
                </p>
                {isPR && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse">
                    <span className="text-lg">🔥</span>
                    <span className="text-sm font-bold text-white">NEW PERSONAL RECORD!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Breakdown */}
          <div className="space-y-3 sm:space-y-4 mb-6">
            <h4 className="text-base sm:text-lg font-semibold text-white">Breakdown</h4>

            {/* Runs */}
            {runTimes.length > 0 && (
              <div className="p-3 sm:p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium text-sm sm:text-base">{runTimes.length}x Runs</span>
                  <span className="text-blue-400 font-bold text-sm sm:text-base">
                    {formatTime(Math.round(runTimes.reduce((a, b) => a + b, 0) / 1000))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {runTimes.map((time, idx) => (
                    <span key={idx} className="text-xs sm:text-sm px-2 py-1 bg-blue-900 rounded text-blue-300">
                      Run {idx + 1}: {formatTime(Math.round(time / 1000))}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stations */}
            {stationResults.map((result, idx) => {
              const station = HYROX_STATIONS.find(s => s.id === result.stationId);
              return (
                <div key={`${result.stationId}-${idx}`} className="p-3 sm:p-4 bg-gray-800 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center bg-orange-500 rounded-full text-white font-bold text-xs sm:text-sm">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-white font-medium text-sm sm:text-base truncate">
                        {result.alternativeUsed ?? station?.name}
                      </div>
                      {result.alternativeUsed && result.alternativeUsed !== station?.name && (
                        <div className="text-xs text-gray-500 truncate">({station?.name})</div>
                      )}
                    </div>
                  </div>
                  <span className="text-orange-400 font-bold text-lg sm:text-xl flex-shrink-0">
                    {formatTime(result.timeSeconds)}
                  </span>
                </div>
              );
            })}

            {/* Rest Times */}
            {restTimes.length > 0 && (
              <div className="p-3 sm:p-4 bg-gray-700/30 border border-gray-600 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium text-sm sm:text-base">Rest Time</span>
                  <span className="text-gray-400 font-bold text-sm sm:text-base">
                    {formatTime(Math.round(restTimes.reduce((a, b) => a + b, 0) / 1000))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={() => saveSession(false)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-sm sm:text-base"
            >
              Save Results
            </button>
            <button
              onClick={resetSimulation}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base"
            >
              New Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
