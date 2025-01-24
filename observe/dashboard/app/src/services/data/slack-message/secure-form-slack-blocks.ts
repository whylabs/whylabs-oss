import { KnownBlock } from '@slack/types';

import { SecureForm } from '../../../graphql/generated/graphql';
import { InfoItem, generateRow } from './utils';

export interface SecureFormPayload extends SecureForm {
  orgId: string;
  orgName: string;
  impersonatedBy: string | null; // email of the user impersonating whoever sent the form
  userId: string;
  userEmail: string;
  userName: string;
}

export const generateSecureFormUI = (form: SecureFormPayload): KnownBlock[] => {
  const userInfoData: InfoItem[] = [
    { title: 'Name', info: form.userName ?? '' },
    { title: 'Email', info: form.userEmail ?? '' },
    { title: 'User ID', info: form.userId ?? '' },
    { title: 'Impersonated', info: form.impersonatedBy ? `Yes, by ${form.impersonatedBy}` : 'No' },
  ];

  const orgInfoData: InfoItem[] = [
    { title: 'Org name', info: form.orgName ?? '' },
    { title: 'Org ID', info: form.orgId ?? '' },
    { title: 'Resource ID', info: form.datasetId ?? '' },
  ];

  const feedbackFirstColumnData: InfoItem[] = [
    { title: 'Inputted full name', info: form.fullName ?? '' },
    { title: 'Inputted phone', info: form.phone || 'N/A' },
    { title: 'Iputted contact mail', info: form.contactEmail || 'N/A' },
  ];

  return [generateRow(userInfoData, orgInfoData), generateRow(feedbackFirstColumnData, [])];
};
