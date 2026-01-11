'use client';

import { useState, useEffect, useCallback } from 'react';
import { RaceGoal } from '@/lib/types';
import { HYROX_STATIONS, DIVISION_INFO, ROX_ZONE_TRANSITION_TIME_SECONDS } from '@/lib/hyrox-data';
import { saveRaceGoal, loadRaceGoal, formatTime } from '@/lib/storage';
import { calculatePacingPlan } from '@/lib/workout-generator';

const DEFAULT_GOAL: RaceGoal = {
  targetTime: 75,
  division: 'men_open',
  fiveKTime: 25,
  experience: 'intermediate'
};

export default function PacingCalculator() {
  const [goal, setGoal] = useState<RaceGoal>(DEFAULT_GOAL);
  const [pacingPlan, setPacingPlan] = useState<ReturnType<typeof calculatePacingPlan>>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Local string state for inputs (allows free typing)
  const [targetTimeInput, setTargetTimeInput] = useState(String(DEFAULT_GOAL.targetTime));
  const [fiveKTimeInput, setFiveKTimeInput] = useState(String(DEFAULT_GOAL.fiveKTime));

  // Load saved goal on mount
  useEffect(() => {
    const saved = loadRaceGoal();
    if (saved) {
      setGoal(saved);
      setTargetTimeInput(String(saved.targetTime));
      setFiveKTimeInput(String(saved.fiveKTime));
    }
    setIsLoaded(true);
  }, []);

  // Calculate pacing plan and save goal (only after initial load)
  useEffect(() => {
    const plan = calculatePacingPlan(goal.targetTime, goal.fiveKTime, goal.experience);
    setPacingPlan(plan);

    // Only save after initial load to prevent race condition
    if (isLoaded) {
      saveRaceGoal(goal);
    }
  }, [goal, isLoaded]);

  // Blur handlers - validate and update goal
  const handleTargetTimeBlur = useCallback(() => {
    const parsed = parseInt(targetTimeInput, 10);
    const val = isNaN(parsed) ? 75 : Math.min(180, Math.max(45, parsed));
    setTargetTimeInput(String(val));
    setGoal(prev => ({ ...prev, targetTime: val }));
  }, [targetTimeInput]);

  const handleFiveKTimeBlur = useCallback(() => {
    const parsed = parseInt(fiveKTimeInput, 10);
    const val = isNaN(parsed) ? 25 : Math.min(45, Math.max(15, parsed));
    setFiveKTimeInput(String(val));
    setGoal(prev => ({ ...prev, fiveKTime: val }));
  }, [fiveKTimeInput]);

  const totalStationTime = pacingPlan.reduce((sum, s) => sum + s.targetTime, 0);
  const runPacePerKm = Math.max(0, Math.round((goal.targetTime * 60 - totalStationTime - ROX_ZONE_TRANSITION_TIME_SECONDS) / 8));
  const totalRunTime = runPacePerKm * 8;

  const divisionInfo = DIVISION_INFO[goal.division];

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-white mb-4 sm:mb-6">Pacing Calculator</h2>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <label htmlFor="targetTime" className="block text-xs sm:text-sm text-gray-400 mb-1">
            Target Race Time (min)
          </label>
          <input
            id="targetTime"
            type="number"
            value={targetTimeInput}
            onChange={e => setTargetTimeInput(e.target.value)}
            onBlur={handleTargetTimeBlur}
            className="w-full px-3 sm:px-4 py-3 sm:py-2 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#ffed00]"
            min={45}
            max={180}
          />
        </div>

        <div>
          <label htmlFor="fiveKTime" className="block text-xs sm:text-sm text-gray-400 mb-1">
            5K Run Time (min)
          </label>
          <input
            id="fiveKTime"
            type="number"
            value={fiveKTimeInput}
            onChange={e => setFiveKTimeInput(e.target.value)}
            onBlur={handleFiveKTimeBlur}
            className="w-full px-3 sm:px-4 py-3 sm:py-2 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#ffed00]"
            min={15}
            max={45}
          />
        </div>

        <div>
          <label htmlFor="division" className="block text-xs sm:text-sm text-gray-400 mb-1">
            Division
          </label>
          <select
            id="division"
            value={goal.division}
            onChange={e => setGoal(prev => ({ ...prev, division: e.target.value as RaceGoal['division'] }))}
            className="w-full px-3 sm:px-4 py-3 sm:py-2 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#ffed00]"
          >
            <option value="men_open">Men Open</option>
            <option value="men_pro">Men Pro</option>
            <option value="women_open">Women Open</option>
            <option value="women_pro">Women Pro</option>
          </select>
        </div>

        <div>
          <label htmlFor="experience" className="block text-xs sm:text-sm text-gray-400 mb-1">
            Experience Level
          </label>
          <select
            id="experience"
            value={goal.experience}
            onChange={e => setGoal(prev => ({ ...prev, experience: e.target.value as RaceGoal['experience'] }))}
            className="w-full px-3 sm:px-4 py-3 sm:py-2 bg-[#1f1f1f] border border-[#262626] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#ffed00]"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Division Weights */}
      <div className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg mb-4 sm:mb-6">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-400 mb-2">{divisionInfo.label} Division Weights</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs sm:text-sm">
          <div><span className="text-gray-500">Sled Push:</span> <span className="text-white">{divisionInfo.sledPush}</span></div>
          <div><span className="text-gray-500">Sled Pull:</span> <span className="text-white">{divisionInfo.sledPull}</span></div>
          <div><span className="text-gray-500">Farmers:</span> <span className="text-white">{divisionInfo.farmers}</span></div>
          <div><span className="text-gray-500">Sandbag:</span> <span className="text-white">{divisionInfo.sandbag}</span></div>
          <div><span className="text-gray-500">Wall Ball:</span> <span className="text-white">{divisionInfo.wallBall}</span></div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 bg-[#ffed00]/10 border border-[#ffed00]/40 rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-[#ffed00]">{goal.targetTime}:00</div>
          <div className="text-xs sm:text-sm text-gray-400">Target Time</div>
        </div>
        <div className="p-3 sm:p-4 bg-[#1f1f1f]/50 border border-[#404040] rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-300">{formatTime(runPacePerKm)}</div>
          <div className="text-xs sm:text-sm text-gray-400">Run Pace /km</div>
        </div>
        <div className="p-3 sm:p-4 bg-[#1f1f1f] rounded-lg text-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-300">{formatTime(ROX_ZONE_TRANSITION_TIME_SECONDS)}</div>
          <div className="text-xs sm:text-sm text-gray-400">ROX Zone Time</div>
        </div>
      </div>

      {/* Station Breakdown */}
      <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">Station Target Times</h3>
      <div className="space-y-2">
        {pacingPlan.map((station, idx) => {
          const stationInfo = HYROX_STATIONS.find(s => s.id === station.stationId);
          return (
            <div key={station.stationId} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-[#1f1f1f] rounded-lg">
              <span className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 flex items-center justify-center bg-[#ffed00] rounded-full text-black font-bold text-xs sm:text-sm">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm sm:text-base truncate">{station.stationName}</div>
                <div className="text-xs sm:text-sm text-gray-500 truncate">{stationInfo?.officialRequirement}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg sm:text-xl font-bold text-[#ffed00]">{formatTime(station.targetTime)}</div>
              </div>
            </div>
          );
        })}

        {/* Add run times */}
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-[#1f1f1f]/50 border border-[#404040] rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-white font-medium text-sm sm:text-base">8x 1km Runs</div>
              <div className="text-xs sm:text-sm text-gray-400">Target pace: {formatTime(runPacePerKm)}/km</div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-300 flex-shrink-0">{formatTime(totalRunTime)}</div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-[#ffed00] rounded-lg">
        <div className="flex items-center justify-between text-black gap-2">
          <span className="text-sm sm:text-lg font-black uppercase tracking-wide">Total Estimated Time</span>
          <span className="text-2xl sm:text-3xl font-black">
            {formatTime(totalStationTime + totalRunTime + ROX_ZONE_TRANSITION_TIME_SECONDS)}
          </span>
        </div>
      </div>
    </div>
  );
}
