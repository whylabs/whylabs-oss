import HCPlaceholder from 'hcplaceholder';
import HCPlaceholderMore from 'hcplaceholder/hcplaceholder-more';
import HCPlaceholderReact from 'hcplaceholder-react-official';
import { createStyles } from '@mantine/core';
import { WhyLabsLoadingOverlay } from '../design-system';

HCPlaceholderMore(HCPlaceholder);

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

export type HCPlaceholderWrapperProps = {
  isLoading?: boolean;
  options: HCPlaceholder.Options;
};

export const HCPlaceholderWrapper = ({ isLoading, options }: HCPlaceholderWrapperProps): JSX.Element => {
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
