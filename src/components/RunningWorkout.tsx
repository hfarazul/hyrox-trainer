'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '@/lib/storage';

interface RunningWorkoutProps {
  runType: 'zone2' | 'tempo' | 'intervals';
  duration: number; // minutes
  targetPace?: string;
  hrZone?: string;
  intervals?: {
    reps: number;
    distance: number;
    rest: number; // seconds
  };
  notes?: string;
  onComplete: () => void;
  onBack?: () => void;
}

export default function RunningWorkout({
  runType,
  duration,
  targetPace,
  hrZone,
  intervals,
  notes,
  onComplete,
  onBack,
}: RunningWorkoutProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetDurationSeconds = duration * 60;
  const progress = Math.min((elapsedSeconds / targetDurationSeconds) * 100, 100);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleStartPause = () => {
    if (isRunning) {
      cleanup();
      setIsRunning(false);
    } else {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    cleanup();
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const getRunTypeLabel = () => {
    switch (runType) {
      case 'zone2':
        return 'Zone 2 Easy Run';
      case 'tempo':
        return 'Tempo Run';
      case 'intervals':
        return 'Interval Training';
    }
  };

  const getRunTypeDescription = () => {
    switch (runType) {
      case 'zone2':
        return 'Conversational pace - you should be able to hold a conversation while running';
      case 'tempo':
        return 'Comfortably hard - challenging but sustainable for the duration';
      case 'intervals':
        return intervals
          ? `${intervals.reps} x ${intervals.distance}m with ${intervals.rest}s rest`
          : 'High intensity repeats with rest periods';
    }
  };

  const getRunTypeIcon = () => {
    const iconClass = 'w-8 h-8';
    if (runType === 'intervals') {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  };

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6 min-h-[calc(100vh-12rem)]">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ffed00]/20 text-[#ffed00] mb-4">
          {getRunTypeIcon()}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-wide uppercase text-white mb-2">
          {getRunTypeLabel()}
        </h2>
        <p className="text-gray-400">
          {duration} minutes {hrZone && `@ ${hrZone}`}
        </p>
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative w-48 h-48 sm:w-64 sm:h-64">
          {/* Progress ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#262626"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#ffed00"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-black text-white tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-gray-500 text-sm mt-1">
              of {formatTime(targetDurationSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Run Details */}
      <div className="bg-[#1f1f1f] rounded-lg p-4 mb-6 space-y-3">
        {targetPace && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target Pace</span>
            <span className="text-white font-semibold">{targetPace}</span>
          </div>
        )}
        {hrZone && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Heart Rate Zone</span>
            <span className="text-white font-semibold">{hrZone}</span>
          </div>
        )}
        {intervals && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Intervals</span>
            <span className="text-white font-semibold">
              {intervals.reps} x {intervals.distance}m / {intervals.rest}s rest
            </span>
          </div>
        )}
        <p className="text-gray-500 text-sm pt-2 border-t border-[#333]">
          {notes || getRunTypeDescription()}
        </p>
      </div>

      {/* Timer Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleStartPause}
          className={`flex-1 py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-colors ${
            isRunning
              ? 'bg-[#333] hover:bg-[#404040] text-white'
              : 'bg-[#ffed00] hover:bg-[#e6d600] text-black'
          }`}
        >
          {isRunning ? 'Pause' : elapsedSeconds > 0 ? 'Resume' : 'Start'}
        </button>
        {elapsedSeconds > 0 && (
          <button
            onClick={handleReset}
            className="px-6 py-4 rounded-xl bg-[#262626] hover:bg-[#333] text-gray-400 font-bold transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Complete Button */}
      <button
        onClick={onComplete}
        className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-xl font-black text-white text-lg uppercase tracking-wide transition-colors"
      >
        Complete Workout
      </button>
    </div>
  );
}
