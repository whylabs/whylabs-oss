import { expect } from 'chai';

import { tagsToDataServiceSegment } from './data-service-utils';

describe('Data service utils', function () {
  describe('tagsToDataServiceSegment', function () {
    it('should return an empty array if segment tags are empty', function () {
      expect(tagsToDataServiceSegment([])).to.eq('');
    });

    it('should return a string representing a segment for key/value pairs', function () {
      expect(
        tagsToDataServiceSegment([
          { key: 'key1', value: 'value1' },
          {
            key: 'key2',
            value: 'value2',
          },
        ]),
      ).to.eq('key1=value1&key2=value2');
    });
  });
});
