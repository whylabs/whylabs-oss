import { KnownBlock } from '@slack/types';

import { Feedback } from '../../../graphql/generated/graphql';
import { InfoItem, generateMessage, generateRow } from './utils';

interface FeedbackExtended extends Feedback {
  orgId: string;
  orgName: string;
  impersonatedBy: string | null; // email of the user impersonating whoever sent the feedback
}

export type AnonymousFeedback = FeedbackExtended & {
  userId: null;
  userEmail: null;
  userName: null;
};

export type IdentifiableFeedback = FeedbackExtended & {
  userId: string;
  userEmail: string;
  userName: string;
};

export const generateFeedbackUI = (message: AnonymousFeedback | IdentifiableFeedback): KnownBlock[] => {
  const userInfoData: InfoItem[] = [
    { title: 'Name', info: message.userName ?? '' },
    { title: 'Email', info: message.userEmail ?? '' },
    { title: 'User ID', info: message.userId ?? '' },
    { title: 'Impersonated', info: message.impersonatedBy ? `Yes, by ${message.impersonatedBy}` : 'No' },
  ];

  const orgInfoData: InfoItem[] = [
    { title: 'Org name', info: message.orgName ?? '' },
    { title: 'Org ID', info: message.orgId ?? '' },
  ];

  const feedbackFirstColumnData: InfoItem[] = [
    { title: 'Component', info: message.component ?? '' },
    { title: 'Feature name', info: message.featureName ?? '' },
    { title: 'Dataset ID', info: message.datasetId ?? '' },
  ];

  const feedbackSecondColumnData: InfoItem[] = [
    { title: 'Category', info: message.category ?? '' },
    { title: 'Tags', info: message.tags.join() },
  ];

  const trackColumnData: InfoItem[] = [
    { title: 'URL', info: message.url ?? 'N/A' },
    { title: 'LogRocket trackID', info: message.trackID ?? 'N/A' },
  ];

  return [
    generateRow(userInfoData, orgInfoData),
    generateRow(feedbackFirstColumnData, feedbackSecondColumnData),
    generateRow(trackColumnData),
    generateMessage(message.message),
  ];
};
