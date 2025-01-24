import { POLICY_OPENED_CARD } from '~/utils/searchParamsConstants';

import { generateNavUrl } from '../useWhylabsNavigation';

describe('Tests for generating navigational links', () => {
  it('Testing invalid navigation to llm-secure without pass resourceId', () => {
    const notFoundUrl = generateNavUrl({ page: 'llm-secure' }, '?startDate=2024-04-20&endDate=2024-04-26');
    expect(notFoundUrl).toEqual('/');
  });

  it('Testing navigation to resources root path', () => {
    const notFoundUrl = generateNavUrl({ page: 'resources' }, '?startDate=2024-04-20&endDate=2024-04-26');
    expect(notFoundUrl).toEqual('/resources?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', resourceId: 'llm-test-model' },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/llm-test-model/llm-secure?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure summary path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', resourceId: 'llm-test-model', llmSecure: { path: 'summary' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/llm-test-model/llm-secure/summary?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure traces embeddings-projector path', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', page: 'embeddings-projector' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/traces/embeddings-projector?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure policy root path', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'llm-secure', resourceId: 'llm-test-model', llmSecure: { path: 'policy' } },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/llm-test-model/llm-secure/policy?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure policy with card hash', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy' },
        setParams: [{ name: POLICY_OPENED_CARD, value: 'misuse' }],
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/policy?startDate=2024-04-20&endDate=2024-04-26&policyCard=misuse',
    );
  });

  it('Testing navigation to llm secure policy callback-settings', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy', page: 'callback-settings' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/policy/callback-settings?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure policy advanced-settings', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy', page: 'advanced-settings' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/policy/advanced-settings?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure policy change-history', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'policy', page: 'change-history' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/policy/change-history?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure completions', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'completions' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/llm-test-model/llm-secure/completions?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure traces', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual('/llm-test-model/llm-secure/traces?startDate=2024-04-20&endDate=2024-04-26');
  });

  it('Testing navigation to llm secure traces/traceId', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', traceId: 'test-trace-id' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/traces/test-trace-id?startDate=2024-04-20&endDate=2024-04-26',
    );
  });

  it('Testing navigation to llm secure traces/traceId/traceItemId', () => {
    const notFoundUrl = generateNavUrl(
      {
        page: 'llm-secure',

        resourceId: 'llm-test-model',
        llmSecure: { path: 'traces', traceId: 'test-trace-id', traceItem: 'test-item-id' },
      },
      '?startDate=2024-04-20&endDate=2024-04-26',
    );
    expect(notFoundUrl).toEqual(
      '/llm-test-model/llm-secure/traces/test-trace-id/test-item-id?startDate=2024-04-20&endDate=2024-04-26',
    );
  });
});
