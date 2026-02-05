'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import EquipmentSelector from '@/components/EquipmentSelector';
import WorkoutDisplay from '@/components/WorkoutDisplay';
import RaceSimulator from '@/components/RaceSimulator';
import PacingCalculator from '@/components/PacingCalculator';
import ProgressTracker from '@/components/ProgressTracker';
import ProgramSelector from '@/components/ProgramSelector';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import RunningWorkout, { RunningWorkoutCompletionData } from '@/components/RunningWorkout';
import StrengthWorkout, { StrengthWorkoutCompletionData } from '@/components/StrengthWorkout';
import PerformanceInsights from '@/components/PerformanceInsights';
import { UserEquipment, GeneratedWorkout, RaceSimulatorConfig, UserProgram, ScheduledWorkout, ScheduledWorkoutExtended, ProgramPersonalization } from '@/lib/types';
import { loadEquipment, loadExcludedExercises, saveExcludedExercises, loadUserProgram, saveUserProgram, clearUserProgram, generateId, addCompletedProgramWorkout, saveIncludeRuns, loadIncludeRuns } from '@/lib/storage';
import { fetchEquipment, fetchUserProgram, startProgramAPI, quitProgramAPI, completeWorkoutAPI, createPersonalizedProgramAPI } from '@/lib/api';
import { GeneratedProgram } from '@/lib/program-generator';
import { generateFullSimulation, generateQuickWorkout, generateStationPractice, generateRaceCoverageWorkout, getAllExerciseNames } from '@/lib/workout-generator';
import { HYROX_STATIONS, DIVISION_INFO } from '@/lib/hyrox-data';

type Division = 'men_open' | 'men_pro' | 'women_open' | 'women_pro';

