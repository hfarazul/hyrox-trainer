'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import EquipmentSelector from '@/components/EquipmentSelector';
import WorkoutDisplay from '@/components/WorkoutDisplay';
import RaceSimulator from '@/components/RaceSimulator';
import PacingCalculator from '@/components/PacingCalculator';
import ProgressTracker from '@/components/ProgressTracker';
import ProgramSelector from '@/components/ProgramSelector';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { UserEquipment, GeneratedWorkout, RaceSimulatorConfig, UserProgram, ScheduledWorkout } from '@/lib/types';
import { loadEquipment, loadExcludedExercises, saveExcludedExercises, loadUserProgram, saveUserProgram, clearUserProgram, generateId, addCompletedProgramWorkout } from '@/lib/storage';
import { fetchEquipment, fetchUserProgram, startProgramAPI, quitProgramAPI, completeWorkoutAPI } from '@/lib/api';
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
  const [division, setDivision] = useState<Division>('men_open');
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [programWorkoutContext, setProgramWorkoutContext] = useState<{ week: number; dayOfWeek: number } | null>(null);

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

  // Load user program
  useEffect(() => {
    async function loadProgram() {
      if (session?.user) {
        // Authenticated: load from API
        try {
          const apiProgram = await fetchUserProgram();
          setUserProgram(apiProgram);
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
        workout = generateFullSimulation(equipment, true, excludedExercises);
        break;
      case 'quick':
        workout = generateQuickWorkout(equipment, parseInt(quickDuration) || 30, quickFocus, excludedExercises);
        break;
      case 'station':
        workout = generateStationPractice(
          selectedStations.length > 0 ? selectedStations : ['skierg', 'wall_balls'],
          equipment,
          3,
          excludedExercises
        );
        break;
      case 'coverage':
        workout = generateRaceCoverageWorkout(equipment, coveragePercent, false, excludedExercises);
        break;
      default:
        workout = generateFullSimulation(equipment, true, excludedExercises);
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
  };

  const handleStartProgramWorkout = (week: number, scheduledWorkout: ScheduledWorkout) => {
    // Generate workout based on scheduled workout params
    let workout: GeneratedWorkout;

    switch (scheduledWorkout.type) {
      case 'quick':
        workout = generateQuickWorkout(
          equipment,
          scheduledWorkout.params.duration || 30,
          scheduledWorkout.params.focus || 'mixed',
          excludedExercises
        );
        break;
      case 'station':
        workout = generateStationPractice(
          scheduledWorkout.params.stations || ['skierg', 'wall_balls'],
          equipment,
          scheduledWorkout.params.sets || 2,
          excludedExercises
        );
        break;
      case 'coverage':
        workout = generateRaceCoverageWorkout(
          equipment,
          scheduledWorkout.params.coverage || 50,
          division.startsWith('women'),
          excludedExercises
        );
        break;
      case 'full':
        workout = generateFullSimulation(equipment, true, excludedExercises);
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
    });
    setActiveTab('simulator');
  };

  const handleProgramWorkoutComplete = async (sessionId: string) => {
    if (programWorkoutContext && userProgram) {
      if (session?.user) {
        // Authenticated: use API
        try {
          await completeWorkoutAPI(
            programWorkoutContext.week,
            programWorkoutContext.dayOfWeek,
            sessionId
          );
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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'workout', label: 'Workouts', icon: '💪' },
    { id: 'programs', label: 'Programs', icon: '📅' },
    { id: 'simulator', label: 'Race Sim', icon: '🏁' },
    { id: 'pacing', label: 'Pacing', icon: '⏱️' },
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'equipment', label: 'Equipment', icon: '🏋️' },
  ];

  const toggleStation = (stationId: string) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-orange-500">HYROX Trainer</h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Train Anywhere, Race Ready</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Equipment quick access - clickable */}
              <button
                onClick={() => setActiveTab('equipment')}
                className="text-right px-2 py-1 -mx-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Edit equipment"
              >
                <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">Equipment</div>
                <div className="text-orange-400 font-semibold flex items-center gap-1">
                  <span className="text-sm sm:text-base">{equipment.filter(e => e.available).length}</span>
                  <span className="text-xs text-gray-500">items</span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </button>
              {status === 'loading' ? (
                <div className="w-16 sm:w-20 h-9 sm:h-10 bg-gray-800 rounded-lg animate-pulse" />
              ) : session ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm text-gray-300 hidden sm:inline max-w-[120px] truncate">{session.user.name || session.user.email}</span>
                  <button
                    onClick={() => signOut()}
                    className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-300 whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/auth/signin"
                    className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm text-gray-300"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs sm:text-sm text-white font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between sm:justify-start overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors min-w-0 flex-1 sm:flex-none ${
                  activeTab === tab.id
                    ? 'text-orange-400 border-orange-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                <span className="text-lg sm:text-base">{tab.icon}</span>
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
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Generate Workout</h2>

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
                      className={`px-2 sm:px-4 py-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        workoutType === type.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                      className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        division === key
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                      className="w-full px-3 sm:px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-base"
                      min={15}
                      max={90}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">Focus</label>
                    <select
                      value={quickFocus}
                      onChange={e => setQuickFocus(e.target.value as typeof quickFocus)}
                      className="w-full px-3 sm:px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-base"
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
                        className={`px-3 py-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                          selectedStations.includes(station.id)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
                      <span className="text-2xl font-bold text-orange-400">{coveragePercent}%</span>
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
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>30%</span>
                      <span>100%</span>
                      <span>150%</span>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 text-xs sm:text-sm text-gray-400">
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
                  className="flex items-center justify-between w-full px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>🚫</span>
                    <span>Exclude Exercises</span>
                    {excludedExercises.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
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
                  <div className="mt-2 p-3 bg-gray-800/50 rounded-lg">
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
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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

              <button
                onClick={handleGenerateWorkout}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-bold text-white text-base sm:text-lg"
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
          userProgram ? (
            <WeeklyCalendar
              userProgram={userProgram}
              onStartWorkout={handleStartProgramWorkout}
              onQuitProgram={handleQuitProgram}
            />
          ) : (
            <ProgramSelector
              onStartProgram={handleStartProgram}
            />
          )
        )}

        {activeTab === 'equipment' && (
          <EquipmentSelector
            onEquipmentChange={setEquipment}
            isAuthenticated={!!session}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Train with whatever equipment you have. Alternatives adapted to your setup.</p>
          <p className="mt-2">Built for HYROX athletes who train anywhere.</p>
        </div>
      </footer>
    </div>
  );
}
