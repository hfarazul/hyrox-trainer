'use client';

import { useState, useEffect } from 'react';
import EquipmentSelector from '@/components/EquipmentSelector';
import WorkoutDisplay from '@/components/WorkoutDisplay';
import RaceSimulator from '@/components/RaceSimulator';
import PacingCalculator from '@/components/PacingCalculator';
import ProgressTracker from '@/components/ProgressTracker';
import { UserEquipment, GeneratedWorkout } from '@/lib/types';
import { loadEquipment } from '@/lib/storage';
import { generateFullSimulation, generateQuickWorkout, generateStationPractice } from '@/lib/workout-generator';
import { HYROX_STATIONS } from '@/lib/hyrox-data';

type Tab = 'workout' | 'simulator' | 'pacing' | 'progress' | 'equipment';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('workout');
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null);
  const [workoutType, setWorkoutType] = useState<'full' | 'quick' | 'station'>('full');
  const [quickDuration, setQuickDuration] = useState(30);
  const [quickFocus, setQuickFocus] = useState<'cardio' | 'strength' | 'mixed'>('mixed');
  const [selectedStations, setSelectedStations] = useState<string[]>([]);

  useEffect(() => {
    const savedEquipment = loadEquipment();
    if (savedEquipment.length > 0) {
      setEquipment(savedEquipment);
    }
  }, []);

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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-orange-500">HYROX Trainer</h1>
              <p className="text-sm text-gray-400">Train Anywhere, Race Ready</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Equipment configured</div>
              <div className="text-orange-400 font-semibold">
                {equipment.filter(e => e.available).length} items
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-orange-400 border-orange-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'workout' && (
          <div className="space-y-6">
            {/* Workout Generator Controls */}
            <div className="bg-gray-900 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Generate Workout</h2>

              {/* Workout Type */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Workout Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'full', label: 'Full Simulation', desc: '8 stations + 8km' },
                    { id: 'quick', label: 'Quick Workout', desc: 'Time-based' },
                    { id: 'station', label: 'Station Practice', desc: 'Focus areas' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setWorkoutType(type.id as typeof workoutType)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        workoutType === type.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Workout Options */}
              {workoutType === 'quick' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={e => setQuickDuration(parseInt(e.target.value) || 30)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      min={15}
                      max={90}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Focus</label>
                    <select
                      value={quickFocus}
                      onChange={e => setQuickFocus(e.target.value as typeof quickFocus)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
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
                  <div className="flex flex-wrap gap-2">
                    {HYROX_STATIONS.map(station => (
                      <button
                        key={station.id}
                        onClick={() => toggleStation(station.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-bold text-white text-lg"
              >
                Generate Workout
              </button>

              {equipment.filter(e => e.available).length === 0 && (
                <p className="text-yellow-500 text-sm mt-3 text-center">
                  No equipment configured. Go to Equipment tab to set up your available gear.
                </p>
              )}
            </div>

            {/* Generated Workout Display */}
            {currentWorkout && (
              <WorkoutDisplay
                workout={currentWorkout}
                onStartSimulation={() => setActiveTab('simulator')}
              />
            )}
          </div>
        )}

        {activeTab === 'simulator' && <RaceSimulator />}

        {activeTab === 'pacing' && <PacingCalculator />}

        {activeTab === 'progress' && <ProgressTracker />}

        {activeTab === 'equipment' && (
          <EquipmentSelector onEquipmentChange={setEquipment} />
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
