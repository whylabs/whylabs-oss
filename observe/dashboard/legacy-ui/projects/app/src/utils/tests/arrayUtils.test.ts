import { mapReverse } from 'utils/arrayUtils';

describe('Testing the mapReverse function', () => {
  it('Handles a simple reversal', () => {
    const output = mapReverse([1, 2, 3], (i) => 2 * i);
    expect(output).toEqual([6, 4, 2]);
  });

  it('Is fine with just empty arrays', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(mapReverse([], () => {})).toEqual([]);
  });

  it('Handles a single item', () => {
    expect(mapReverse(['foo'], (s) => s.charAt(0))).toEqual(['f']);
  });

  it('Is okay with changing types', () => {
    expect(mapReverse(['foo', 'ba', 'r'], (s) => s.length)).toEqual([1, 2, 3]);
  });

  it('Can access the input index', () => {
    const arr = ['hello', 'world'];
    expect(
      mapReverse(arr, (s, idx) => {
        return `${arr[idx].charAt(idx)}-${idx}-${s}`;
      }),
    ).toEqual(['o-1-world', 'h-0-hello']);
  });
});
