import { getLogger } from '../../../providers/logger';
import { sendSlackMessage } from '../../notifications/slack-wrapper';
import { SecretType, retrieveSecretManagerSecret } from '../../security/secrets';
import { SecureFormPayload, generateSecureFormUI } from './secure-form-slack-blocks';
const logger = getLogger('FeedbackLogger');

export const submitSecureForm = async (form: SecureFormPayload): Promise<void> => {
  const { orgId, userId } = form;
  try {
    logger.info('Submitting secure from user %s, org %s', userId, orgId);
    const { webhook } = (await retrieveSecretManagerSecret(SecretType.SecureForm)) ?? {};
    if (!webhook) throw Error("Secure Form webhook not configured in secrets, can't submit the form!");

    const blocks = generateSecureFormUI(form);
    await sendSlackMessage(webhook, blocks);
  } catch (err) {
    logger.error(err, 'Unable to submit secure form from user %s, org %s', userId, orgId);
  }
};
