import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    getRandomValues: (arr: Uint32Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 0xFFFFFFFF);
      return arr;
    },
  },
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
