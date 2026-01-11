'use client';

import { useState, useEffect, useCallback } from 'react';
import { AVAILABLE_EQUIPMENT } from '@/lib/hyrox-data';
import { UserEquipment } from '@/lib/types';
import { saveEquipment, loadEquipment } from '@/lib/storage';
import { fetchEquipment, saveEquipmentAPI } from '@/lib/api';

interface Props {
  onEquipmentChange?: (equipment: UserEquipment[]) => void;
  isAuthenticated?: boolean;
}

export default function EquipmentSelector({ onEquipmentChange, isAuthenticated = false }: Props) {
  const [equipment, setEquipment] = useState<UserEquipment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUserEquipment() {
      if (isAuthenticated) {
        try {
          const apiEquipment = await fetchEquipment();
          if (apiEquipment.length > 0) {
            setEquipment(apiEquipment.map(e => ({
              equipmentId: e.equipmentId,
              available: e.available
            })));
            return;
          }
        } catch {
          // Fall through to localStorage
        }
      }

      // Load from localStorage or initialize
      const saved = loadEquipment();
      if (saved.length > 0) {
        setEquipment(saved);
      } else {
        const initial = AVAILABLE_EQUIPMENT.map(eq => ({
          equipmentId: eq.id,
          available: false
        }));
        setEquipment(initial);
      }
    }

    loadUserEquipment();
  }, [isAuthenticated]);

  const persistEquipment = useCallback(async (updated: UserEquipment[]) => {
    setSaving(true);
    try {
      if (isAuthenticated) {
        await saveEquipmentAPI(updated);
      }
      // Always save to localStorage as backup
      saveEquipment(updated);
    } catch (error) {
      console.error('Failed to save equipment:', error);
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated]);

  const toggleEquipment = async (equipmentId: string) => {
    const updated = equipment.map(eq =>
      eq.equipmentId === equipmentId
        ? { ...eq, available: !eq.available }
        : eq
    );
    setEquipment(updated);
    onEquipmentChange?.(updated);
    await persistEquipment(updated);
  };

  const selectAll = async () => {
    const updated = equipment.map(eq => ({ ...eq, available: true }));
    setEquipment(updated);
    onEquipmentChange?.(updated);
    await persistEquipment(updated);
  };

  const selectNone = async () => {
    const updated = equipment.map(eq => ({ ...eq, available: false }));
    setEquipment(updated);
    onEquipmentChange?.(updated);
    await persistEquipment(updated);
  };

  const categories = ['cardio', 'weights', 'bodyweight', 'resistance', 'other'] as const;

  return (
    <div className="bg-[#141414] rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black tracking-wide uppercase text-white">Your Equipment</h2>
          {saving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm bg-[#ffed00] hover:bg-[#e6d600] disabled:opacity-50 rounded text-black font-semibold"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            disabled={saving}
            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm bg-gray-600 hover:bg-[#262626] disabled:opacity-50 rounded text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-xs sm:text-sm mb-4">
        Select the equipment you have access to. We&apos;ll generate workouts with suitable alternatives.
        {!isAuthenticated && (
          <span className="text-yellow-500 block mt-1">
            Sign in to sync your equipment across devices.
          </span>
        )}
      </p>

      {categories.map(category => (
        <div key={category} className="mb-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase mb-2">
            {category}
          </h3>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {AVAILABLE_EQUIPMENT.filter(eq => eq.category === category).map(eq => {
              const userEq = equipment.find(e => e.equipmentId === eq.id);
              const isSelected = userEq?.available || false;
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  disabled={saving}
                  className={`px-3 py-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-[#ffed00] text-black'
                      : 'bg-[#1f1f1f] text-gray-300 hover:bg-[#262626]'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {eq.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-[#1f1f1f] rounded-lg">
        <p className="text-xs sm:text-sm text-gray-300">
          <span className="text-[#ffed00] font-semibold">
            {equipment.filter(e => e.available).length}
          </span>{' '}
          of {AVAILABLE_EQUIPMENT.length} items selected
        </p>
      </div>
    </div>
  );
}
