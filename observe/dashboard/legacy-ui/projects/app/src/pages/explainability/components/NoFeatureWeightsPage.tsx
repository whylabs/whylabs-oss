import { WhyLabsNoDataPage } from 'components/empty-states/WhyLabsNoDataPage';

export const NoFeatureWeightsPage: React.FC = () => {
  const code = `from whylogs.core.feature_weights import FeatureWeights

# If you already have some feature weights in a dictionary of feature name to weights
weights = {"Feature_1": 12.4, "Feature_2": 93.3}

# You can upload these to Whylabs like this:
feature_weights = FeatureWeights(weights)
feature_weights.writer("whylabs").write()
`;

  return (
    <WhyLabsNoDataPage
      code={code}
      maxContentWidth={850}
      title="No feature weights to show"
      subtitle={"To enable feature weights for your model's inputs, simply upload these to WhyLabs"}
      codeLabel="Code example"
    />
  );
};
