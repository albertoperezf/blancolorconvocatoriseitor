import { describe, expect, it } from 'vitest';
import { capitalizeMonths } from '@/lib/dates';

describe('capitalizeMonths', () => {
  it('capitalises Spanish month names and leaves the rest alone', () => {
    expect(capitalizeMonths('jueves, 22 de octubre')).toBe('jueves, 22 de Octubre');
    expect(capitalizeMonths('15 de septiembre de 2026, 20:30')).toBe('15 de Septiembre de 2026, 20:30');
    expect(capitalizeMonths('mayo y diciembre')).toBe('Mayo y Diciembre');
    expect(capitalizeMonths('Marzo')).toBe('Marzo');
    expect(capitalizeMonths('mayordomo')).toBe('mayordomo');
  });
});
