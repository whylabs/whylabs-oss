import { Colors } from '@whylabs/observatory-lib';
import { generateColorRange, prepareCategoriesWithOtherData } from '../utils';

describe('Test the addition of an "Other" category in top-K', () => {
  it('Adds nothing when there are no other categories', () => {
    const topItems: [string, number][] = [
      ['foo', 10],
      ['bar', 5],
      ['baz', 1],
    ];
    const otherItems: [string, number][] = [];
    const topCategories = prepareCategoriesWithOtherData(topItems, otherItems, 'hello');
    expect(topCategories.length).toEqual(3);
    expect(topCategories.includes('hello')).toBe(false);
  });

  it('Adds the Other item to the end when it is the smallest', () => {
    const topItems: [string, number][] = [
      ['foo', 10],
      ['bar', 5],
      ['baz', 4],
    ];
    const topNames = topItems.map((ti) => ti[0]);
    const otherItems: [string, number][] = [
      ['why', 2],
      ['me', 1],
    ];
    const topCategories = prepareCategoriesWithOtherData(topItems, otherItems, 'hello');
    expect(topCategories.length).toEqual(4);
    expect(topCategories).toStrictEqual([...topNames, 'hello']);
  });

  it('Adds the Other item at the appropriate index when it is not the smallest item', () => {
    const topItems: [string, number][] = [
      ['foo', 10],
      ['bar', 5],
      ['baz', 4],
    ];
    const otherItems: [string, number][] = [
      ['why', 5],
      ['me', 1],
    ];
    const expectedOrder = ['foo', 'hello', 'bar', 'baz'];
    const topCategories = prepareCategoriesWithOtherData(topItems, otherItems, 'hello');
    expect(topCategories.length).toEqual(4);
    expect(topCategories).toStrictEqual(expectedOrder);
  });
});

describe('Tests for the color range generator', () => {
  it('Does not update the range if there is no "other" item in the array', () => {
    const displayedNames = ['foo', 'bar', 'baz'];
    const colorArray = generateColorRange(displayedNames, 'hello', 'notARealColor');
    expect(colorArray.includes('notARealColor')).toBe(false);
  });

  it('Adds the injected color at the appropriate location in the simple case', () => {
    const displayedNames = ['a', 'b', 'c', 'target', 'd'];
    const colorArray = generateColorRange(displayedNames, 'target', 'findMe');
    expect(colorArray.length).toEqual(Colors.chartColorArray.length + 1);
    expect(colorArray[3]).toEqual('findMe');
  });
});
