'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AVAILABLE_EQUIPMENT } from '@/lib/hyrox-data';
import { UserEquipment } from '@/lib/types';
import { saveEquipment } from '@/lib/storage';
import { saveEquipmentAPI } from '@/lib/api';
import { useSession } from 'next-auth/react';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [equipment, setEquipment] = useState<UserEquipment[]>(
    AVAILABLE_EQUIPMENT.map(eq => ({ equipmentId: eq.id, available: false }))
  );
  const [saving, setSaving] = useState(false);

  const toggleEquipment = (equipmentId: string) => {
    setEquipment(prev =>
      prev.map(eq =>
        eq.equipmentId === equipmentId
          ? { ...eq, available: !eq.available }
          : eq
      )
    );
  };

  const selectAll = () => {
    setEquipment(prev => prev.map(eq => ({ ...eq, available: true })));
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      saveEquipment(equipment);

      // If authenticated, also save to API
      if (session?.user) {
        await saveEquipmentAPI(equipment);
      }

      router.push('/');
    } catch (error) {
      console.error('Failed to save equipment:', error);
      router.push('/');
    }
  };

  const handleSkip = () => {
    router.push('/');
  };

  const categories = ['cardio', 'weights', 'bodyweight', 'resistance', 'other'] as const;
  const selectedCount = equipment.filter(e => e.available).length;

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">Welcome to HYROX Trainer!</h1>
          <p className="text-gray-400">
            Let&apos;s set up your equipment so we can generate personalized workouts.
          </p>
        </div>

        {/* Equipment Selection */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">What equipment do you have?</h2>
            <button
              onClick={selectAll}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              Select All
            </button>
          </div>

          {categories.map(category => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EQUIPMENT.filter(eq => eq.category === category).map(eq => {
                  const isSelected = equipment.find(e => e.equipmentId === eq.id)?.available || false;
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

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              <span className="text-orange-400 font-semibold">{selectedCount}</span> of {AVAILABLE_EQUIPMENT.length} items selected
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
          <p className="text-blue-300 text-sm">
            <strong>Don&apos;t worry!</strong> We&apos;ll suggest alternatives for any equipment you don&apos;t have.
            You can always update this later in the Equipment tab.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-gray-300"
          >
            Skip for now
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg font-semibold text-white"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