type Tab = 'workout' | 'simulator' | 'pacing' | 'progress' | 'equipment' | 'programs';

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('workout');
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null);
  const [workoutType, setWorkoutType] = useState<'full' | 'quick' | 'station' | 'coverage'>('full');
  const [quickDuration, setQuickDuration] = useState('30');
  const [quickFocus, setQuickFocus] = useState<'cardio' | 'strength' | 'mixed'>('mixed');
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [coveragePercent, setCoveragePercent] = useState(50);
  const [simulatorConfig, setSimulatorConfig] = useState<RaceSimulatorConfig | null>(null);
  const [excludedExercises, setExcludedExercises] = useState<string[]>([]);
  const [showExcludePanel, setShowExcludePanel] = useState(false);
  const [includeRuns, setIncludeRuns] = useState(true);
  const [division, setDivision] = useState<Division>('men_open');
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [programWorkoutContext, setProgramWorkoutContext] = useState<{ week: number; dayOfWeek: number } | null>(null);
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [programData, setProgramData] = useState<GeneratedProgram | null>(null);
  const [activeRunWorkout, setActiveRunWorkout] = useState<ScheduledWorkoutExtended | null>(null);
  const [activeStrengthWorkout, setActiveStrengthWorkout] = useState<ScheduledWorkoutExtended | null>(null);

  useEffect(() => {
    async function loadUserEquipment() {
      if (session?.user) {
        // Authenticated: load from API
        try {
          const apiEquipment = await fetchEquipment();
          if (apiEquipment.length > 0) {
            setEquipment(apiEquipment.map(e => ({
              equipmentId: e.equipmentId,
              available: e.available
            })));
          }
        } catch {
          // Fallback to localStorage on error
          const savedEquipment = loadEquipment();
          if (savedEquipment.length > 0) {
            setEquipment(savedEquipment);
          }
        }
      } else {
        // Guest: load from localStorage
        const savedEquipment = loadEquipment();
        if (savedEquipment.length > 0) {
          setEquipment(savedEquipment);
        }
      }
    }

    if (status !== 'loading') {
      loadUserEquipment();
    }
  }, [session, status]);

  // Load excluded exercises
  useEffect(() => {
    const saved = loadExcludedExercises();
    if (saved.length > 0) {
      setExcludedExercises(saved);
    }
  }, []);

  // Load include runs preference (gym mode toggle)
  useEffect(() => {
    setIncludeRuns(loadIncludeRuns());
  }, []);

  // Load user program
  useEffect(() => {
    async function loadProgram() {
      if (session?.user) {
        // Authenticated: load from API
        try {
          const apiProgram = await fetchUserProgram();
          setUserProgram(apiProgram);
          // Load programData if it's a personalized program
          if (apiProgram?.programData) {
            try {
              const parsed = typeof apiProgram.programData === 'string'
                ? JSON.parse(apiProgram.programData)
                : apiProgram.programData;
              setProgramData(parsed);
            } catch {
              console.error('Failed to parse programData');
            }
          }
        } catch {
          // Fallback to localStorage on error
          const saved = loadUserProgram();
          if (saved) {
            setUserProgram(saved);
          }
        }
      } else {
        // Guest: load from localStorage
        const saved = loadUserProgram();
        if (saved) {
          setUserProgram(saved);
        }
      }
    }

    if (status !== 'loading') {
      loadProgram();
    }
  }, [session, status]);

  const toggleExcludedExercise = (exerciseName: string) => {
    setExcludedExercises(prev => {
      const newExcluded = prev.includes(exerciseName)
        ? prev.filter(e => e !== exerciseName)
        : [...prev, exerciseName];
      saveExcludedExercises(newExcluded);
      return newExcluded;
    });
  };

  const handleGenerateWorkout = () => {
    let workout: GeneratedWorkout;

    switch (workoutType) {
      case 'full':
        workout = generateFullSimulation(equipment, includeRuns, excludedExercises);
        break;
      case 'quick':
        workout = generateQuickWorkout(equipment, parseInt(quickDuration) || 30, quickFocus, excludedExercises, includeRuns);
        break;
      case 'station':
        workout = generateStationPractice(
          selectedStations.length > 0 ? selectedStations : ['skierg', 'wall_balls'],
          equipment,
          3,
          excludedExercises,
          includeRuns
        );
        break;
      case 'coverage':
        workout = generateRaceCoverageWorkout(equipment, coveragePercent, false, excludedExercises, includeRuns);
        break;
      default:
        workout = generateFullSimulation(equipment, includeRuns, excludedExercises);
    }

    setCurrentWorkout(workout);
  };

  const handleStartSimulation = (workout: GeneratedWorkout) => {
    const typeMap: Record<typeof workoutType, RaceSimulatorConfig['type']> = {
      'full': 'full_simulation',
      'quick': 'quick_workout',
      'station': 'station_practice',
      'coverage': 'full_simulation', // Coverage uses full simulation tracking
    };

    setSimulatorConfig({
      workout,
      type: typeMap[workoutType],
      gymMode: !includeRuns,
    });
    setActiveTab('simulator');
  };

  const handleChangeExercise = (blockIndex: number, newAlternativeName: string) => {
    if (!currentWorkout) return;

    const block = currentWorkout.mainWorkout[blockIndex];
    const station = HYROX_STATIONS.find(s => s.id === block.stationId);
    const newAlt = station?.alternatives.find(a => a.name === newAlternativeName);

    setCurrentWorkout(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        mainWorkout: prev.mainWorkout.map((b, i) =>
          i === blockIndex
            ? {
                ...b,
                alternativeName: newAlternativeName,
                notes: newAlt?.description || b.notes,
                videoUrl: newAlt?.videoUrl || station?.videoUrl
              }
            : b
        )
      };
    });
  };

  // Program handlers
  const handleStartProgram = async (programId: string) => {
    if (session?.user) {
      // Authenticated: use API
      try {
        const newProgram = await startProgramAPI(programId);
        setUserProgram(newProgram);
      } catch (error) {
        console.error('Failed to start program:', error);
      }
    } else {
      // Guest: use localStorage
      const newProgram: UserProgram = {
        id: generateId(),
        programId,
        startDate: new Date().toISOString(),
        completedWorkouts: [],
      };
      saveUserProgram(newProgram);
      setUserProgram(newProgram);
    }
  };

  const handleQuitProgram = async () => {
    if (session?.user) {
      // Authenticated: use API
      try {
        await quitProgramAPI();
      } catch (error) {
        console.error('Failed to quit program:', error);
      }
    } else {
      // Guest: use localStorage
      clearUserProgram();
    }
    setUserProgram(null);
    setProgramWorkoutContext(null);
    setProgramData(null);
  };

  const handleCreatePersonalizedProgram = async (personalization: ProgramPersonalization) => {
    if (!session?.user) {
      // Personalized programs require authentication
      return;
    }

    setIsCreatingProgram(true);
    try {
      const result = await createPersonalizedProgramAPI(personalization);
      setUserProgram(result);
      // Parse and store programData
      if (result.programData) {
        const parsed = typeof result.programData === 'string'
          ? JSON.parse(result.programData)
          : result.programData;
        setProgramData(parsed);
      }
    } catch (error) {
      console.error('Failed to create personalized program:', error);
      throw error;
    } finally {
      setIsCreatingProgram(false);
    }
  };

  const handleStartRunWorkout = (week: number, workout: ScheduledWorkoutExtended) => {
    setProgramWorkoutContext({ week, dayOfWeek: workout.dayOfWeek });
    setActiveRunWorkout(workout);
  };

  const handleStartStrengthWorkout = (week: number, workout: ScheduledWorkoutExtended) => {
    setProgramWorkoutContext({ week, dayOfWeek: workout.dayOfWeek });
    setActiveStrengthWorkout(workout);
  };

  const handleCompleteRunWorkout = async (data: RunningWorkoutCompletionData) => {
    if (programWorkoutContext && userProgram && session?.user) {
      try {
        await completeWorkoutAPI({
          week: programWorkoutContext.week,
          dayOfWeek: programWorkoutContext.dayOfWeek,
          actualDuration: data.actualDuration,
          rpe: data.rpe,
          completionStatus: data.completionStatus,
          percentComplete: data.percentComplete,
          performanceData: data.performanceData,
        });
        // Reload user program
        const updated = await fetchUserProgram();
        if (updated) {
          setUserProgram(updated);
        }
      } catch (error) {
        console.error('Failed to complete workout:', error);
      }
    }
    setActiveRunWorkout(null);
    setProgramWorkoutContext(null);
  };

  const handleCompleteStrengthWorkout = async (data: StrengthWorkoutCompletionData) => {
    if (programWorkoutContext && userProgram && session?.user) {
      try {
        await completeWorkoutAPI({
          week: programWorkoutContext.week,
          dayOfWeek: programWorkoutContext.dayOfWeek,
          actualDuration: data.actualDuration,
          rpe: data.rpe,
          completionStatus: data.completionStatus,
          percentComplete: data.percentComplete,
          performanceData: data.performanceData,
        });
        // Reload user program
        const updated = await fetchUserProgram();
        if (updated) {
          setUserProgram(updated);
        }
      } catch (error) {
        console.error('Failed to complete workout:', error);
      }
    }
    setActiveStrengthWorkout(null);
    setProgramWorkoutContext(null);
  };

  const handleStartProgramWorkout = (week: number, scheduledWorkout: ScheduledWorkout | ScheduledWorkoutExtended) => {
    // Handle new workout types
    if (scheduledWorkout.type === 'run') {
      handleStartRunWorkout(week, scheduledWorkout as ScheduledWorkoutExtended);
      return;
    }
    if (scheduledWorkout.type === 'strength') {
      handleStartStrengthWorkout(week, scheduledWorkout as ScheduledWorkoutExtended);
      return;
    }

    // Generate workout based on scheduled workout params
    let workout: GeneratedWorkout;

    switch (scheduledWorkout.type) {
      case 'quick':
        workout = generateQuickWorkout(
          equipment,
          scheduledWorkout.params.duration || 30,
          scheduledWorkout.params.focus || 'mixed',
          excludedExercises,
          includeRuns
        );
        break;
      case 'station':
        workout = generateStationPractice(
          scheduledWorkout.params.stations || ['skierg', 'wall_balls'],
          equipment,
          scheduledWorkout.params.sets || 2,
          excludedExercises,
          includeRuns
        );
        break;
      case 'coverage':
        workout = generateRaceCoverageWorkout(
          equipment,
          scheduledWorkout.params.coverage || 50,
          division.startsWith('women'),
          excludedExercises,
          includeRuns
        );
        break;
      case 'full':
        workout = generateFullSimulation(equipment, includeRuns, excludedExercises);
        break;
      default:
        return; // Rest day, do nothing
    }

    // Store context for marking completion later
    setProgramWorkoutContext({ week, dayOfWeek: scheduledWorkout.dayOfWeek });

    // Start the workout
    setSimulatorConfig({
      workout,
      type: scheduledWorkout.type === 'full' ? 'full_simulation' :
            scheduledWorkout.type === 'station' ? 'station_practice' : 'quick_workout',
      gymMode: !includeRuns,
    });
    setActiveTab('simulator');
  };

  const handleProgramWorkoutComplete = async (sessionId: string) => {
    if (programWorkoutContext && userProgram) {
      if (session?.user) {
        // Authenticated: use API
        try {
          await completeWorkoutAPI({
            week: programWorkoutContext.week,
            dayOfWeek: programWorkoutContext.dayOfWeek,
            sessionId,
          });
          // Reload user program to get updated completedWorkouts
          const updated = await fetchUserProgram();
          if (updated) {
            setUserProgram(updated);
          }
        } catch (error) {
          console.error('Failed to complete workout:', error);
        }
      } else {
        // Guest: use localStorage
        addCompletedProgramWorkout(
          programWorkoutContext.week,
          programWorkoutContext.dayOfWeek,
          sessionId
        );
        // Reload user program to get updated completedWorkouts
        const updated = loadUserProgram();
        if (updated) {
          setUserProgram(updated);
        }
      }
      setProgramWorkoutContext(null);
    }
    setActiveTab('programs');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'workout', label: 'Workouts', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { id: 'programs', label: 'Programs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'simulator', label: 'Race Sim', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'pacing', label: 'Pacing', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'progress', label: 'Progress', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { id: 'equipment', label: 'Equipment', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];

  const toggleStation = (stationId: string) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Dark with Yellow Accents */}
      <header className="bg-black border-b border-[#262626] safe-area-top">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-[#ffed00]">
                HYTRAIN
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Train Anywhere, Race Ready</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Equipment quick access - clickable */}
              <button
                onClick={() => setActiveTab('equipment')}
                className="text-right px-2 py-1 -mx-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Edit equipment"
              >
                <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">Equipment</div>
                <div className="text-white font-bold flex items-center gap-1">
                  <span className="text-sm sm:text-base">{equipment.filter(e => e.available).length}</span>
                  <span className="text-xs text-gray-400">items</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </button>
              {status === 'loading' ? (
                <div className="w-16 sm:w-20 h-9 sm:h-10 bg-white/10 rounded-lg animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline max-w-[120px] truncate">{session.user.name || session.user.email}</span>
                  <button
                    onClick={() => signOut()}
                    className="px-3 sm:px-4 py-2 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg text-xs sm:text-sm text-black whitespace-nowrap font-bold uppercase tracking-wide"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/auth/signin"
                    className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm text-white font-bold uppercase tracking-wide"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 sm:px-4 py-2 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg text-xs sm:text-sm text-black font-bold uppercase tracking-wide"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation - HYROX Yellow */}
      <nav className="bg-[#ffed00] border-b-2 border-black sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between sm:justify-start overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 font-bold uppercase tracking-wide whitespace-nowrap border-b-4 transition-colors min-w-0 flex-1 sm:flex-none ${
                  activeTab === tab.id
                    ? 'text-black border-black bg-white/20'
                    : 'text-black/60 border-transparent hover:text-black hover:border-black/30'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'workout' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Workout Generator Controls */}
            <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
              <div className="inline-block bg-[#ffed00] px-4 py-2 mb-4">
                <h2 className="text-black font-black tracking-wider uppercase text-lg sm:text-xl">Generate Workout</h2>
              </div>

              {/* Workout Type */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Workout Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'full', label: 'Full Sim', fullLabel: 'Full Simulation' },
                    { id: 'coverage', label: 'Coverage', fullLabel: 'Race Coverage' },
                    { id: 'quick', label: 'Quick', fullLabel: 'Quick Workout' },
                    { id: 'station', label: 'Practice', fullLabel: 'Station Practice' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setWorkoutType(type.id as typeof workoutType)}
                      className={`px-2 sm:px-4 py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        workoutType === type.id
                          ? 'bg-[#ffed00] text-black'
                          : 'bg-[#1f1f1f] text-gray-300 hover:bg-[#262626] border border-[#262626]'
                      }`}
                    >
                      <span className="sm:hidden">{type.label}</span>
                      <span className="hidden sm:inline">{type.fullLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Division Selector */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Division</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(DIVISION_INFO) as [Division, typeof DIVISION_INFO[Division]][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setDivision(key)}
                      className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        division === key
                          ? 'bg-[#ffed00] text-black'
                          : 'bg-[#1f1f1f] text-gray-300 hover:bg-[#262626] border border-[#262626]'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Workout Options */}
              {workoutType === 'quick' && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={e => setQuickDuration(e.target.value)}
                      onBlur={e => {
                        const val = parseInt(e.target.value) || 30;
                        const clamped = Math.min(90, Math.max(15, val));
                        setQuickDuration(String(clamped));
                      }}
                      className="w-full px-3 sm:px-4 py-3 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:border-[#ffed00] focus:outline-none transition-colors"
                      min={15}
                      max={90}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">Focus</label>
                    <select
                      value={quickFocus}
                      onChange={e => setQuickFocus(e.target.value as typeof quickFocus)}
                      className="w-full px-3 sm:px-4 py-3 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:border-[#ffed00] focus:outline-none transition-colors"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="cardio">Cardio</option>
                      <option value="strength">Strength</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Station Practice Options */}
              {workoutType === 'station' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Select Stations to Practice</label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {HYROX_STATIONS.map(station => (
                      <button
                        key={station.id}
                        onClick={() => toggleStation(station.id)}
                        className={`px-3 py-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                          selectedStations.includes(station.id)
                            ? 'bg-[#ffed00] text-black'
                            : 'bg-[#1f1f1f] text-gray-300 hover:bg-[#262626] border border-[#262626]'
                        }`}
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Race Coverage Options */}
              {workoutType === 'coverage' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Race Coverage</label>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-[#ffed00]">{coveragePercent}%</span>
                      <span className="text-xs text-gray-500">
                        {coveragePercent < 50 ? 'Light' : coveragePercent < 80 ? 'Moderate' : coveragePercent <= 100 ? 'Full Race' : 'Beyond Race'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="150"
                      step="10"
                      value={coveragePercent}
                      onChange={(e) => setCoveragePercent(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#ffed00]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30%</span>
                      <span>100%</span>
                      <span>150%</span>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 text-xs sm:text-sm text-gray-400 border border-[#262626]">
                    <p className="font-medium text-gray-300 mb-1">What you&apos;ll do:</p>
                    <ul className="space-y-1">
                      <li>• 8x {Math.round(1000 * coveragePercent / 100)}m runs</li>
                      <li>• {Math.round(1000 * coveragePercent / 100)}m SkiErg & Rowing</li>
                      <li>• {Math.round(100 * coveragePercent / 100)} Wall Balls</li>
                      <li>• {Math.round(50 * coveragePercent / 100)}m Sled Push/Pull</li>
                      <li>• All 8 stations at {coveragePercent}% volume</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Exclude Exercises */}
              <div className="mb-4">
                <button
                  onClick={() => setShowExcludePanel(!showExcludePanel)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-[#1f1f1f] rounded-lg text-sm text-gray-300 hover:bg-[#262626] border border-[#262626] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Exclude Exercises</span>
                    {excludedExercises.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#ffed00]/20 text-[#ffed00] rounded text-xs">
                        {excludedExercises.length} excluded
                      </span>
                    )}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showExcludePanel ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showExcludePanel && (
                  <div className="mt-2 p-3 bg-[#1a1a1a] rounded-lg border border-[#262626]">
                    <p className="text-xs text-gray-400 mb-2">
                      Select exercises you want to skip. The next best alternative will be used.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {getAllExerciseNames().map(exercise => (
                        <button
                          key={exercise}
                          onClick={() => toggleExcludedExercise(exercise)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            excludedExercises.includes(exercise)
                              ? 'bg-red-500/30 text-red-300 line-through'
                              : 'bg-[#262626] text-gray-300 hover:bg-[#333333]'
                          }`}
                        >
                          {exercise}
                        </button>
                      ))}
                    </div>
                    {excludedExercises.length > 0 && (
                      <button
                        onClick={() => {
                          setExcludedExercises([]);
                          saveExcludedExercises([]);
                        }}
                        className="mt-2 text-xs text-gray-400 hover:text-white"
                      >
                        Clear all exclusions
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Include Running Toggle */}
              <div className="mb-4 p-3 bg-[#1f1f1f] rounded-lg border border-[#262626]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Include Running</h4>
                    <p className="text-gray-500 text-xs">Add run segments between stations</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !includeRuns;
                      setIncludeRuns(newValue);
                      saveIncludeRuns(newValue);
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      includeRuns ? 'bg-[#ffed00]' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        includeRuns ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {!includeRuns && (
                  <p className="mt-2 text-xs text-[#ffed00]">
                    Gym mode: Stations only, no running
                  </p>
                )}
              </div>

              <button
                onClick={handleGenerateWorkout}
                className="w-full py-3 sm:py-4 bg-[#ffed00] hover:bg-[#e6d600] rounded-lg font-black text-black text-base sm:text-lg uppercase tracking-wide transition-colors"
              >
                Generate Workout
              </button>

              {equipment.filter(e => e.available).length === 0 && (
                <p className="text-yellow-500 text-xs sm:text-sm mt-3 text-center">
                  No equipment configured. Go to Equipment tab to set up your available gear.
                </p>
              )}
            </div>

            {/* Generated Workout Display */}
            {currentWorkout && (
              <WorkoutDisplay
                workout={currentWorkout}
                onStartSimulation={() => handleStartSimulation(currentWorkout)}
                division={division}
                onChangeExercise={handleChangeExercise}
              />
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <RaceSimulator
            config={simulatorConfig || undefined}
            onComplete={(sessionId) => {
              if (programWorkoutContext && sessionId) {
                handleProgramWorkoutComplete(sessionId);
              } else {
                setActiveTab('progress');
              }
            }}
          />
        )}

        {activeTab === 'pacing' && <PacingCalculator />}

        {activeTab === 'progress' && <ProgressTracker />}

        {activeTab === 'programs' && (
          <>
            {/* Running Workout Modal */}
            {activeRunWorkout && 'runType' in activeRunWorkout.params && (
              <RunningWorkout
                runType={activeRunWorkout.params.runType || 'zone2'}
                duration={activeRunWorkout.params.duration || 30}
                targetPace={activeRunWorkout.params.targetPace}
                hrZone={activeRunWorkout.params.hrZone}
                intervals={activeRunWorkout.params.intervals}
                onComplete={handleCompleteRunWorkout}
                onBack={() => setActiveRunWorkout(null)}
              />
            )}

            {/* Strength Workout Modal */}
            {activeStrengthWorkout && 'exercises' in activeStrengthWorkout.params && (
              <StrengthWorkout
                focus={activeStrengthWorkout.params.strengthFocus || 'full'}
                exercises={activeStrengthWorkout.params.exercises || []}
                stationWork={activeStrengthWorkout.params.stationWork}
                equipment={equipment}
                onComplete={handleCompleteStrengthWorkout}
                onBack={() => setActiveStrengthWorkout(null)}
              />
            )}

            {/* Main Programs Content */}
            {!activeRunWorkout && !activeStrengthWorkout && (
              userProgram ? (
                <div className="space-y-6">
                  <WeeklyCalendar
                    userProgram={userProgram}
                    onStartWorkout={handleStartProgramWorkout}
                    onQuitProgram={handleQuitProgram}
                    programData={programData || undefined}
                  />
                  <PerformanceInsights />
                </div>
              ) : (
                <ProgramSelector
                  onStartProgram={handleStartProgram}
                  onCreatePersonalized={handleCreatePersonalizedProgram}
                  isCreating={isCreatingProgram}
                />
              )
            )}
          </>
        )}

        {activeTab === 'equipment' && (
          <EquipmentSelector
            onEquipmentChange={setEquipment}
            isAuthenticated={!!session}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-[#262626] mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Train with whatever equipment you have. Alternatives adapted to your setup.</p>
          <p className="mt-2">Built for <span className="text-[#ffed00] font-semibold">HYROX</span> athletes. Powered by <span className="font-semibold"><span className="text-[#ffed00]">HY</span>TRAIN</span>.</p>
        </div>
      </footer>
    </div>
  );
}
