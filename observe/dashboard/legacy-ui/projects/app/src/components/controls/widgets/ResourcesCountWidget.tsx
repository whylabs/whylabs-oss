import { ApolloError } from '@apollo/client';
import { createStyles, Skeleton } from '@mantine/core';
import { Colors, HtmlTooltip, Spacings } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { isNumber } from 'utils/typeGuards';

const useStyles = createStyles({
  localRoot: {
    border: 'none',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: Colors.white,
    minHeight: Spacings.tabContentHeaderHeight,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
  },
  displayNumberContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  projectCount: {
    textAlign: 'left',
  },
  innerContainer: {
    display: 'flex',
    gap: '13px',
    flexDirection: 'row',
    height: '100%',
    padding: '10px 20px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    height: '100%',
    justifyContent: 'flex-end',
    marginLeft: 5,
  },
  widgetTitle: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    color: Colors.brandSecondary900,
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  },
  widgetHighlightNumber: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '36px',
    lineHeight: '38px',
    minWidth: 'fit-content',
    color: Colors.brandPrimary900,
  },
});

const MODEL_COUNT_TOOLTIP = 'Total number of models';
const DATASET_COUNT_TOOLTIP = 'Total number of datasets';
const RESOURCES_COUNT_TOOLTIP = 'Total number of resources';

interface ResourcesCountWidgetProps {
  addResource: () => void;
  loading: boolean;
  error: ApolloError | undefined;
  modelsCount: number | undefined;
  datasetsCount: number | undefined;
  userCanManageDatasets: boolean;
  singleCount?: boolean;
}

const ResourcesCountWidget: React.FC<ResourcesCountWidgetProps> = ({
  addResource,
  loading,
  modelsCount,
  datasetsCount,
  error,
  userCanManageDatasets,
  singleCount,
}) => {
  const { classes: localStyles, cx } = useStyles();

  if (error) {
    console.error(`ModelCountWidget component error: ${error}`);
  }

  if (singleCount) {
    return (
      <div className={localStyles.localRoot}>
        <div className={localStyles.innerContainer}>
          <div className={localStyles.leftColumn}>
            <WhyLabsText className={localStyles.widgetTitle}>
              Resources
              <HtmlTooltip tooltipContent={RESOURCES_COUNT_TOOLTIP} />
            </WhyLabsText>
            <div className={localStyles.displayNumberContainer}>
              {loading ? (
                <Skeleton variant="text" width={50} height={38} />
              ) : (
                <div className={cx(localStyles.projectCount)}>
                  <WhyLabsText className={localStyles.widgetHighlightNumber}>
                    {renderResourceCount(
                      isNumber(datasetsCount) || isNumber(modelsCount)
                        ? (datasetsCount ?? 0) + (modelsCount ?? 0)
                        : undefined,
                    )}
                  </WhyLabsText>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={localStyles.localRoot}>
      <div className={localStyles.innerContainer}>
        <div className={localStyles.leftColumn}>
          <WhyLabsText className={localStyles.widgetTitle}>
            Datasets
            <HtmlTooltip tooltipContent={DATASET_COUNT_TOOLTIP} />
          </WhyLabsText>
          <div className={localStyles.displayNumberContainer}>
            {loading ? (
              <Skeleton variant="text" width={50} height={38} />
            ) : (
              <div className={cx(localStyles.projectCount)}>
                <WhyLabsText className={localStyles.widgetHighlightNumber}>
                  {renderResourceCount(datasetsCount)}
                </WhyLabsText>
              </div>
            )}
          </div>
        </div>
        <div className={localStyles.leftColumn}>
          <WhyLabsText className={localStyles.widgetTitle}>
            Models
            <HtmlTooltip tooltipContent={MODEL_COUNT_TOOLTIP} />
          </WhyLabsText>
          <div className={localStyles.displayNumberContainer}>
            {loading ? (
              <Skeleton variant="text" width={50} height={38} />
            ) : (
              <div className={cx(localStyles.projectCount)}>
                <WhyLabsText className={localStyles.widgetHighlightNumber}>
                  {renderResourceCount(modelsCount)}
                </WhyLabsText>
              </div>
            )}
          </div>
        </div>
        {loading ? (
          <div>
            <Skeleton variant="text" width={120} height={20} mt={4} />
            <Skeleton variant="text" width={120} height={36} mt={10} />
          </div>
        ) : (
          renderButtons()
        )}
      </div>
    </div>
  );

  function renderResourceCount(count?: number) {
    if (!error) {
      return count ?? 0;
    }
    return '-';
  }

  function renderButtons() {
    if (!userCanManageDatasets || loading || error) {
      return null;
    }

    return (
      <div className={localStyles.rightColumn}>
        <WhyLabsButton variant="outline" width="full" size="xs" color="gray" onClick={addResource}>
          Set up resource
        </WhyLabsButton>
      </div>
    );
  }
};

export default ResourcesCountWidget;
