import { router } from '../trpc';
import { apiKeys } from './api-keys/api-keys';
import { general } from './general';
import { integrations } from './integrations';
import { embeddingsProjector } from './llm-trace/embeddings-projector';
import { llmTrace } from './llm-trace/llm-trace';
import { llmTracePolicy } from './llm-trace/policy';
import { llmTraceSummary } from './llm-trace/summary';
import memberships from './memberships';
import { monitors } from './monitors';
import { notifications } from './notifications/notifications';
import organizations from './organizations';
import { profiles } from './profiles';
import resources from './resources';
import { resourcesSettings } from './resources/resources-settings';
import segments from './segments';
import { user } from './user';

const meta = router({
  organizations,
  apiKeys,
  embeddingsProjector,
  general,
  integrations,
  llmTrace,
  llmTracePolicy,
  llmTraceSummary,
  memberships,
  monitors,
  notifications,
  profiles,
  resources,
  resourcesSettings,
  segments,
  user,
});

export default meta;
