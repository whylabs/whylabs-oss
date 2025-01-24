import { getLogger } from '../../../providers/logger';
import { sendSlackMessage } from '../../notifications/slack-wrapper';
import { SecretType, retrieveSecretManagerSecret } from '../../security/secrets';
import { AnonymousFeedback, IdentifiableFeedback, generateFeedbackUI } from './feedback-slack-blocks';

const logger = getLogger('FeedbackLogger');

export const submitFeedback = async (feedback: AnonymousFeedback | IdentifiableFeedback): Promise<void> => {
  const { orgId, userId } = feedback;
  try {
    logger.info('Submitting feedback from user %s, org %s', userId, orgId);
    const { webhook } = (await retrieveSecretManagerSecret(SecretType.Feedback)) ?? {};
    if (!webhook) throw Error("Feedback webhook not configured in secrets, can't send feedback!");

    const blocks = generateFeedbackUI(feedback);
    await sendSlackMessage(webhook, blocks);
  } catch (err) {
    logger.error(err, 'Unable to submit feedback from user %s, org %s', userId, orgId);
  }
};
