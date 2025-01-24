import { z } from 'zod';

import { UNKNOWN_METADATA_VALUE } from '../../constants';
import { DEMO_ORG_ID } from '../../graphql/authz/user-context';
import { submitFeedback } from '../../services/data/slack-message/feedback';
import { AnonymousFeedback, IdentifiableFeedback } from '../../services/data/slack-message/feedback-slack-blocks';
import { getOrganization } from '../../services/data/songbird/api-wrappers/organizations';
import { logger } from '../../services/data/songbird/api-wrappers/utils';
import { publicProcedure, router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

enum FeedbackCategory {
  Bug = 'Bug',
  General = 'General',
  Request = 'Request',
}

export const general = router({
  demoOrgId: publicProcedure.query(async () => DEMO_ORG_ID),
  sendFeedback: viewDataProcedure
    .input(
      z.object({
        category: z.nativeEnum(FeedbackCategory),
        component: z.string(),
        featureName: z.string().optional(),
        message: z.string(),
        resourceId: z.string().optional(),
        submitAnonymously: z.boolean().optional(),
        tags: z.array(z.string()),
        trackID: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);

      const { category, component, featureName, message, orgId, resourceId, submitAnonymously, tags, trackID, url } =
        input;
      const orgMetadata = await getOrganization(orgId, callOptions);
      const orgName = orgMetadata?.name ?? UNKNOWN_METADATA_VALUE;

      const originalUserId = ctx.impersonation?.userId;

      const anonymousFeedback: AnonymousFeedback = {
        orgId,
        orgName,
        userId: null,
        userName: null,
        userEmail: null,
        component,
        category,
        tags,
        featureName,
        datasetId: resourceId,
        message,
        impersonatedBy: originalUserId ?? null,
        trackID,
        url,
      };

      try {
        const { email, name, userId } = ctx.userMetadata ?? {};
        const finalizedFeedback: AnonymousFeedback | IdentifiableFeedback = submitAnonymously
          ? anonymousFeedback
          : {
              ...anonymousFeedback,
              userId: userId ?? UNKNOWN_METADATA_VALUE,
              userEmail: email ?? UNKNOWN_METADATA_VALUE,
              userName: name ?? UNKNOWN_METADATA_VALUE,
            };

        logger.debug(
          'Submitting %s feedback for org %s trackId %s',
          submitAnonymously ? 'anonymous' : 'identifiable',
          orgId,
          trackID,
        );
        await submitFeedback(finalizedFeedback);
        return true;
      } catch (err) {
        logger.error(err, 'Failed to submit feedback for org %s', orgId);
        return false;
      }
    }),
});
