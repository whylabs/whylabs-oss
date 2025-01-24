import { renderHook } from '@testing-library/react-hooks';
import { PageTexts, TextRecord } from 'strings/types';
import { AssetCategory, ModelType, TimePeriod } from 'generated/graphql';
import { RecoilRoot } from 'recoil';
import { FC } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { mockUseResourceContext } from './mocks/mockUseResourceContext';
import { useResourceText } from './useResourceText';

const TEST_TEXTS: PageTexts<TextRecord> = {
  DATA: {
    bar: 'DATA bar',
    foo: 'DATA foo',
  },
  MODEL: {
    bar: 'MODEL bar',
    foo: 'MODEL foo',
  },
  LLM: {
    bar: 'LLM bar',
    foo: 'LLM foo',
  },
};

const DATASET_EXAMPLE = {
  category: AssetCategory.Data,
  name: 'Dataset A',
  type: ModelType.DataOther,
  batchFrequency: TimePeriod.P1D,
};
const DATA_TRANSFORM_EXAMPLE = {
  category: AssetCategory.Data,
  name: 'Data transform',
  type: ModelType.DataTransform,
  batchFrequency: TimePeriod.P1D,
};
const MODEL_EXAMPLE = {
  category: AssetCategory.Model,
  name: 'Model A',
  type: ModelType.ModelOther,
  batchFrequency: TimePeriod.P1D,
};

describe('useResourceText', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return isModelCategory=true when resource is not fetched', () => {
    mockUseResourceContext({ resource: undefined });

    const { result } = getHookRenderer();
    expect(result.current.isModelCategory).toBe(true);
    expect(result.current.isDataTransform).toBe(false);
    expect(result.current.isDataCategory).toBe(false);
  });

  it('should return isModelCategory=true', () => {
    mockUseResourceContext({ resource: MODEL_EXAMPLE });

    const { result } = getHookRenderer();
    expect(result.current.isModelCategory).toBe(true);
    expect(result.current.isDataTransform).toBe(false);
    expect(result.current.isDataCategory).toBe(false);
  });

  it('should return isDataCategory=true', () => {
    mockUseResourceContext({ resource: DATASET_EXAMPLE });

    const { result } = getHookRenderer();
    expect(result.current.isModelCategory).toBe(false);
    expect(result.current.isDataTransform).toBe(false);
    expect(result.current.isDataCategory).toBe(true);
  });

  it('should return isDataTransform=true', () => {
    mockUseResourceContext({ resource: DATA_TRANSFORM_EXAMPLE });

    const { result } = getHookRenderer();
    expect(result.current.isModelCategory).toBe(false);
    expect(result.current.isDataTransform).toBe(true);
    expect(result.current.isDataCategory).toBe(true);
  });

  it('should return data texts', () => {
    mockUseResourceContext({ resource: DATASET_EXAMPLE });

    const { result } = getHookRenderer();
    expect(result.current.resourceTexts).toStrictEqual(TEST_TEXTS.DATA);
  });

  it('should return model texts', () => {
    mockUseResourceContext({ resource: MODEL_EXAMPLE });

    const { result } = getHookRenderer();
    expect(result.current.resourceTexts).toStrictEqual(TEST_TEXTS.MODEL);
  });

  it('should return loading=false', () => {
    mockUseResourceContext({ loading: false });

    const { result } = getHookRenderer();
    expect(result.current.loading).toBe(false);
  });

  it('should return loading=true', () => {
    mockUseResourceContext({ loading: true });

    const { result } = getHookRenderer();
    expect(result.current.loading).toBe(true);
  });
});

// Helpers
function getHookRenderer() {
  const wrapper: FC = ({ children }) => (
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>{children}</MemoryRouter>
      </RecoilRoot>
    </MockedProvider>
  );
  return renderHook(() => useResourceText(TEST_TEXTS), { wrapper });
}
