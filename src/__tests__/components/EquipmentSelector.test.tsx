import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentSelector from '@/components/EquipmentSelector';
import { AVAILABLE_EQUIPMENT } from '@/lib/hyrox-data';

// Mock the storage module
vi.mock('@/lib/storage', () => ({
  loadEquipment: vi.fn(() => []),
  saveEquipment: vi.fn(),
}));

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchEquipment: vi.fn(() => Promise.resolve([])),
  saveEquipmentAPI: vi.fn(() => Promise.resolve()),
}));

import { loadEquipment, saveEquipment } from '@/lib/storage';
import { fetchEquipment, saveEquipmentAPI } from '@/lib/api';

describe('EquipmentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadEquipment).mockReturnValue([]);
    vi.mocked(fetchEquipment).mockResolvedValue([]);
  });

  it('renders the component with title', () => {
    render(<EquipmentSelector />);
    expect(screen.getByText('Your Equipment')).toBeInTheDocument();
  });

  it('renders all equipment categories', () => {
    render(<EquipmentSelector />);

    expect(screen.getByText('cardio')).toBeInTheDocument();
    expect(screen.getByText('weights')).toBeInTheDocument();
    expect(screen.getByText('bodyweight')).toBeInTheDocument();
    expect(screen.getByText('resistance')).toBeInTheDocument();
    expect(screen.getByText('other')).toBeInTheDocument();
  });

  it('renders equipment items from AVAILABLE_EQUIPMENT', async () => {
    render(<EquipmentSelector />);

    // Check a few equipment items exist
    await waitFor(() => {
      expect(screen.getByText('SkiErg')).toBeInTheDocument();
      expect(screen.getByText('Dumbbells')).toBeInTheDocument();
      expect(screen.getByText('Kettlebell')).toBeInTheDocument();
    });
  });

  it('loads equipment from localStorage on mount', async () => {
    const savedEquipment = [
      { equipmentId: 'dumbbells', available: true },
      { equipmentId: 'kettlebell', available: false },
    ];
    vi.mocked(loadEquipment).mockReturnValue(savedEquipment);

    render(<EquipmentSelector />);

    await waitFor(() => {
      expect(loadEquipment).toHaveBeenCalled();
    });
  });

  it('loads equipment from API when authenticated', async () => {
    const apiEquipment = [
      { equipmentId: 'barbell', available: true },
    ];
    vi.mocked(fetchEquipment).mockResolvedValue(apiEquipment);

    render(<EquipmentSelector isAuthenticated={true} />);

    await waitFor(() => {
      expect(fetchEquipment).toHaveBeenCalled();
    });
  });

  it('shows sign-in prompt when not authenticated', () => {
    render(<EquipmentSelector isAuthenticated={false} />);

    expect(screen.getByText(/Sign in to sync your equipment/)).toBeInTheDocument();
  });

  it('does not show sign-in prompt when authenticated', () => {
    render(<EquipmentSelector isAuthenticated={true} />);

    expect(screen.queryByText(/Sign in to sync your equipment/)).not.toBeInTheDocument();
  });

  it('toggles equipment when clicked', async () => {
    const user = userEvent.setup();
    const onEquipmentChange = vi.fn();

    render(<EquipmentSelector onEquipmentChange={onEquipmentChange} />);

    await waitFor(() => {
      expect(screen.getByText('Dumbbells')).toBeInTheDocument();
    });

    const dumbbellsButton = screen.getByText('Dumbbells');
    await user.click(dumbbellsButton);

    await waitFor(() => {
      expect(onEquipmentChange).toHaveBeenCalled();
      expect(saveEquipment).toHaveBeenCalled();
    });
  });

  it('Select All marks all equipment as available', async () => {
    const user = userEvent.setup();
    const onEquipmentChange = vi.fn();

    render(<EquipmentSelector onEquipmentChange={onEquipmentChange} />);

    const selectAllButton = screen.getByText('Select All');
    await user.click(selectAllButton);

    await waitFor(() => {
      expect(onEquipmentChange).toHaveBeenCalled();
      const lastCall = onEquipmentChange.mock.calls[onEquipmentChange.mock.calls.length - 1][0];
      expect(lastCall.every((eq: { available: boolean }) => eq.available)).toBe(true);
    });
  });

  it('Clear marks all equipment as unavailable', async () => {
    const user = userEvent.setup();
    const onEquipmentChange = vi.fn();

    // Start with some equipment selected
    vi.mocked(loadEquipment).mockReturnValue([
      { equipmentId: 'dumbbells', available: true },
      { equipmentId: 'kettlebell', available: true },
    ]);

    render(<EquipmentSelector onEquipmentChange={onEquipmentChange} />);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    await waitFor(() => {
      expect(onEquipmentChange).toHaveBeenCalled();
      const lastCall = onEquipmentChange.mock.calls[onEquipmentChange.mock.calls.length - 1][0];
      expect(lastCall.every((eq: { available: boolean }) => !eq.available)).toBe(true);
    });
  });

  it('shows correct selected count', async () => {
    vi.mocked(loadEquipment).mockReturnValue([
      { equipmentId: 'dumbbells', available: true },
      { equipmentId: 'kettlebell', available: true },
      { equipmentId: 'barbell', available: false },
    ]);

    render(<EquipmentSelector />);

    await waitFor(() => {
      // Should show "2 of X items selected"
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(`of ${AVAILABLE_EQUIPMENT.length} items selected`)).toBeInTheDocument();
    });
  });

  it('persists equipment to localStorage', async () => {
    const user = userEvent.setup();

    render(<EquipmentSelector />);

    await waitFor(() => {
      expect(screen.getByText('Dumbbells')).toBeInTheDocument();
    });

    const dumbbellsButton = screen.getByText('Dumbbells');
    await user.click(dumbbellsButton);

    await waitFor(() => {
      expect(saveEquipment).toHaveBeenCalled();
    });
  });

  it('renders Select All and Clear buttons', () => {
    render(<EquipmentSelector />);

    const selectAllButton = screen.getByText('Select All');
    const clearButton = screen.getByText('Clear');

    expect(selectAllButton).toBeInTheDocument();
    expect(clearButton).toBeInTheDocument();
  });
});
