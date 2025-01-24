import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { MonitorInputFeaturesFragment } from 'generated/graphql';

export interface MultiSelectItem {
  id: string;
  label: string;
  weight?: number | null;
}

interface SelectCardDataProps {
  setSelectedFeatures: React.Dispatch<React.SetStateAction<FeatureItem[]>>;
}

export interface FeatureItem extends MultiSelectItem {
  isDiscrete: boolean;
}

interface SelectCardDataReturn {
  inputs: FeatureItem[];
  outputs: FeatureItem[];
  discreteCount: number;
  nonDiscreteCount: number;
  includedFeatures: string[];
}

export default function useSelectCardData({ setSelectedFeatures }: SelectCardDataProps): SelectCardDataReturn {
  const [{ driftOption, includedFeatures, discreteType, featuresQueryData: data }] = useRecoilState(customMonitorAtom);
  const firstLoad = useRef<boolean>(true);

  const mapFeatures = (features?: MonitorInputFeaturesFragment[]): FeatureItem[] =>
    features?.map((feature) => {
      const isDiscrete = !!feature.schema?.isDiscrete;
      return { id: feature.id, label: feature.name, isDiscrete, weight: feature.weight?.value };
    }) || [];

  const inputs = useMemo(() => {
    const unfilteredData = mapFeatures(data?.model?.features);

    if (discreteType === 'both') {
      return unfilteredData;
    }
    return unfilteredData.filter((item) => (discreteType === 'discrete' ? item.isDiscrete : !item.isDiscrete));
  }, [data?.model?.features, discreteType]);

  const outputs = useMemo(() => {
    const unfilteredData = mapFeatures(data?.model?.outputs);
    if (discreteType === 'both') {
      return unfilteredData;
    }
    return unfilteredData.filter((item) => (discreteType === 'discrete' ? item.isDiscrete : !item.isDiscrete));
  }, [data?.model?.outputs, discreteType]);

  const filterFeatures = useCallback(
    (features: MonitorInputFeaturesFragment[]) => {
      return mapFeatures(features.filter((feature) => includedFeatures.includes(feature.name)));
    },
    [includedFeatures],
  );

  useEffect(() => {
    if (data?.model && firstLoad.current) {
      const filterSelectedFeatures = {
        input: () => filterFeatures(data.model?.features ?? []),
        output: () => filterFeatures(data.model?.outputs ?? []),
        both: () => filterFeatures([...(data.model?.features ?? []), ...(data.model?.outputs ?? [])]),
      };
      setSelectedFeatures(filterSelectedFeatures[driftOption]());
      firstLoad.current = false;
    }
  }, [data?.model, driftOption, filterFeatures, setSelectedFeatures]);

  const getCounts = () => {
    const filterDiscrete = (key: 'features' | 'outputs') => {
      const [discrete, nonDiscrete]: Array<MonitorInputFeaturesFragment[]> = [[], []];
      if (data?.model && data.model[key]) {
        data.model[key].forEach((feature) => {
          if (feature.schema?.isDiscrete) {
            discrete.push(feature);
          } else {
            nonDiscrete.push(feature);
          }
        });
      }
      return [discrete.length, nonDiscrete.length];
    };
    switch (driftOption) {
      case 'input':
        return filterDiscrete('features');
      case 'output':
        return filterDiscrete('outputs');
      default: {
        const [inputDiscrete, inputNonDiscrete] = filterDiscrete('features');
        const [outputDiscrete, outputNonDiscrete] = filterDiscrete('outputs');
        return [inputDiscrete + outputDiscrete, inputNonDiscrete + outputNonDiscrete];
      }
    }
  };

  const [discreteCount, nonDiscreteCount] = getCounts();
  return {
    inputs,
    outputs,
    discreteCount,
    nonDiscreteCount,
    includedFeatures,
  };
}
