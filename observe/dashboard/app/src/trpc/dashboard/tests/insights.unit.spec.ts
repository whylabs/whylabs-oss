import { expect } from 'chai';
import { z } from 'zod';

import { SingleProfileInsightsRequest } from '../../dto/insights.dto';
import { Granularity } from '../../util/enums';
import { getCaller } from '../../util/testUtils.spec';

type InputType = z.infer<typeof SingleProfileInsightsRequest>;
const mockForTest: InputType = {
  resourceId: 'model-0',
  orgId: 'org-test',
  granularity: Granularity.enum.P1D,
  referenceProfileId: 'profile-ID',
  segment: [],
};

describe('TRPC dashboard.insights', function () {
  describe('dashboard.insights.list', function () {
    it('should return an empty list', async function () {
      const caller = getCaller();

      const result = await caller.dashboard.insights.getForSingleProfile(mockForTest);
      expect(result).to.be.an('array').that.has.length(1);
      expect(result[0]).to.be.an('object').that.has.property('name', 'mocked-insight');
    });
  });
});
