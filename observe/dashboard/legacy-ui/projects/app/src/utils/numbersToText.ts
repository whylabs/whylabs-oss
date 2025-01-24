const rawValues = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const hundred = 'hundred';
const thousand = 'thousand';
const tensConnector = 'and';
const hundredsConnector = ',';

/**
 * Converts integer input to text output in English.
 * Cannot handle numbers larger than 9999.
 * Handles decimal numbers by rounding them.
 *
 * When fed values outside of these constraints, the function will return a string representation
 * of the digits themselves (e.g. 10000 will return "10000").
 * @param input The number to be converted to text
 */
export function numbersToText(input: number): string {
  if (input < 0) {
    return `negative ${numbersToText(-1 * input)}`;
  }
  const rounded = Math.round(input);
  if (rounded < 20) {
    return rawValues[input];
  }
  if (rounded < 100) {
    return tens[Math.floor(rounded / 10)] + (rounded % 10 !== 0 ? '-' : '') + ones[rounded % 10];
  }
  if (rounded < 1000) {
    return `${ones[Math.floor(rounded / 100)]} ${hundred}${
      rounded % 100 !== 0 ? ` ${tensConnector} ${numbersToText(rounded % 100)}` : ''
    }`;
  }
  if (rounded < 10000) {
    const start = `${ones[Math.floor(rounded / 1000)]} ${thousand}`;
    if (rounded % 1000 === 0) {
      return start;
    }
    if (rounded % 1000 < 100) {
      return `${start} ${tensConnector} ${numbersToText(rounded % 1000)}`;
    }
    return `${start + hundredsConnector} ${numbersToText(rounded % 1000)}`;
  }

  return input.toString();
}
