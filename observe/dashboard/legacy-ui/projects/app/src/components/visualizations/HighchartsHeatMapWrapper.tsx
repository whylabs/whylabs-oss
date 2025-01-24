import HCPlaceholder from 'hcplaceholder';
import HCPlaceholderReact from 'hcplaceholder-react-official';
import HCPlaceholderHeat from 'hcplaceholder/modules/heatmap';
import HCPlaceholderAccessibility from 'hcplaceholder/modules/accessibility';
import HCPlaceholderMore from 'hcplaceholder/hcplaceholder-more';
import { createStyles } from '@mantine/core';
import { WhyLabsLoadingOverlay } from '../design-system';

HCPlaceholderMore(HCPlaceholder);
HCPlaceholderHeat(HCPlaceholder);
HCPlaceholderAccessibility(HCPlaceholder);

export const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
  },
  chart: {
    fontFamily: 'Asap',

    '& .echLegendList': {
      display: 'flex',
      justifyContent: 'center',
    },

    '& .echLegendItem__label': {
      fontSize: 12,
    },
  },
}));

export type HCPlaceholderHeatmapWrapperProps = {
  isLoading?: boolean;
  options: HCPlaceholder.Options;
};

export const HCPlaceholderHeatMapWrapper = ({ isLoading, options }: HCPlaceholderHeatmapWrapperProps): JSX.Element => {
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      <WhyLabsLoadingOverlay visible={!!isLoading} />
      <HCPlaceholderReact
        hcplaceholder={HCPlaceholder}
        options={{ ...options, credits: { enabled: false } }}
        updateArgs={[true, true, false]}
      />
    </div>
  );
};
