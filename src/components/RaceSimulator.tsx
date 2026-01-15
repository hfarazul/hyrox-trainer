'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HYROX_STATIONS } from '@/lib/hyrox-data';
import { WorkoutSession, StationResult, UserEquipment, RaceSimulatorConfig, WorkoutBlock, PerformanceRanking } from '@/lib/types';
import { getBestAlternative, calculateRanking, getRankingInfo, RankingIcon } from '@/lib/workout-generator';
import { addSession, updateSession, generateId, formatTime, loadEquipment, loadSessions } from '@/lib/storage';
import { addSessionAPI } from '@/lib/api';
import { useSession } from 'next-auth/react';

// SVG icon component for rankings
function RankingIconSVG({ icon, className = "w-6 h-6" }: { icon: RankingIcon; className?: string }) {
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
  const { data: authSession } = useSession();
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

  const saveSession = async (isPartial = false) => {
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
      estimatedDuration: config?.workout?.duration,
      gymMode: config?.gymMode,
    };

    // Save to database for authenticated users, localStorage for guests
    if (authSession?.user?.id && !isUpdate) {
      try {
        const savedSession = await addSessionAPI({
          date: session.date,
          type: session.type,
          totalTime: session.totalTime,
          notes: session.partial ? 'Partial workout' : undefined,
          stations: session.stations.map(s => ({
            stationId: s.stationId,
            alternativeUsed: s.alternativeUsed,
            timeSeconds: s.timeSeconds,
            completed: s.completed ?? true,
            notes: s.notes,
          })),
        });
        lastSessionIdRef.current = savedSession.id;
        // Also save to localStorage as backup
        session.id = savedSession.id;
        addSession(session);
      } catch (error) {
        console.error('Failed to save to database, using localStorage:', error);
        addSession(session);
        lastSessionIdRef.current = sessionId;
      }
    } else if (isUpdate) {
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
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 bg-[#ffed00] text-black px-4 py-3 rounded-lg shadow-xl z-50 text-sm font-medium animate-bounce">
          {notification}
        </div>
      )}

      <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white mb-4 sm:mb-6 pr-8">{workoutName}</h2>

      {phase === 'not_started' && (
        <div className="text-center py-8 sm:py-12">
          <div className="flex justify-center mb-3 sm:mb-4">
            <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Ready to Start?</h3>
          <p className="text-gray-400 mb-5 sm:mb-6 max-w-md mx-auto text-sm sm:text-base px-4">
            {stationBlocks.length} station{stationBlocks.length !== 1 ? 's' : ''}
            {runBlocks.length > 0 && ` and ${runBlocks.length} run${runBlocks.length !== 1 ? 's' : ''}`}.
            We&apos;ll track your time for each segment.
          </p>
          <button
            onClick={startSimulation}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-[#ffed00] hover:bg-[#e6d600] rounded-xl text-lg sm:text-xl font-black text-black focus:outline-none focus:ring-2 focus:ring-[#ffed00] focus:ring-offset-2 focus:ring-offset-black uppercase tracking-wide"
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
              ? 'bg-[#1f1f1f]/50 border-2 border-[#404040]'
              : phase === 'rest'
              ? 'bg-[#1f1f1f]/50 border-2 border-[#404040]'
              : 'bg-[#ffed00]/10 border-2 border-[#ffed00]'
          }`}>
            <div className="text-center">
              <div className="flex justify-center mb-2 sm:mb-3">
                {phase === 'running' ? (
                  <svg className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : phase === 'rest' ? (
                  <svg className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 sm:w-14 sm:h-14 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4v12H4V8zm6-4h4v16h-4V4zm6 8h4v8h-4v-8z" />
                  </svg>
                )}
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
              <div className="text-3xl sm:text-4xl font-mono text-[#ffed00]">
                {formatTime(Math.round(getActivityTime() / 1000))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-6 py-3 bg-[#262626] hover:bg-[#333333] rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#404040] text-sm sm:text-base"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={completeCurrentActivity}
              disabled={isPaused}
              className="px-6 sm:px-8 py-3 bg-[#ffed00] hover:bg-[#e6d600] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#ffed00] text-sm sm:text-base"
            >
              Complete {phase === 'running' ? 'Run' : phase === 'rest' ? 'Rest' : 'Station'}
            </button>
            <button
              onClick={() => setShowStopConfirm(true)}
              className="px-6 py-3 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#ffed00] text-sm sm:text-base"
            >
              Stop & Save
            </button>
          </div>

          {/* Stop & Save Confirmation Modal */}
          {showStopConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1f1f1f] rounded-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-bold text-white mb-2">Stop Workout?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Your progress will be saved. You&apos;ve completed {stationResults.length} station{stationResults.length !== 1 ? 's' : ''} so far.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStopConfirm(false)}
                    className="flex-1 px-4 py-2 bg-[#262626] hover:bg-[#333333] rounded-lg font-medium text-white text-sm"
                  >
                    Continue
                  </button>
                  <button
                    onClick={stopAndSave}
                    className="flex-1 px-4 py-2 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg font-medium text-black text-sm"
                  >
                    Stop & Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mt-6 sm:mt-8">
            <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffed00] transition-all duration-300"
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
            <div className="flex justify-center mb-3 sm:mb-4">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#ffed00]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Workout Complete!</h3>
            <div className="text-4xl sm:text-5xl font-mono font-bold text-[#ffed00] mb-4">
              {formatTime(Math.round(elapsedTime / 1000))}
            </div>

            {/* Ranking Badge */}
            {ranking && (
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getRankingInfo(ranking).bgColor}`}>
                  <RankingIconSVG icon={getRankingInfo(ranking).icon} className="w-7 h-7" />
                  <span className="text-xl font-bold text-white">{getRankingInfo(ranking).label}</span>
                </div>
                <p className={`text-sm ${getRankingInfo(ranking).color}`}>
                  {getRankingInfo(ranking).description}
                </p>
                {isPR && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse">
                    <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2c.55 0 1 .45 1 1v1.07A8.001 8.001 0 0119.93 11H21c.55 0 1 .45 1 1s-.45 1-1 1h-1.07A8.001 8.001 0 0113 19.93V21c0 .55-.45 1-1 1s-1-.45-1-1v-1.07A8.001 8.001 0 014.07 13H3c-.55 0-1-.45-1-1s.45-1 1-1h1.07A8.001 8.001 0 0111 4.07V3c0-.55.45-1 1-1zm0 4a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z"/>
                    </svg>
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
              <div className="p-3 sm:p-4 bg-[#1f1f1f]/50 border border-[#404040] rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium text-sm sm:text-base">{runTimes.length}x Runs</span>
                  <span className="text-gray-300 font-bold text-sm sm:text-base">
                    {formatTime(Math.round(runTimes.reduce((a, b) => a + b, 0) / 1000))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {runTimes.map((time, idx) => (
                    <span key={idx} className="text-xs sm:text-sm px-2 py-1 bg-[#262626] rounded text-gray-300">
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
                <div key={`${result.stationId}-${idx}`} className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center bg-[#ffed00] rounded-full text-black font-bold text-xs sm:text-sm">
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
                  <span className="text-[#ffed00] font-bold text-lg sm:text-xl flex-shrink-0">
                    {formatTime(result.timeSeconds)}
                  </span>
                </div>
              );
            })}

            {/* Rest Times */}
            {restTimes.length > 0 && (
              <div className="p-3 sm:p-4 bg-[#262626]/30 border border-[#404040] rounded-lg">
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
              className="px-6 py-3 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg font-black text-black focus:outline-none focus:ring-2 focus:ring-[#ffed00] text-sm sm:text-base uppercase tracking-wide"
            >
              New Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
