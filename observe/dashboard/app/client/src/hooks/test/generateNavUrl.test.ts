import { POLICY_OPENED_CARD } from '~/utils/searchParamsConstants';

import { generateNavUrl } from '../useWhylabsNavigation';

describe('Tests for generating navigational links', () => {
  it('Testing invalid navigation to llm-secure without pass resourceId', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', orgId: 'org-test' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/');
  });

  it('Testing navigation to resources root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'resources', orgId: 'org-test' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/resources?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to custom dashboards root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'dashboards', orgId: 'org-test' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/dashboards?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to custom dashboards/:id', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'dashboards', orgId: 'org-test', dashboards: { dashboardId: 'my-dashboard' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/dashboards/my-dashboard?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to custom dashboards/:id/:graphId', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'dashboards', orgId: 'org-test', dashboards: { dashboardId: 'my-dashboard', graphId: 'new-graph' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/dashboards/my-dashboard/new-graph?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', orgId: 'org-test', resourceId: 'llm-test-model' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/llm-test-model/llm-secure?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure summary path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', orgId: 'org-test', resourceId: 'llm-test-model', llmSecure: { path: 'summary' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/llm-test-model/llm-secure/summary?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure traces embeddings-projector path', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', page: 'embeddings-projector' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/traces/embeddings-projector?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure policy root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', orgId: 'org-test', resourceId: 'llm-test-model', llmSecure: { path: 'policy' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/llm-test-model/llm-secure/policy?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure policy with card hash', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy' },
        setParams: [{ name: POLICY_OPENED_CARD, value: 'misuse' }],
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/policy?startDate=2024-04-20&endDate=2024-04-26&policyCard=misuse',
    );
  });

  it('Testing navigation to llm secure policy advanced-settings', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy', page: 'advanced-settings' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/policy/advanced-settings?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure policy change-history', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy', page: 'change-history' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/policy/change-history?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure traces', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/llm-test-model/llm-secure/traces?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure traces/traceId', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', traceId: 'test-trace-id' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/traces/test-trace-id?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure traces/traceId/traceItemId', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',
        orgId: 'org-test',
        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', traceId: 'test-trace-id', traceItem: 'test-item-id' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/org-test/llm-test-model/llm-secure/traces/test-trace-id/test-item-id?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to segment analysis', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'segment-analysis', orgId: 'org-test', resourceId: 'model-test' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/org-test/model-test/segment-analysis?startDate=2024-04-20&endDate=2024-04-26');
  });
});
