import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacingCalculator from '@/components/PacingCalculator';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null })),
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  loadRaceGoal: vi.fn(() => null),
  saveRaceGoal: vi.fn(),
  formatTime: vi.fn((seconds: number) => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
  fetchRaceGoal: vi.fn(() => Promise.resolve({
    targetTime: 75,
    division: 'men_open',
    fiveKTime: 25,
    experience: 'intermediate',
  })),
  saveRaceGoalAPI: vi.fn(() => Promise.resolve()),
}));

// Mock workout-generator
vi.mock('@/lib/workout-generator', () => ({
  calculatePacingPlan: vi.fn(() => [
    { stationId: 'skierg', stationName: 'SkiErg', targetTime: 240 },
    { stationId: 'sled_push', stationName: 'Sled Push', targetTime: 120 },
    { stationId: 'sled_pull', stationName: 'Sled Pull', targetTime: 100 },
    { stationId: 'burpee_broad_jump', stationName: 'Burpee Broad Jumps', targetTime: 240 },
    { stationId: 'rowing', stationName: 'Rowing', targetTime: 220 },
    { stationId: 'farmers_carry', stationName: 'Farmers Carry', targetTime: 90 },
    { stationId: 'sandbag_lunges', stationName: 'Sandbag Lunges', targetTime: 140 },
    { stationId: 'wall_balls', stationName: 'Wall Balls', targetTime: 240 },
  ]),
}));

import { useSession } from 'next-auth/react';
import { loadRaceGoal, saveRaceGoal } from '@/lib/storage';
import { fetchRaceGoal, saveRaceGoalAPI } from '@/lib/api';
import { calculatePacingPlan } from '@/lib/workout-generator';

describe('PacingCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
    vi.mocked(loadRaceGoal).mockReturnValue(null);
  });

  it('renders the component with title', async () => {
    render(<PacingCalculator />);
    expect(screen.getByText('Pacing Calculator')).toBeInTheDocument();
  });

  it('renders with default values', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      const targetTimeInput = screen.getByLabelText(/Target Race Time/i) as HTMLInputElement;
      expect(targetTimeInput.value).toBe('75');

      const fiveKInput = screen.getByLabelText(/5K Run Time/i) as HTMLInputElement;
      expect(fiveKInput.value).toBe('25');
    });
  });

  it('renders division selector with all options', async () => {
    render(<PacingCalculator />);

    const divisionSelect = screen.getByLabelText(/Division/i);
    expect(divisionSelect).toBeInTheDocument();

    // Check all division options exist
    expect(screen.getByText('Men Open')).toBeInTheDocument();
    expect(screen.getByText('Men Pro')).toBeInTheDocument();
    expect(screen.getByText('Women Open')).toBeInTheDocument();
    expect(screen.getByText('Women Pro')).toBeInTheDocument();
  });

  it('renders experience selector with all options', async () => {
    render(<PacingCalculator />);

    const experienceSelect = screen.getByLabelText(/Experience Level/i);
    expect(experienceSelect).toBeInTheDocument();

    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('displays target time in summary', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByText('75:00')).toBeInTheDocument();
      expect(screen.getByText('Target Time')).toBeInTheDocument();
    });
  });

  it('shows station breakdown', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Station Target Times')).toBeInTheDocument();
      expect(screen.getByText('SkiErg')).toBeInTheDocument();
      expect(screen.getByText('Sled Push')).toBeInTheDocument();
    });
  });

  it('shows 8x 1km runs section', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByText('8x 1km Runs')).toBeInTheDocument();
    });
  });

  it('shows division weights section', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByText(/Division Weights/)).toBeInTheDocument();
      expect(screen.getByText('Sled Push:')).toBeInTheDocument();
      expect(screen.getByText('Sled Pull:')).toBeInTheDocument();
    });
  });

  it('updates target time input on change', async () => {
    const user = userEvent.setup();
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Target Race Time/i)).toBeInTheDocument();
    });

    const targetTimeInput = screen.getByLabelText(/Target Race Time/i) as HTMLInputElement;
    await user.clear(targetTimeInput);
    await user.type(targetTimeInput, '90');

    expect(targetTimeInput.value).toBe('90');
  });

  it('has min/max attributes on target time input', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Target Race Time/i)).toBeInTheDocument();
    });

    const targetTimeInput = screen.getByLabelText(/Target Race Time/i) as HTMLInputElement;
    expect(targetTimeInput.min).toBe('45');
    expect(targetTimeInput.max).toBe('180');
  });

  it('has min/max attributes on 5K time input', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/5K Run Time/i)).toBeInTheDocument();
    });

    const fiveKInput = screen.getByLabelText(/5K Run Time/i) as HTMLInputElement;
    expect(fiveKInput.min).toBe('15');
    expect(fiveKInput.max).toBe('45');
  });

  it('changes division when selector changes', async () => {
    const user = userEvent.setup();
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Division/i)).toBeInTheDocument();
    });

    const divisionSelect = screen.getByLabelText(/Division/i);
    await user.selectOptions(divisionSelect, 'women_open');

    // Should now show Women Open weights
    await waitFor(() => {
      expect(screen.getByText('Women Open Division Weights')).toBeInTheDocument();
    });
  });

  it('loads goal from localStorage for guest users', async () => {
    const savedGoal = {
      targetTime: 80,
      division: 'men_pro' as const,
      fiveKTime: 22,
      experience: 'advanced' as const,
    };
    vi.mocked(loadRaceGoal).mockReturnValue(savedGoal);

    render(<PacingCalculator />);

    await waitFor(() => {
      const targetTimeInput = screen.getByLabelText(/Target Race Time/i) as HTMLInputElement;
      expect(targetTimeInput.value).toBe('80');
    });
  });

  it('loads goal from API for authenticated users', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'user-123' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    const apiGoal = {
      targetTime: 65,
      division: 'women_pro' as const,
      fiveKTime: 20,
      experience: 'advanced' as const,
    };
    vi.mocked(fetchRaceGoal).mockResolvedValue(apiGoal);

    render(<PacingCalculator />);

    await waitFor(() => {
      expect(fetchRaceGoal).toHaveBeenCalled();
    });
  });

  it('calculates pacing plan when goal changes', async () => {
    render(<PacingCalculator />);

    await waitFor(() => {
      expect(calculatePacingPlan).toHaveBeenCalled();
    });
  });
});
