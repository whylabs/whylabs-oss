import { TraceTableCondition } from '~/hooks/composed-filter/composedFilterConditions';
import { ComposedFilterDimension } from '~/hooks/composed-filter/types';

export const dimensionOptions: ComposedFilterDimension[] = [
  {
    label: 'Trace ID',
    type: 'string',
    value: 'traceId',
  },
  {
    label: 'Total policy violations',
    type: 'number',
    value: 'policyIssues',
  },
  {
    label: 'Violation tags',
    type: 'list',
    value: 'violationTags',
  },
  {
    disabled: true,
    disabledTooltip: 'Coming soon',
    label: 'Application ID',
    type: 'string',
    value: 'applicationId',
  },
  {
    label: 'Latency',
    type: 'number',
    value: 'latency',
  },
  {
    label: 'Token Usage',
    type: 'number',
    value: 'tokenUsage',
  },
];
export type TraceFilterDimension = (typeof dimensionOptions)[0]['value'];

export type TraceTableFilter = {
  dimension: TraceFilterDimension;
  condition?: TraceTableCondition | null;
  value?: string | null;
};

export const readableBehaviorMapper = new Map<string, string>([
  ['flag', 'flagged'],
  ['block', 'blocked'],
]);
