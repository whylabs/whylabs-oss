import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { useThreshold } from './useThreshold';

describe('useThreshold()', () => {
  it('should return default values', () => {
    const { result } = getHookRenderer();

    expect(result.current).toStrictEqual({
      isWithinThreshold: expect.any(Function),
      onChangeThresholdMax: expect.any(Function),
      onChangeThresholdMin: expect.any(Function),
      resetThreshold: expect.any(Function),
      threshold: { max: 0, min: 0, isActive: false },
      toggleThresholdIsActive: expect.any(Function),
    });
  });

  it.each([
    { min: 0, max: 100, isActive: true },
    { min: 25, max: 75, isActive: false },
  ])('should return threshold from query params %#', ({ min, max, isActive }) => {
    const { result } = getHookRenderer({
      initialEntries: [`/something?threshold=${min}|${max}|${String(isActive)}`],
    });
    expect(result.current.threshold).toStrictEqual({ min, max, isActive });
  });

  it.each([5, 20.124])('should update threshold min to %p', (expected) => {
    const { result } = getHookRenderer({ initialEntries: ['/something?threshold=0|100|true'] });

    act(() => {
      result.current.onChangeThresholdMin(expected);
    });
    expect(result.current.threshold).toStrictEqual({ min: expected, max: 100, isActive: true });
  });

  it.each([52, 74.11])('should update threshold max to %p', (expected) => {
    const { result } = getHookRenderer();

    act(() => {
      result.current.onChangeThresholdMax(expected);
    });
    expect(result.current.threshold).toStrictEqual({ min: 0, max: expected, isActive: false });
  });

  it('should update threshold max if min is greater than max', () => {
    const { result } = getHookRenderer();

    act(() => {
      result.current.onChangeThresholdMin(10);
    });
    expect(result.current.threshold).toStrictEqual({ min: 10, max: 10, isActive: false });
  });

  it('should toggle threshold isActive', () => {
    const { result } = getHookRenderer();

    act(() => {
      result.current.toggleThresholdIsActive();
    });
    expect(result.current.threshold).toStrictEqual({ min: 0, max: 0, isActive: true });

    act(() => {
      result.current.toggleThresholdIsActive();
    });
    expect(result.current.threshold).toStrictEqual({ min: 0, max: 0, isActive: false });
  });

  it('should return true if value is within threshold', () => {
    const { result } = getHookRenderer({ initialEntries: ['/something?threshold=10|20|true'] });
    expect(result.current.isWithinThreshold(15)).toBe(true);
  });

  it('should return false if value is not within threshold', () => {
    const { result } = getHookRenderer({ initialEntries: ['/something?threshold=20|40|true'] });
    expect(result.current.isWithinThreshold(15)).toBe(false);
  });

  it('should return true if threshold is not active', () => {
    const { result } = getHookRenderer({ initialEntries: ['/something?threshold=20|40|false'] });
    expect(result.current.isWithinThreshold(15)).toBe(true);
  });

  it('should return true if threshold is not defined', () => {
    const { result } = getHookRenderer({ initialEntries: ['/something'] });
    expect(result.current.isWithinThreshold(15)).toBe(true);
  });

  it('should reset threshold', () => {
    const { result } = getHookRenderer({ initialEntries: ['/something?threshold=20|40|true'] });

    act(() => {
      result.current.resetThreshold();
    });
    expect(result.current.threshold).toStrictEqual({ min: 0, max: 0, isActive: false });
  });
});

// Helpers
function getHookRenderer({
  initialEntries,
}: {
  initialEntries?: string[];
} = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );

  return renderHook(() => useThreshold(), { wrapper });
}
