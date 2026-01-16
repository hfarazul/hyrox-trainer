import { describe, it, expect } from 'vitest';
import { formatTime } from '@/lib/storage';

describe('formatTime', () => {
  it('formats 0 seconds correctly', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute correctly', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exact minutes correctly', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(120)).toBe('2:00');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3661)).toBe('61:01');
  });

  it('handles negative numbers by returning 0:00', () => {
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(-100)).toBe('0:00');
  });

  it('handles NaN by returning 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('handles Infinity by returning 0:00', () => {
    expect(formatTime(Infinity)).toBe('0:00');
    expect(formatTime(-Infinity)).toBe('0:00');
  });

  it('handles large numbers correctly', () => {
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(7200)).toBe('120:00');
  });
});
