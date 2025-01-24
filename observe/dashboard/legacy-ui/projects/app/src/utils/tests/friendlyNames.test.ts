import { generateFriendlyName, NAME_COLUMNS } from 'utils/friendlyNames';

describe('Tests for our name generator', () => {
  it('generates a name with the desired number of parts', () => {
    expect(generateFriendlyName().split('-').length).toEqual(4);
  });

  it('cannot be less than the min id size', () => {
    expect(generateFriendlyName({ minLength: true }).length).toBeGreaterThanOrEqual(10);
  });

  it('cannot be greater than the maximum id length', () => {
    expect(generateFriendlyName({ maxLength: true }).length).toBeLessThanOrEqual(180);
  });

  it('has no length-1 words for input', () => {
    const friendlySmallName = generateFriendlyName({ minLength: true, digitOverride: '10' });
    friendlySmallName.split('-').forEach((part) => {
      if (Number.isNaN(Number.parseInt(part, 10))) {
        expect(part.length).toBeGreaterThan(1);
      }
    });
  });

  it('has no duplicate input values', () => {
    NAME_COLUMNS.forEach((col) => {
      const colSet = new Set(col);
      expect(col.length).toEqual(colSet.size);
    });
  });

  it('creates the expected name', () => {
    expect(generateFriendlyName({ override: [5, 5, 5], digitOverride: '99' })).toEqual('alive-beige-anteater-99');
  });
});
