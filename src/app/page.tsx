'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import EquipmentSelector from '@/components/EquipmentSelector';
import WorkoutDisplay from '@/components/WorkoutDisplay';
import RaceSimulator from '@/components/RaceSimulator';
import PacingCalculator from '@/components/PacingCalculator';
import ProgressTracker from '@/components/ProgressTracker';
import { UserEquipment, GeneratedWorkout, RaceSimulatorConfig } from '@/lib/types';
import { loadEquipment } from '@/lib/storage';
import { fetchEquipment } from '@/lib/api';
import { generateFullSimulation, generateQuickWorkout, generateStationPractice } from '@/lib/workout-generator';
import { HYROX_STATIONS } from '@/lib/hyrox-data';

type Tab = 'workout' | 'simulator' | 'pacing' | 'progress' | 'equipment';

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('workout');
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null);
  const [workoutType, setWorkoutType] = useState<'full' | 'quick' | 'station'>('full');
  const [quickDuration, setQuickDuration] = useState(30);
  const [quickFocus, setQuickFocus] = useState<'cardio' | 'strength' | 'mixed'>('mixed');
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [simulatorConfig, setSimulatorConfig] = useState<RaceSimulatorConfig | null>(null);

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

  const handleGenerateWorkout = () => {
    let workout: GeneratedWorkout;

    switch (workoutType) {
      case 'full':
        workout = generateFullSimulation(equipment);
        break;
      case 'quick':
        workout = generateQuickWorkout(equipment, quickDuration, quickFocus);
        break;
      case 'station':
        workout = generateStationPractice(
          selectedStations.length > 0 ? selectedStations : ['skierg', 'wall_balls'],
          equipment
        );
        break;
      default:
        workout = generateFullSimulation(equipment);
    }

    setCurrentWorkout(workout);
  };

  const handleStartSimulation = (workout: GeneratedWorkout) => {
    const typeMap: Record<typeof workoutType, RaceSimulatorConfig['type']> = {
      'full': 'full_simulation',
      'quick': 'quick_workout',
      'station': 'station_practice',
    };

    setSimulatorConfig({
      workout,
      type: typeMap[workoutType],
    });
    setActiveTab('simulator');
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'workout', label: 'Workouts', icon: '💪' },
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
              <div className="text-right hidden md:block">
                <div className="text-sm text-gray-400">Equipment configured</div>
                <div className="text-orange-400 font-semibold">
                  {equipment.filter(e => e.available).length} items
                </div>
              </div>
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full', label: 'Full Sim', fullLabel: 'Full Simulation' },
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

              {/* Quick Workout Options */}
              {workoutType === 'quick' && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-gray-400 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={e => setQuickDuration(parseInt(e.target.value) || 30)}
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
              />
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <RaceSimulator
            config={simulatorConfig || undefined}
            onComplete={() => setActiveTab('progress')}
          />
        )}

        {activeTab === 'pacing' && <PacingCalculator />}

        {activeTab === 'progress' && <ProgressTracker />}

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
