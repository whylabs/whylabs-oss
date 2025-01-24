import { getLogger } from '../../providers/logger';
import { sendEmail } from '../../services/email-wrapper';
import { getUser } from '../../services/data/songbird/songbird-wrapper';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import { config } from '../../config';

const logger = getLogger('ImmediateNotificationsManager');

interface UserMembershipSQSMessage {
  org_id: string;
  org_name: string;
  user_id: string;
  user_email: string;
  created_by: string;
}

export type AddMembershipEmailOptions = {
  orgname: string;
  firstname: string;
  message: string;
  subject: string;
  buttontext: string;
  loginurl: string;
};

/**
 * Sends a notification about user membership changes
 */
export const notifyUserMembership = async (messageId: string, sqsMessage: UserMembershipSQSMessage): Promise<void> => {
  const { org_id, org_name, user_id, user_email, created_by } = sqsMessage;
  const toAddresses: string[] = [user_email];

  const createdByUser = created_by ? await getUser(created_by) : undefined;
  // The following check needs to be changed to check via auth0 (e.g. new call in songbird) as a user record is needed
  // to create a membership. So for now isNewMember will always be false.
  // const isNewMember = user_id ? !!(await getUser(user_id)) : false;
  const isNewMember = false;

  if (!createdByUser) {
    logger.warn(
      'created_by user %s was not found. Will send notification for user %s without such info.',
      created_by ?? '',
      user_id ?? user_email,
    );
  }
  const subject = `Whylabs: You have been added to ${org_name}`;
  const options: AddMembershipEmailOptions = {
    orgname: org_name,
    firstname: '',
    message: 'You have been added',
    subject,
    buttontext: isNewMember ? 'Create account' : 'Sign in',
    loginurl: isNewMember ? `${config.defaultUrlDomain}/signup` : `${config.defaultUrlDomain}/login`,
  };
  logger.info(
    'Sending user membership notification for orgId %s. orgName: %s, userId: %s, userEmail: %s. createdBy: %s, Message %s',
    org_id,
    org_name,
    user_id,
    user_email,
    created_by,
    messageId,
  );

  await sendEmail(messageId, { body: composeAddMembershipEmail(options), subject }, { id: org_id }, toAddresses);
};

export const composeAddMembershipEmail = (options: AddMembershipEmailOptions): string => {
  const emailTemplate = fs.readFileSync(path.join(__dirname, '../../../email-templates/add-membership-template.hbs'));
  const compiledTemplate = handlebars.compile<AddMembershipEmailOptions>(emailTemplate.toString());
  return compiledTemplate(options);
};
