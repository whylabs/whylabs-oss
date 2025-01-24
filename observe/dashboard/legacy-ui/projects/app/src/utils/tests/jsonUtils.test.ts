import { findLineByJsonKey, findLineByJsonPosition, getJsonPositionByError, translateJsonObject } from '../JsonUtils';

const rawTestObj = `{
  "foo": {
    "test": true
  },
  "foo2": {
    "test": false
  },
  "year": 2023
}`;
const testObj = JSON.parse(rawTestObj);
describe('Testing translateJsonObject function', () => {
  it('Translating to null with empty param', () => {
    const nullEmptyTranslated = translateJsonObject();
    expect(nullEmptyTranslated).toBeNull();
  });

  it('Translating to null with undefined param', () => {
    const nullTranslated = translateJsonObject(undefined);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with string param', () => {
    const nullTranslated = translateJsonObject('not_object');
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with number param', () => {
    const nullTranslated = translateJsonObject(2023);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with boolean param', () => {
    const nullTranslated = translateJsonObject(true);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with empty array param', () => {
    const nullTranslated = translateJsonObject([]);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with non-object array param', () => {
    const nullTranslated = translateJsonObject(['not_object']);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to null with array of array param', () => {
    const nullTranslated = translateJsonObject([['not_json']]);
    expect(nullTranslated).toBeNull();
  });

  it('Translating to JSON with json object param', () => {
    const jsonTranslated = translateJsonObject(testObj);
    expect(jsonTranslated).toStrictEqual(testObj);
  });
});

describe('Testing findLineByJsonKey function', () => {
  it('Find line of test key correctly', () => {
    const lineIndex = findLineByJsonKey(rawTestObj, 'test');
    expect(lineIndex).toEqual(2);
  });

  it('Find line of second test param correctly', () => {
    const lineIndex = findLineByJsonKey(rawTestObj, 'test', 3);
    expect(lineIndex).toEqual(5);
  });

  it('Not find line of nonexistent param', () => {
    const lineIndex = findLineByJsonKey(rawTestObj, 'unknown');
    expect(lineIndex).toEqual(-1);
  });

  it('Not find line of empty param', () => {
    const lineIndex = findLineByJsonKey(rawTestObj, '');
    expect(lineIndex).toEqual(-1);
  });
});

describe('Testing getJsonPositionByError function', () => {
  it('Get position by error at string end', () => {
    try {
      JSON.parse(rawTestObj.concat(`{`));
    } catch (e) {
      const position = getJsonPositionByError(e);
      expect(position).toEqual(rawTestObj.length);
    }
  });

  it('Get position by error at string start', () => {
    try {
      JSON.parse('%'.concat(rawTestObj));
    } catch (e) {
      const position = getJsonPositionByError(e);
      expect(position).toEqual(0);
    }
  });

  it('Returns 0 if theres no position on error', () => {
    const position = getJsonPositionByError(new Error());
    expect(position).toEqual(0);
  });
});

describe('Testing findLineByJsonPosition function', () => {
  it('Get last line index by position', () => {
    const position = findLineByJsonPosition(rawTestObj, rawTestObj.length);
    expect(position).toEqual(8);
  });

  it('Get third line index by position', () => {
    const lines = rawTestObj.split('\n');
    const thirdLineLastPosition = lines[0].length + lines[1].length + lines[2].length;
    const position = findLineByJsonPosition(rawTestObj, thirdLineLastPosition);
    expect(position).toEqual(2);
  });

  it('Get 0 as index by not found position', () => {
    const position = findLineByJsonPosition(rawTestObj, 9999);
    expect(position).toEqual(0);
  });
});
