import {
  NEW_STACK_BACK_TO_KEY,
  NEW_STACK_COLUMN_KEY,
  NEW_STACK_EMBEDDED_KEY,
  NEW_STACK_METRIC_KEY,
} from 'types/navTags';
import { AnalysisMetric } from 'generated/graphql';
import { useUserContext } from './useUserContext';
import { useSuperGlobalDateRange } from '../components/super-date-picker/hooks/useSuperGlobalDateRange';

export type NewStackPath =
  | 'event-feed'
  | 'insights'
  | 'dashboards'
  | `dashboards/${string}`
  | `${string}/single-profile`
  | `${string}/constraints`
  | `${string}/segment-analysis`
  | `${string}/llm-secure`
  | `${string}/llm-secure/summary`
  | `${string}/llm-secure/traces`
  | 'settings'
  | 'settings/integrations'
  | 'settings/resource-management'
  | 'settings/notifications'
  | 'settings/user-management'
  | 'settings/access-tokens';

type NewStackProps = {
  path?: NewStackPath;
  orgId: string;
  searchParams?: URLSearchParams;
  datePickerSearchString?: string;
  addBackToParam?: boolean;
};

const handleMonorepoHostUrl = () => {
  const host = window.location.host.replace(':3000', ':3030');
  return `${window.location.protocol}//${host}`;
};

export const getNewStackURL = ({
  path,
  orgId,
  searchParams,
  datePickerSearchString,
  addBackToParam = true,
}: NewStackProps): string => {
  const url = `${handleMonorepoHostUrl()}/${orgId}`;
  const newSearchParams = new URLSearchParams(searchParams);
  if (!newSearchParams.get(NEW_STACK_BACK_TO_KEY) && addBackToParam) {
    newSearchParams.set(NEW_STACK_BACK_TO_KEY, window.location.href);
  }

  const baseUrl = path ? `${url}/${path}` : url;

  const searchString = (() => {
    let text = newSearchParams.toString();

    if (datePickerSearchString) {
      text += `&${datePickerSearchString}`;
    }
    if (!text) return '';
    return `?${text}`;
  })();

  return `${baseUrl}${searchString}`;
};

export const getNewStackEmbeddedURL = ({ searchParams, ...props }: NewStackProps): string => {
  const newSearchParams = new URLSearchParams(searchParams);
  newSearchParams.set(NEW_STACK_EMBEDDED_KEY, 'true');
  return getNewStackURL({ searchParams: newSearchParams, ...props });
};

type MountLlmTraceUrlReturnType = {
  mountLlmTracesUrl(modelId: string): string;
};
export const useMountLlmSecureUrl = (): MountLlmTraceUrlReturnType => {
  const searchParams = new URLSearchParams([[NEW_STACK_BACK_TO_KEY, window.location.href]]);
  const { userState } = useUserContext();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const orgId = userState.user?.organization?.id ?? '';
  const mountLlmTracesUrl = (modelId: string) =>
    getNewStackURL({ path: `${modelId}/llm-secure`, orgId, searchParams, datePickerSearchString });
  return {
    mountLlmTracesUrl,
  };
};

interface TimeseriesDashboardProps {
  resourceId: string;
  orgId: string;
  column?: string;
  metric?: AnalysisMetric;
  datePickerSearchString?: string;
  backToUrl?: string;
}
export const mountIndividualProfileTimeseriesDashboardUrl = ({
  resourceId,
  column,
  orgId,
  metric,
  datePickerSearchString,
  backToUrl,
}: TimeseriesDashboardProps): string | null => {
  const searchParams = new URLSearchParams();
  if (!orgId) return null;
  const path: NewStackPath = `${resourceId}/single-profile`;

  if (column) {
    searchParams.set(NEW_STACK_COLUMN_KEY, column);
  }
  if (metric) {
    searchParams.set(NEW_STACK_METRIC_KEY, metric);
  }
  if (backToUrl) {
    searchParams.set(NEW_STACK_BACK_TO_KEY, backToUrl);
  }

  return getNewStackURL({
    orgId,
    path,
    searchParams,
    datePickerSearchString,
  });
};
