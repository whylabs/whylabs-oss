import { isFreeSubscriptionTier, isItOverSubscriptionLimit } from '../subscriptionUtils';

const NON_FREE_TIERS = ['PAID', 'AWS_MARKETPLACE', 'UNKNOWN'];

describe('subscriptionUtils', () => {
  describe('isItOverSubscriptionLimit', () => {
    it('should return true if tier is FREE and modelCount is more than 2', () => {
      expect(
        isItOverSubscriptionLimit({
          modelCount: 3,
          tier: 'FREE',
        }),
      ).toBe(true);
    });

    it('should return false if tier is FREE and modelCount is 2', () => {
      expect(
        isItOverSubscriptionLimit({
          modelCount: 2,
          tier: 'FREE',
        }),
      ).toBe(false);
    });

    it('should return false if tier is FREE and modelCount is less than 2', () => {
      expect(
        isItOverSubscriptionLimit({
          modelCount: 1,
          tier: 'FREE',
        }),
      ).toBe(false);
    });

    it.each(NON_FREE_TIERS)('should return false if tier is %p', (tier) => {
      expect(
        isItOverSubscriptionLimit({
          modelCount: 10,
          tier,
        }),
      ).toBe(false);
    });
  });

  describe('isFreeSubscriptionTier', () => {
    it('should return true for free tier', () => {
      expect(isFreeSubscriptionTier('FREE')).toBe(true);
    });

    it.each(NON_FREE_TIERS)('should return false for %p tier', (tier) => {
      expect(isFreeSubscriptionTier(tier)).toBe(false);
    });
  });
});
