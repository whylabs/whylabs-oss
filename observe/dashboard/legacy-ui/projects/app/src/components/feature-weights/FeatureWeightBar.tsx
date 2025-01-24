import { FeatureWeightsFragment } from 'generated/graphql';
import { SchemeOptionShape } from 'components/feature-weights/FeatureWeightsTypes';

interface FeatureWeightBarProps {
  feature: FeatureWeightsFragment;
  xScale: (feature: FeatureWeightsFragment) => number;
  colorScheme: SchemeOptionShape;
  hovered?: boolean;
  height?: number;
}

export const FeatureWeightBar: React.FC<FeatureWeightBarProps> = ({
  feature,
  xScale,
  colorScheme,
  hovered,
  height,
}) => {
  const selectedColorScheme =
    feature.weight?.value && feature.weight.value >= 0 ? colorScheme.positive : colorScheme.negative;

  return (
    <div
      style={{
        padding: '1px 0',
        width: '100%',
        height: height ? height + 2 : 29,
        backgroundColor: hovered ? selectedColorScheme.backdropColor : 'unset',
      }}
    >
      <div
        style={{
          width: `${xScale(feature) * 100}%`,
          height: height ?? 27,
          backgroundColor: hovered ? selectedColorScheme.hoverBgColor : selectedColorScheme.bgColor,
          transition: `opacity 150ms`,
        }}
      />
    </div>
  );
};
