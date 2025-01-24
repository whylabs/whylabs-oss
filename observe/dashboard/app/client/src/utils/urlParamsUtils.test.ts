import { setEncodedObjectForSearchParamKey } from './urlParamsUtils';

const PARAM_KEY = 'aList';

describe('urlParamsUtils', () => {
  describe('setEncodedObjectForSearchParamKey()', () => {
    it.each(['key', 'another-key'])('should encode empty object into searchParam using key %p', (paramKey) => {
      const searchParam = new URLSearchParams();

      setEncodedObjectForSearchParamKey(paramKey, {}, searchParam);
      expect(searchParam.toString()).toEqual(`${paramKey}=%257B%257D`);
    });

    it.each([
      [
        { text: 'a object', number: 10 },
        '%257B%2522text%2522%253A%2522a%2520object%2522%252C%2522number%2522%253A10%257D',
      ],
      [
        { text: 'another-object', number: 3, active: false },
        '%257B%2522text%2522%253A%2522another-object%2522%252C%2522number%2522%253A3%252C%2522active%2522%253Afalse%257D',
      ],
    ])('should encode object %p into searchParam', (object, expected) => {
      const searchParam = new URLSearchParams();

      setEncodedObjectForSearchParamKey(PARAM_KEY, object, searchParam);
      expect(searchParam.toString()).toEqual(`${PARAM_KEY}=${expected}`);
    });
  });
});
