import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { ForcedStickyParams, generateNavUrl } from '../usePageLinkHandler';

describe('Tests for generating navigational links', () => {
  it('correctly navigates to not found', () => {
    const notFoundUrl = generateNavUrl(
      { page: 'notFound' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(notFoundUrl).toEqual(
      '/404?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates home with settled search params', () => {
    const homeUrl = generateNavUrl(
      { page: 'home', setParams: [{ name: TARGET_ORG_QUERY_NAME, value: 'org-123' }] },
      '',
    );
    expect(homeUrl).toEqual(`/resources?${TARGET_ORG_QUERY_NAME}=org-123`);
  });

  it('correctly navigates home with settled search params in a existent foundSearchString', () => {
    const homeUrl = generateNavUrl(
      { page: 'home', setParams: [{ name: 'offset', value: '10' }] },
      `?${TARGET_ORG_QUERY_NAME}=org-123`,
    );
    expect(homeUrl).toEqual(`/resources?${TARGET_ORG_QUERY_NAME}=org-123&offset=10`);
  });

  it('correctly navigates home with new value for a existent search params in a foundSearchString', () => {
    const homeUrl = generateNavUrl(
      { page: 'home', setParams: [{ name: 'value', value: '321' }] },
      `?${TARGET_ORG_QUERY_NAME}=org-123&value=123`,
    );
    expect(homeUrl).toEqual(`/resources?${TARGET_ORG_QUERY_NAME}=org-123&value=321`);
  });

  it('correctly navigates home with a bunch of settled search params in a existent foundSearchString', () => {
    const homeUrl = generateNavUrl(
      {
        page: 'home',
        setParams: [
          { name: 'offset', value: '10' },
          { name: 'limit', value: '40' },
          { name: 'feature-highlight', value: 'column' },
        ],
      },
      `?${TARGET_ORG_QUERY_NAME}=org-123`,
    );
    expect(homeUrl).toEqual(`/resources?${TARGET_ORG_QUERY_NAME}=org-123&offset=10&limit=40&feature-highlight=column`);
  });

  it('correctly navigates home with no other details', () => {
    const homeUrl = generateNavUrl({ page: 'home' }, '');
    expect(homeUrl).toEqual('/resources');
  });

  it('correctly navigates home and keeps appropriate search parameters', () => {
    const homeUrl = generateNavUrl(
      { page: 'home' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('removes search parameters when asked', () => {
    const homeUrl = generateNavUrl(
      { page: 'home', ignoreOldQueryString: true },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual('/resources');
  });

  it('removes search parameters when asked keeping ForcedStickyParams', () => {
    const homeUrl = generateNavUrl(
      { page: 'home', ignoreOldQueryString: true },
      `?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC&${ForcedStickyParams[0]}=test-sticky`,
    );
    expect(homeUrl).toEqual(`/resources?${ForcedStickyParams[0]}=test-sticky`);
  });

  it('Correctly navigates to a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/columns?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('Correctly navigates to a model without page param', () => {
    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/columns?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model profiles screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'profiles', modelId: 'model-0' },
      '?includeType=discrete&includeType=non-discrete&sortModelBy=LatestAlert&sortModelDirection=DESC&profile=1669766400000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/profiles?includeType=discrete&includeType=non-discrete&sortModelBy=LatestAlert&sortModelDirection=DESC&profile=1669766400000',
    );
  });

  it('Correctly navigates to the constraints screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'constraints', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/constraints?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('Correctly navigates to the models summary dashboards', () => {
    const homeUrl = generateNavUrl({ page: 'modelsSummary' }, '?startDate=2020-10-08&endDate=2022-11-20');
    expect(homeUrl).toEqual('/summary/models?startDate=2020-10-08&endDate=2022-11-20');
  });

  it('Correctly navigates to the datasets summary dashboards', () => {
    const homeUrl = generateNavUrl({ page: 'datasetsSummary' }, '?startDate=2020-10-08&endDate=2022-11-20');
    expect(homeUrl).toEqual('/summary/datasets?startDate=2020-10-08&endDate=2022-11-20');
  });

  it('Correctly navigates to the custom dashboards', () => {
    const homeUrl = generateNavUrl({ page: 'customDashboards' }, '?startDate=2020-10-08&endDate=2022-11-20');
    expect(homeUrl).toEqual('/summary/dashboards?startDate=2020-10-08&endDate=2022-11-20');
  });

  it('Correctly navigates to the dashboards root route', () => {
    const homeUrl = generateNavUrl({ page: 'executive' }, '?startDate=2020-10-08&endDate=2022-11-20');
    expect(homeUrl).toEqual('/summary?startDate=2020-10-08&endDate=2022-11-20');
  });

  it('Correctly navigates to the summary screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'summary', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/summary?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('Correctly navigates to the segment analysis screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'segment-analysis', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/segment-analysis?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('Correctly navigates to home with invalid parameters', () => {
    const homeUrl = generateNavUrl(
      { page: 'segment-analysis', modelId: undefined },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('Correctly navigates to the segments screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'segments', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/segments?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the performance screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'performance', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/performance?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the output screen for a model', () => {
    const homeUrl = generateNavUrl(
      { page: 'output', modelId: 'model-10' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/output?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the columns screen with a feature name', () => {
    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-0', featureName: 'acc_now_dealinq' },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/columns/acc_now_dealinq?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the columns screen with a feature name without page param', () => {
    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-0', featureName: 'acc_now_dealinq' },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/columns/acc_now_dealinq?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the output feature screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'output', modelId: 'model-0', featureName: 'pred_credit_risk (output)' },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/output/pred_credit_risk%20(output)?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the other model keeping same path', () => {
    const configInvestigatorUrl = generateNavUrl(
      { keepOldPath: true, modelId: 'model-0' },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
      {
        modelId: 'model-2130',
        pathname: '/resources/model-2130/monitor-manager/config-investigator',
      },
    );

    expect(configInvestigatorUrl).toEqual(
      '/resources/model-0/monitor-manager/config-investigator?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the other model keeping same path without searchQuery', () => {
    const configInvestigatorUrl = generateNavUrl(
      { keepOldPath: true, modelId: 'model-0', ignoreOldQueryString: true },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
      {
        modelId: 'model-2130',
        pathname: '/resources/model-2130/monitor-manager/config-investigator',
      },
    );

    expect(configInvestigatorUrl).toEqual('/resources/model-0/monitor-manager/config-investigator');
  });

  it('correctly navigates to the other model keeping same path without searchQuery, but with ForcedStickyParams', () => {
    const configInvestigatorUrl = generateNavUrl(
      { keepOldPath: true, modelId: 'model-0', ignoreOldQueryString: true },
      `?sortModelBy=LatestAlert&sortModelDirection=DESC&${ForcedStickyParams[0]}=test-sticky`,
      {
        modelId: 'model-2130',
        pathname: '/resources/model-2130/monitor-manager/config-investigator',
      },
    );

    expect(configInvestigatorUrl).toEqual(
      `/resources/model-0/monitor-manager/config-investigator?${ForcedStickyParams[0]}=test-sticky`,
    );
  });

  it('correctly navigates to home with invalid oldPathData', () => {
    const configInvestigatorUrl = generateNavUrl(
      { keepOldPath: true, modelId: 'model-0', ignoreOldQueryString: true },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
      {
        pathname: '/resources/model-2130/monitor-manager/config-investigator',
      },
    );

    expect(configInvestigatorUrl).toEqual('/resources/model-0');
  });

  it('correctly navigates to the llm dashboard screen when path is not specified', () => {
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0' },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/dashboards?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm security dashboard screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', dashboards: { path: 'security' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/dashboards/security?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm performance dashboard screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', dashboards: { path: 'performance' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/dashboards/performance?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm segment-analysis dashboard screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', dashboards: { path: 'segment-analysis' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/dashboards/segment-analysis?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });
});

describe('Segments children pages navigations tests suite', () => {
  it('correctly navigates to the segments home screen and ignore segments tags', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };

    const homeUrl = generateNavUrl(
      { page: 'segments', modelId: 'model-10', segmentTags },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/segments?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the llm segmented dashboards screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', segmentTags },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/dashboards?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm segmented security dashboard screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', segmentTags, dashboards: { path: 'security' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/dashboards/security?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm segmented performance dashboard screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', segmentTags, dashboards: { path: 'performance' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/dashboards/performance?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the llm segmented segment-analysis dashboard screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'dashboards', modelId: 'model-0', segmentTags, dashboards: { path: 'segment-analysis' } },
      '?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/dashboards/segment-analysis?primaryBatch=1686351600000&comparedWith=model-103&secondaryBatch=1686189600000',
    );
  });

  it('correctly navigates to the segments output feature screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'output', modelId: 'model-0', featureName: 'pred_credit_risk (output)', segmentTags },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/output/pred_credit_risk%20(output)?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the segment screen with segments tags', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };

    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-10', segmentTags },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/segments/key=purpose&value=car/columns?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the segment screen with segments tags without page param', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };

    const homeUrl = generateNavUrl(
      { page: 'columns', modelId: 'model-10', segmentTags },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-10/segments/key=purpose&value=car/columns?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to segments outputs', () => {
    const segmentTags = {
      tags: [
        { key: 'purpose', value: 'car' },
        { key: 'verification_status', value: 'Not Verified' },
      ],
    };

    const homeUrl = generateNavUrl(
      { page: 'output', modelId: 'model-0', segmentTags },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car&key=verification_status&value=Not%20Verified/output?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to profiles screen of a segment', () => {
    const segmentTags = {
      tags: [
        { key: 'purpose', value: 'car' },
        { key: 'verification_status', value: 'Not Verified' },
      ],
    };

    const homeUrl = generateNavUrl(
      { page: 'profiles', modelId: 'model-0', segmentTags },
      '?includeType=discrete&includeType=non-discrete&profile=1669766400000&profile=ref-4kMks31lk19VJ5g2&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car&key=verification_status&value=Not%20Verified/profiles?includeType=discrete&includeType=non-discrete&profile=1669766400000&profile=ref-4kMks31lk19VJ5g2&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to performance screen of a segment', () => {
    const segmentTags = {
      tags: [
        { key: 'purpose', value: 'car' },
        { key: 'verification_status', value: 'Not Verified' },
      ],
    };

    const homeUrl = generateNavUrl(
      { page: 'performance', modelId: 'model-0', segmentTags },
      '?includeType=discrete&includeType=non-discrete&profile=1669766400000&profile=ref-4kMks31lk19VJ5g2&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car&key=verification_status&value=Not%20Verified/performance?includeType=discrete&includeType=non-discrete&profile=1669766400000&profile=ref-4kMks31lk19VJ5g2&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the segments constraints screen', () => {
    const segmentTags = {
      tags: [{ key: 'purpose', value: 'car' }],
    };
    const homeUrl = generateNavUrl(
      { page: 'constraints', modelId: 'model-0', segmentTags },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/segments/key=purpose&value=car/constraints?sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });
});

describe('Monitor Manager navigations tests suite', () => {
  it('correctly navigates to the model monitors-manager screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to monitors-manager screen with wrong parameters', () => {
    const segmentTags = {
      tags: [
        { key: 'purpose', value: 'car' },
        { key: 'verification_status', value: 'Not Verified' },
      ],
    };

    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', segmentTags },
      '?sortModelBy=LatestAlert&sortModelDirection=DESC&compare=model-20221014-001',
    );
    expect(homeUrl).toEqual('/resources/model-0/monitor-manager?sortModelBy=LatestAlert&sortModelDirection=DESC');
  });

  it('correctly navigates to the model monitors-manager audit-log screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'audit-log' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/audit-log?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors-manager presets screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'presets' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/presets?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors-manager anomalies-feed screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'anomalies-feed' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/anomalies-feed?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors-manager anomalies-feed screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'anomalies-feed' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/anomalies-feed?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors-runs screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'monitor-runs' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/monitor-runs?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors config investigator screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'config-investigator' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/config-investigator?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model specific monitor config investigator screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'config-investigator', id: '123' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/config-investigator/123?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model monitors customize screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'customize-ui' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/customize-ui?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to the model specific monitor customize screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'monitorManager', modelId: 'model-0', monitorManager: { path: 'customize-ui', id: '123' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/resources/model-0/monitor-manager/customize-ui/123?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });
});

describe('Settings navigations tests suite', () => {
  it('correctly navigates to global settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings' },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to notifications settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'notifications' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/notifications?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to notifications settings screen with missing id parameter', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'notifications', actionType: 'email' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/notifications?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to action details settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'notifications', actionType: 'email', id: 'action-test-id' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/notifications/email/action-test-id?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to access-tokens settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'access-tokens' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/access-tokens?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to integrations settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'integrations' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/integrations?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to model-management settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'model-management' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/model-management?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly navigates to user-management settings screen', () => {
    const homeUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'user-management' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(homeUrl).toEqual(
      '/settings/user-management?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly destroys all universally removed query string items', () => {
    const settingsUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'user-management' } },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(settingsUrl).toEqual(
      '/settings/user-management?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
  });

  it('correctly destroys all universally removed query string items when the request is to ignore old strings', () => {
    const settingsUrl = generateNavUrl(
      { page: 'settings', settings: { path: 'user-management' }, ignoreOldQueryString: true },
      '?startDate=2020-10-08&endDate=2022-11-20&sortModelBy=LatestAlert&sortModelDirection=DESC',
    );
    expect(settingsUrl).toEqual('/settings/user-management');
  });
});
