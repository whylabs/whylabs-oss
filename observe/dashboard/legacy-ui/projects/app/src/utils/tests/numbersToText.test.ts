import { numbersToText } from 'utils/numbersToText';

describe('Testing number to text conversion', () => {
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'three'],
    [4, 'four'],
    [5, 'five'],
    [6, 'six'],
    [7, 'seven'],
    [8, 'eight'],
    [9, 'nine'],
    [10, 'ten'],
    [11, 'eleven'],
    [12, 'twelve'],
    [13, 'thirteen'],
    [14, 'fourteen'],
    [15, 'fifteen'],
    [16, 'sixteen'],
    [17, 'seventeen'],
    [18, 'eighteen'],
    [19, 'nineteen'],
    [20, 'twenty'],
  ])('should render simple numbers', (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });

  it.each([
    [24, 'twenty-four'],
    [35, 'thirty-five'],
    [46, 'forty-six'],
    [57, 'fifty-seven'],
    [68, 'sixty-eight'],
    [79, 'seventy-nine'],
    [80, 'eighty'],
    [82, 'eighty-two'],
    [91, 'ninety-one'],
    [93, 'ninety-three'],
  ])(`should render numbers with tens`, (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });

  it.each([
    [100, 'one hundred'],
    [101, 'one hundred and one'],
    [110, 'one hundred and ten'],
    [111, 'one hundred and eleven'],
    [120, 'one hundred and twenty'],
    [121, 'one hundred and twenty-one'],
    [200, 'two hundred'],
    [201, 'two hundred and one'],
    [210, 'two hundred and ten'],
    [211, 'two hundred and eleven'],
    [220, 'two hundred and twenty'],
    [221, 'two hundred and twenty-one'],
    [999, 'nine hundred and ninety-nine'],
  ])('should render numbers with hundreds', (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });

  it.each([
    [1000, 'one thousand'],
    [1001, 'one thousand and one'],
    [1010, 'one thousand and ten'],
    [1011, 'one thousand and eleven'],
    [1100, 'one thousand, one hundred'],
    [1101, 'one thousand, one hundred and one'],
    [1110, 'one thousand, one hundred and ten'],
    [1111, 'one thousand, one hundred and eleven'],
    [2000, 'two thousand'],
    [2001, 'two thousand and one'],
    [2010, 'two thousand and ten'],
    [2011, 'two thousand and eleven'],
    [2100, 'two thousand, one hundred'],
    [2101, 'two thousand, one hundred and one'],
    [2110, 'two thousand, one hundred and ten'],
    [2111, 'two thousand, one hundred and eleven'],
    [9999, 'nine thousand, nine hundred and ninety-nine'],
  ])(`should render numbers with thousands`, (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });

  it.each([
    [-5, 'negative five'],
    [-100, 'negative one hundred'],
    [-1000, 'negative one thousand'],
  ])(`should render negative numbers`, (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });

  it.each([
    [10001, '10001'],
    [32.7, 'thirty-three'],
  ])('handles out-of-bounds numbers as expected', (input, output) => {
    expect(numbersToText(input)).toBe(output);
  });
});
