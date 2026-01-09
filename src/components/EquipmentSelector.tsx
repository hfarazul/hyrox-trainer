'use client';

import { useState, useEffect } from 'react';
import { AVAILABLE_EQUIPMENT } from '@/lib/hyrox-data';
import { UserEquipment } from '@/lib/types';
import { saveEquipment, loadEquipment } from '@/lib/storage';

interface Props {
  onEquipmentChange?: (equipment: UserEquipment[]) => void;
}

export default function EquipmentSelector({ onEquipmentChange }: Props) {
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);

  useEffect(() => {
    const saved = loadEquipment();
    if (saved.length > 0) {
      setEquipment(saved);
    } else {
      // Initialize with all equipment as unavailable
      const initial = AVAILABLE_EQUIPMENT.map(eq => ({
        equipmentId: eq.id,
        available: false
      }));
      setEquipment(initial);
    }
  }, []);

  const toggleEquipment = (equipmentId: string) => {
    const updated = equipment.map(eq =>
      eq.equipmentId === equipmentId
        ? { ...eq, available: !eq.available }
        : eq
    );
    setEquipment(updated);
    saveEquipment(updated);
    onEquipmentChange?.(updated);
  };

  const selectAll = () => {
    const updated = equipment.map(eq => ({ ...eq, available: true }));
    setEquipment(updated);
    saveEquipment(updated);
    onEquipmentChange?.(updated);
  };

  const selectNone = () => {
    const updated = equipment.map(eq => ({ ...eq, available: false }));
    setEquipment(updated);
    saveEquipment(updated);
    onEquipmentChange?.(updated);
  };

  const categories = ['cardio', 'weights', 'bodyweight', 'resistance', 'other'] as const;

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Your Equipment</h2>
        <div className="space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded text-white"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Select the equipment you have access to. We&apos;ll generate workouts with suitable alternatives.
      </p>

      {categories.map(category => (
        <div key={category} className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
            {category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_EQUIPMENT.filter(eq => eq.category === category).map(eq => {
              const userEq = equipment.find(e => e.equipmentId === eq.id);
              const isSelected = userEq?.available || false;
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {eq.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-300">
          <span className="text-orange-400 font-semibold">
            {equipment.filter(e => e.available).length}
          </span>{' '}
          of {AVAILABLE_EQUIPMENT.length} items selected
        </p>
      </div>
    </div>
  );
}
