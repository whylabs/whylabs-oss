import { renderHook, RenderResult } from '@testing-library/react-hooks';
import { setUseUserContextSpy } from 'hooks/mocks/mockUseUserContext';
import { FC } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { MockedProvider } from '@apollo/client/testing';
import { AssetCategory, ModelType, TimePeriod } from 'generated/graphql';
import { mockUseResourceContext } from './mocks/mockUseResourceContext';
import { useModelPageTabs, useModelPageTabsProps, useModelPageTabsReturnType } from './useModelPageTabs';

const DATASET_EXAMPLE = {
  id: 'dataset-test',
  category: AssetCategory.Data,
  name: 'Dataset A',
  type: ModelType.DataOther,
  batchFrequency: TimePeriod.P1D,
};
const DATA_TRANSFORM_EXAMPLE = {
  id: 'dataset-transform-test',
  category: AssetCategory.Data,
  name: 'Data transform',
  type: ModelType.DataTransform,
  batchFrequency: TimePeriod.P1D,
};
const MODEL_EXAMPLE = {
  id: 'model-test',
  category: AssetCategory.Model,
  name: 'Model A',
  type: ModelType.ModelOther,
  batchFrequency: TimePeriod.P1D,
};

const LLM_EXAMPLE = {
  id: 'llm-test',
  category: AssetCategory.Llm,
  name: 'LLM test',
  type: ModelType.Llm,
  batchFrequency: TimePeriod.P1D,
};

describe('useModelPageTabs', () => {
  beforeEach(() => {
    setUseUserContextSpy();
    mockUseResourceContext({ resource: undefined });
  });

  describe('doesnt have segmentTags prop', () => {
    it('should display 7 tabs for a model', () => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current).toHaveLength(7);
    });

    it.each(['summary', 'monitorManager', 'dataProfile', 'inputs', 'outputs', 'segments', 'resourceDashboards'])(
      'should display %p tab for a model',
      (tabValue) => {
        mockUseResourceContext({ resource: MODEL_EXAMPLE });

        const { result } = getHookRenderer();
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it.each(['llmSecure'])('should hide %p tab for a non-llm model', (tabValue) => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
    });

    it('should display 6 tabs for a LLM model', () => {
      mockUseResourceContext({ resource: LLM_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current).toHaveLength(6);
    });

    it.each(['summary', 'monitorManager', 'dataProfile', 'inputs', 'llmDashboards', 'segments'])(
      'should display %p tab for a LLM model',
      (tabValue) => {
        mockUseResourceContext({ resource: LLM_EXAMPLE });

        const { result } = getHookRenderer();
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it.each(['outputs', 'resourceDashboards'])('should hide %p tab for a LLM model', (tabValue) => {
      mockUseResourceContext({ resource: LLM_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
    });

    it('should display 6 tabs for a dataset', () => {
      mockUseResourceContext({ resource: DATASET_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current).toHaveLength(6);
    });

    it.each(['summary', 'monitorManager', 'dataProfile', 'inputs', 'segments', 'resourceDashboards'])(
      'should display %p tab for a dataset',
      (tabValue) => {
        mockUseResourceContext({ resource: DATASET_EXAMPLE });

        const { result } = getHookRenderer();
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it('should display 7 tabs for a Data transform', () => {
      mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current).toHaveLength(7);
    });

    it.each(['summary', 'monitorManager', 'dataProfile', 'inputs', 'outputs', 'segments', 'resourceDashboards'])(
      'should display %p tab for a Data transform',
      (tabValue) => {
        mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

        const { result } = getHookRenderer();
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it.each(['outputs', 'segmentDataProfile', 'llmSecure'])('should hide %p tab for a dataset', (tabValue) => {
      mockUseResourceContext({ resource: DATASET_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
    });

    it.each(['segmentDataProfile', 'llmSecure'])('should hide %p tab for Data transform', (tabValue) => {
      mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
    });

    it('should display Inputs tab for Model', () => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === 'inputs')?.name).toEqual('Inputs');
    });

    it('should display Columns tab for Datasets', () => {
      mockUseResourceContext({ resource: DATASET_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === 'inputs')?.name).toEqual('Columns');
    });

    it('should display Inputs tab for Data transform', () => {
      mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

      const { result } = getHookRenderer();
      expect(result.current.find(({ value }) => value === 'inputs')?.name).toEqual('Inputs');
    });

    it('should hide all tabs while loading resource', () => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE, loading: true });

      const { result } = getHookRenderer();
      expect(result.current).toHaveLength(0);
    });
  });

  describe('has segmentTags prop', () => {
    it('should display 6 tabs for a segment model', () => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      expect(result.current).toHaveLength(6);
    });

    it.each(['summary', 'monitorManager', 'segmentDataProfile', 'inputs', 'outputs', 'resourceDashboards'])(
      'should display %p tab for a segment model',
      (tabValue) => {
        mockUseResourceContext({ resource: MODEL_EXAMPLE });

        const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it.each(['llmSecure'])('should hide %p tab for a segment non-llm model', (tabValue) => {
      mockUseResourceContext({ resource: MODEL_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
    });

    it('should display 5 tabs for a segment dataset', () => {
      mockUseResourceContext({ resource: DATASET_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      expect(result.current).toHaveLength(5);
    });

    it.each(['summary', 'monitorManager', 'segmentDataProfile', 'inputs', 'resourceDashboards'])(
      'should display %p tab for a segment dataset',
      (tabValue) => {
        mockUseResourceContext({ resource: DATASET_EXAMPLE });

        const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it('should display 6 tabs for a segment Data transform', () => {
      mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      expect(result.current).toHaveLength(6);
    });

    it.each(['summary', 'monitorManager', 'segmentDataProfile', 'inputs', 'outputs', 'resourceDashboards'])(
      'should display %p tab for a segment Data transform',
      (tabValue) => {
        mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

        const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
        expect(result.current.find(({ value }) => value === tabValue)).toBeTruthy();
      },
    );

    it.each(['outputs', 'segments', 'llmSecure'])('should hide %p tab for a segment dataset', (tabValue) => {
      mockUseResourceContext({ resource: DATASET_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      if (tabValue === 'resourceDashboards') {
        expect(hasValueWithSeparateId(result, 'segment-analysis-tab', tabValue)).toBeTruthy();
      } else {
        expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
      }
    });

    it.each(['segments', 'llmSecure'])('should hide %p tab for segment Data transform', (tabValue) => {
      mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

      const { result } = getHookRenderer({ segmentTags: { tags: [{ key: 'key1', value: 'value1' }] } });
      if (tabValue === 'resourceDashboards') {
        expect(hasValueWithSeparateId(result, 'segment-analysis-tab', tabValue)).toBeTruthy();
      } else {
        expect(result.current.find(({ value }) => value === tabValue)).toBeUndefined();
      }
    });
  });
});

function hasValueWithSeparateId(
  renderResult: RenderResult<useModelPageTabsReturnType>,
  tabId: string,
  tabValue: string,
): boolean {
  const tab = renderResult.current.find(({ value }) => value === tabValue);
  return tab !== undefined && tab.id === tabId;
}

// Helpers
function getHookRenderer({ isEmptyMonitor = false, modelId = '123', ...rest }: Partial<useModelPageTabsProps> = {}) {
  const wrapper: FC = ({ children }) => (
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>{children}</MemoryRouter>
      </RecoilRoot>
    </MockedProvider>
  );

  return renderHook(() => useModelPageTabs({ isEmptyMonitor, modelId, ...rest }), { wrapper });
}
