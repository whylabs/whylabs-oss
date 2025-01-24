import { decodeObject, encodeObject } from './uriUtils';

describe('uriUtils', () => {
  describe('decodeObject()', () => {
    it.each([
      ['%7B%22text%22%3A%22decoded%20object%22%2C%22number%22%3A2%7D', { text: 'decoded object', number: 2 }],
      [
        '%7B%22text%22%3A%22another-decoded-object%22%2C%22number%22%3A5%2C%22active%22%3Atrue%7D',
        { text: 'another-decoded-object', number: 5, active: true },
      ],
    ])('should decode object from %p', (encodedString, expected) => {
      expect(decodeObject(encodedString)).toEqual(expected);
    });
  });

  describe('encodeObject()', () => {
    it.each([
      [{ text: 'a object', number: 10 }, '%7B%22text%22%3A%22a%20object%22%2C%22number%22%3A10%7D'],
      [
        { text: 'another-object', number: 3, active: false },
        '%7B%22text%22%3A%22another-object%22%2C%22number%22%3A3%2C%22active%22%3Afalse%7D',
      ],
    ])('should encode object %p', (object, expected) => {
      expect(encodeObject(object)).toEqual(expected);
    });
  });
});
