import { Block, KnownBlock } from '@slack/types';
import { Image, Link } from '@pagerduty/pdjs/build/src/events';

export interface DigestEmailFeaturesSegment {
  name: string;
  num_anomalies: number;
  link: string | null;
  segments: string[];
}

export interface EmailContent {
  subject: string;
  body: string;
  plainText?: string;
  image?: string;
  imageUrl?: string;
  imageExpiryDate?: Date;
}

export type PagerDutyContent = {
  dedupKey: string;
  summary: string;
  customDetails: JSON;
  imageUrls?: Image[];
  links?: Link[];
};

export type SlackContent = string | (KnownBlock | Block)[];
