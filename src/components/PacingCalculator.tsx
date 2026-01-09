'use client';

import { useState, useEffect } from 'react';
import { RaceGoal } from '@/lib/types';
import { HYROX_STATIONS, DIVISION_INFO, AVERAGE_TIMES } from '@/lib/hyrox-data';
import { saveRaceGoal, loadRaceGoal, formatTime } from '@/lib/storage';
import { calculatePacingPlan } from '@/lib/workout-generator';

export default function PacingCalculator() {
  const [goal, setGoal] = useState<RaceGoal>({
    targetTime: 75,
    division: 'men_open',
    fiveKTime: 25,
    experience: 'intermediate'
  });

  const [pacingPlan, setPacingPlan] = useState<ReturnType<typeof calculatePacingPlan>>([]);

  useEffect(() => {
    const saved = loadRaceGoal();
    if (saved) setGoal(saved);
  }, []);

  useEffect(() => {
    const plan = calculatePacingPlan(goal.targetTime, goal.fiveKTime, goal.experience);
    setPacingPlan(plan);
    saveRaceGoal(goal);
  }, [goal]);

  const totalStationTime = pacingPlan.reduce((sum, s) => sum + s.targetTime, 0);
  const runPacePerKm = Math.round((goal.targetTime * 60 - totalStationTime - 420) / 8);
  const totalRunTime = runPacePerKm * 8;
  const roxZoneTime = 420;

  const divisionInfo = DIVISION_INFO[goal.division];

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Pacing Calculator</h2>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target Race Time (minutes)</label>
          <input
            type="number"
            value={goal.targetTime}
            onChange={e => setGoal({ ...goal, targetTime: parseInt(e.target.value) || 60 })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            min={45}
            max={180}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">5K Run Time (minutes)</label>
          <input
            type="number"
            value={goal.fiveKTime}
            onChange={e => setGoal({ ...goal, fiveKTime: parseInt(e.target.value) || 25 })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            min={15}
            max={45}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Division</label>
          <select
            value={goal.division}
            onChange={e => setGoal({ ...goal, division: e.target.value as RaceGoal['division'] })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="men_open">Men Open</option>
            <option value="men_pro">Men Pro</option>
            <option value="women_open">Women Open</option>
            <option value="women_pro">Women Pro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Experience Level</label>
          <select
            value={goal.experience}
            onChange={e => setGoal({ ...goal, experience: e.target.value as RaceGoal['experience'] })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Division Weights */}
      <div className="p-4 bg-gray-800 rounded-lg mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">{divisionInfo.label} Division Weights</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div><span className="text-gray-500">Sled Push:</span> <span className="text-white">{divisionInfo.sledPush}</span></div>
          <div><span className="text-gray-500">Sled Pull:</span> <span className="text-white">{divisionInfo.sledPull}</span></div>
          <div><span className="text-gray-500">Farmers:</span> <span className="text-white">{divisionInfo.farmers}</span></div>
          <div><span className="text-gray-500">Sandbag:</span> <span className="text-white">{divisionInfo.sandbag}</span></div>
          <div><span className="text-gray-500">Wall Ball:</span> <span className="text-white">{divisionInfo.wallBall}</span></div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-orange-900/30 border border-orange-700 rounded-lg text-center">
          <div className="text-3xl font-bold text-orange-400">{goal.targetTime}:00</div>
          <div className="text-sm text-gray-400">Target Time</div>
        </div>
        <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-400">{formatTime(runPacePerKm)}</div>
          <div className="text-sm text-gray-400">Run Pace /km</div>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <div className="text-3xl font-bold text-gray-300">{formatTime(roxZoneTime)}</div>
          <div className="text-sm text-gray-400">ROX Zone Time</div>
        </div>
      </div>

      {/* Station Breakdown */}
      <h3 className="text-lg font-semibold text-white mb-3">Station Target Times</h3>
      <div className="space-y-2">
        {pacingPlan.map((station, idx) => {
          const stationInfo = HYROX_STATIONS.find(s => s.id === station.stationId);
          return (
            <div key={station.stationId} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
              <span className="w-8 h-8 flex items-center justify-center bg-orange-500 rounded-full text-white font-bold text-sm">
                {idx + 1}
              </span>
              <div className="flex-1">
                <div className="text-white font-medium">{station.stationName}</div>
                <div className="text-sm text-gray-500">{stationInfo?.officialRequirement}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-orange-400">{formatTime(station.targetTime)}</div>
              </div>
            </div>
          );
        })}

        {/* Add run times */}
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">8x 1km Runs</div>
              <div className="text-sm text-gray-400">Target pace: {formatTime(runPacePerKm)}/km</div>
            </div>
            <div className="text-xl font-bold text-blue-400">{formatTime(totalRunTime)}</div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 p-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg">
        <div className="flex items-center justify-between text-white">
          <span className="text-lg font-semibold">Total Estimated Time</span>
          <span className="text-3xl font-bold">
            {formatTime(totalStationTime + totalRunTime + roxZoneTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
