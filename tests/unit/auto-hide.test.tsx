// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTICE_MS, useAutoHide } from '@/components/form';

describe('useAutoHide', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hides a notice after the delay and shows it again for the next submission', () => {
    const first = { status: 'success' };
    const { result, rerender } = renderHook(({ trigger }) => useAutoHide(trigger), {
      initialProps: { trigger: first as object },
    });
    expect(result.current).toBe(true);

    act(() => vi.advanceTimersByTime(NOTICE_MS - 1));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);

    // Same message again is a new action state object, so it shows again.
    rerender({ trigger: { status: 'success' } });
    expect(result.current).toBe(true);
  });
});
