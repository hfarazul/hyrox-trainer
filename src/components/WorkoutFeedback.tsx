'use client';

import { useState } from 'react';

export interface WorkoutFeedbackData {
  rpe: number;
  feeling: 'easy' | 'just_right' | 'hard' | 'too_hard';
  notes?: string;
}

interface WorkoutFeedbackProps {
  workoutType: string;
  onSubmit: (feedback: WorkoutFeedbackData) => void;
  onSkip: () => void;
}

const RPE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Very Light', color: 'text-green-400' },
  2: { label: 'Light', color: 'text-green-400' },
  3: { label: 'Moderate', color: 'text-green-400' },
  4: { label: 'Somewhat Hard', color: 'text-yellow-400' },
  5: { label: 'Hard', color: 'text-yellow-400' },
  6: { label: 'Harder', color: 'text-yellow-400' },
  7: { label: 'Very Hard', color: 'text-orange-400' },
  8: { label: 'Very, Very Hard', color: 'text-orange-400' },
  9: { label: 'Near Max', color: 'text-red-400' },
  10: { label: 'Maximum Effort', color: 'text-red-400' },
};

const FEELING_OPTIONS = [
  { value: 'easy', label: 'Easy', icon: '😊' },
  { value: 'just_right', label: 'Just Right', icon: '💪' },
  { value: 'hard', label: 'Hard', icon: '😤' },
  { value: 'too_hard', label: 'Too Hard', icon: '😵' },
] as const;

export default function WorkoutFeedback({
  workoutType,
  onSubmit,
  onSkip,
}: WorkoutFeedbackProps) {
  const [rpe, setRpe] = useState(5);
  const [feeling, setFeeling] = useState<'easy' | 'just_right' | 'hard' | 'too_hard'>('just_right');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const handleSubmit = () => {
    onSubmit({
      rpe,
      feeling,
      notes: notes.trim() || undefined,
    });
  };

  const rpeInfo = RPE_LABELS[rpe];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] rounded-xl max-w-md w-full p-6 border border-[#262626]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-[#ffed00] px-3 py-1.5 mb-2">
            <span className="text-black font-black tracking-wider uppercase text-sm">
              Workout Complete
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            How was your {workoutType.replace(/_/g, ' ')} workout?
          </p>
        </div>

        {/* RPE Slider */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 font-medium uppercase tracking-wide mb-3">
            Rate of Perceived Exertion (RPE)
          </label>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="10"
              value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              className="w-full h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#ffed00]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
          <div className="text-center mt-3">
            <span className="text-3xl font-black text-[#ffed00]">{rpe}</span>
            <span className={`block text-sm font-medium ${rpeInfo.color}`}>
              {rpeInfo.label}
            </span>
          </div>
        </div>

        {/* Feeling Buttons */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 font-medium uppercase tracking-wide mb-3">
            How did it feel?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FEELING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFeeling(option.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  feeling === option.value
                    ? 'border-[#ffed00] bg-[#ffed00]/10'
                    : 'border-[#262626] hover:border-[#404040]'
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className={`text-xs font-medium ${
                  feeling === option.value ? 'text-[#ffed00]' : 'text-gray-400'
                }`}>
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes (collapsible) */}
        <div className="mb-6">
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              + Add notes (optional)
            </button>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 font-medium uppercase tracking-wide mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations about your workout..."
                rows={2}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#ffed00] focus:outline-none resize-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wide text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg font-black uppercase tracking-wide bg-[#ffed00] hover:bg-[#e6d600] text-black transition-colors"
          >
            Save Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
