import { round } from './numbers';

describe('round', () => {
  it('should round numbers down to 2 decimal places', () => {
    expect(round(1.021)).toBe(1.02);
  });
  it('should round up', () => {
    expect(round(1.005)).toBe(1.01);
  });
  it('should not do anything to 0', () => {
    expect(round(0)).toBe(0);
  });
  it('should round negative values', () => {
    expect(round(-1.006)).toBe(-1.01);
  });
});
