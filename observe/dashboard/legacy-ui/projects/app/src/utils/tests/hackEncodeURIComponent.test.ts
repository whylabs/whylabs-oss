import { hackEncodeURIComponent } from '../hackEncodeURIComponent';

describe('testing hackEncodeURIComponent', () => {
  it.each([
    ['my_column name', 'my_column%20name'],
    ['string with %', 'string%2520with%2520%2525'],
  ])('testing with %p string', (input, expected) => {
    const encoded = hackEncodeURIComponent(input);
    expect(encoded).toEqual(expected);
  });
});
