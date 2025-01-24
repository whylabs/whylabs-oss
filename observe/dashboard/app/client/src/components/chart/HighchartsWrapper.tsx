import { createStyles } from '@mantine/core';
import HCPlaceholder from 'hcplaceholder';
import HCPlaceholderReact from 'hcplaceholder-react-official';
import hcplaceholderMore from 'hcplaceholder/hcplaceholder-more';
import hcplaceholderAccessibility from 'hcplaceholder/modules/accessibility';
import hcplaceholderNoDataToDisplay from 'hcplaceholder/modules/no-data-to-display';
import hcplaceholderPatterns from 'hcplaceholder/modules/pattern-fill';

import { WhyLabsLoadingOverlay } from '../design-system';

// Enable HCPlaceholder company libraries
hcplaceholderAccessibility(HCPlaceholder);
hcplaceholderNoDataToDisplay(HCPlaceholder);
hcplaceholderPatterns(HCPlaceholder);
hcplaceholderMore(HCPlaceholder);

const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  chartContainer: {
    opacity: 1,
    transition: 'opacity 0.3s',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartContainerHidden: {
    opacity: 0,
  },
}));

export type HCPlaceholderWrapperProps = {
  /**
   * The description of the chart to improve accessibility.
   */
  description: string;
  id?: string;
  isLoading?: boolean;
  options: HCPlaceholder.Options;
};

export const HCPlaceholderWrapper = ({ description, id, isLoading, options }: HCPlaceholderWrapperProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const { height } = options?.chart ?? {};
  return (
    <div className={classes.root} style={{ minHeight: height ?? undefined }} id={id ? `${id}-root` : undefined}>
      <WhyLabsLoadingOverlay visible={!!isLoading} />
      <div
        className={cx(classes.chartContainer, {
          [classes.chartContainerHidden]: isLoading,
        })}
      >
        <HCPlaceholderReact
          hcplaceholder={HCPlaceholder}
          options={{
            ...options,
            accessibility: {
              description,
            },
            // Hide HCPlaceholder logo
            credits: { enabled: false },
            // This will inject the custom id into HCPlaceholder chart.userOptions property
            id,
          }}
          updateArgs={[true, true, false]}
        />
      </div>
    </div>
  );
};
