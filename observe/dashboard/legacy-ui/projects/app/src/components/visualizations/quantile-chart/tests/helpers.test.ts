import { DatedData } from 'types/graphTypes';
import { DistanceEvent } from 'hooks/useFeatureDistance';
import { DistanceTimestamp, matchDatesAndArrangeSpacesForSortedData } from '../helpers';

describe.only('Tests for filling in spaces in data', () => {
  it('matches up matching data', () => {
    const data: DatedData[] = [{ dateInMillis: 1 }, { dateInMillis: 2 }, { dateInMillis: 3 }];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 1, distanceValue: 1, threshold: 1 },
      { dateInMillis: 2, distanceValue: 1, threshold: 1 },
      { dateInMillis: 3, distanceValue: 1, threshold: 1 },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 1);
    expect(matched.length).toEqual(3);
    dqe.forEach((d, i) => {
      expect(d.dateInMillis).toEqual(matched[i].dateInMillis);
      expect(d.distanceValue).toEqual(matched[i].distanceValue);
    });
  });

  it('matches with delta', () => {
    const data: DatedData[] = [{ dateInMillis: 10 }, { dateInMillis: 20 }, { dateInMillis: 30 }];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 21, distanceValue: 2, threshold: 2 },
      { dateInMillis: 31, distanceValue: 3, threshold: 5 },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 2);
    expect(matched.length).toEqual(3);
    dqe.forEach((d, i) => {
      expect(d.dateInMillis).toEqual(matched[i].dateInMillis);
      expect(d.distanceValue).toEqual(matched[i].distanceValue);
      expect(d.threshold).toEqual(matched[i].threshold);
    });
  });

  it('adds a null in the middle when expected', () => {
    const data: DatedData[] = [{ dateInMillis: 10 }, { dateInMillis: 20 }, { dateInMillis: 30 }];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 31, distanceValue: 1, threshold: 1 },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 2);
    expect(matched.length).toEqual(3);
    expect(matched[1].dateInMillis).toEqual(data[1].dateInMillis);
    expect(matched[1].distanceValue).toBeNull();
  });

  it('replaces a mismatch with a null', () => {
    const data: DatedData[] = [{ dateInMillis: 10 }, { dateInMillis: 20 }, { dateInMillis: 30 }];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 25, distanceValue: 2, threshold: 1 },
      { dateInMillis: 31, distanceValue: 3, threshold: 1 },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 2);
    expect(matched.length).toEqual(3);
    expect(matched[1].dateInMillis).toEqual(data[1].dateInMillis);
    expect(matched[1].distanceValue).toBeNull();
    expect(matched[2].distanceValue).toEqual(3);
  });

  it('pads the end with nulls', () => {
    const data: DatedData[] = [
      { dateInMillis: 10 },
      { dateInMillis: 20 },
      { dateInMillis: 30 },
      { dateInMillis: 40 },
      { dateInMillis: 50 },
    ];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 19, distanceValue: 2, threshold: 1 },
      { dateInMillis: 31, distanceValue: 3, threshold: 1 },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 2);
    expect(matched.length).toEqual(5);
    expect(matched[0].distanceValue).not.toBeNull();
    expect(matched[1].distanceValue).not.toBeNull();
    expect(matched[2].distanceValue).not.toBeNull();

    expect(matched[4].dateInMillis).toEqual(data[4].dateInMillis);
    expect(matched[3].distanceValue).toBeNull();
    expect(matched[4].distanceValue).toBeNull();
  });

  it('handles overloaded DQEs', () => {
    const data: DatedData[] = [
      { dateInMillis: 10 },
      { dateInMillis: 20 },
      { dateInMillis: 30 },
      { dateInMillis: 40 },
      { dateInMillis: 50 },
    ];
    const dqe: DistanceEvent[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 19, distanceValue: 2, threshold: 4 },
      { dateInMillis: 19, distanceValue: 2, threshold: 4 },
      { dateInMillis: 31, distanceValue: 3, threshold: 6 },
      { dateInMillis: 31, distanceValue: 3, threshold: 6 },
      { dateInMillis: 41, distanceValue: 4, threshold: 8 },
      { dateInMillis: 41, distanceValue: 4, threshold: 8 },
    ];

    const expected: DistanceTimestamp[] = [
      { dateInMillis: 11, distanceValue: 1, threshold: 1 },
      { dateInMillis: 19, distanceValue: 2, threshold: 4 },
      { dateInMillis: 31, distanceValue: 3, threshold: 6 },
      { dateInMillis: 41, distanceValue: 4, threshold: 8 },
      { dateInMillis: 50, distanceValue: null, threshold: null },
    ];
    const matched = matchDatesAndArrangeSpacesForSortedData(data, dqe, 2);
    expect(matched.length).toEqual(5);
    expected.forEach((ex, i) => {
      expect(ex.dateInMillis).toEqual(matched[i].dateInMillis);
      if (ex.distanceValue !== null) {
        expect(ex.distanceValue).toEqual(matched[i].distanceValue);
        expect(ex.threshold).toEqual(matched[i].threshold);
      } else {
        expect(matched[i].distanceValue).toBeNull();
        expect(matched[i].threshold).toBeNull();
      }
    });
  });
});
