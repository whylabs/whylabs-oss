import { useCallback, useEffect } from 'react';
import { FeatureData } from 'components/controls/SkinnyTableRenderer';
import { ApolloError } from '@apollo/client';
import { Spacings } from '@whylabs/observatory-lib';
import FeatureSideTable from 'components/feature-side-table/FeatureSideTable';
import { FeatureMonitorCards } from 'components/panels/detail/FeatureMonitorCards';
import { GetAvailableFilteredFeaturesQuery } from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import SectionErrorFallback from 'pages/errors/boundaries/SectionErrorFallback';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ErrorBoundary } from 'react-error-boundary';
import { isDashbirdError } from 'utils/error-utils';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { createStyles } from '@mantine/core';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

const useStyles = createStyles({
  filterRoot: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '100%',
  },
  contentRoot: {
    height: '100%',
    flex: 1,
    display: 'flex',
  },
  nameCol: {
    height: '100%',
    width: Spacings.leftColumnWidth,
    maxWidth: Spacings.leftColumnWidth,
  },
  table: {
    height: '100%',
    flexGrow: 1,
    maxWidth: `calc(100% - ${Spacings.leftColumnWidth}px)`,
  },
  halfTable: {
    height: '100%',
    flexGrow: 1,
  },
  cardCompare: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
  },
  skinnyTable: {
    minHeight: 500,
    width: '300px',
  },
});

export interface FeatureDataTableProps {
  data: GetAvailableFilteredFeaturesQuery | undefined;
  loading: boolean;
  error: ApolloError | undefined;
  showComparison: boolean;
}

export function FeatureDataTable({ data, loading, error, showComparison }: FeatureDataTableProps): JSX.Element {
  const { classes: styles } = useStyles();
  const urlParams = usePageTypeWithParams();
  const { handleNavigation } = useNavLinkHandler();
  const { handleExceededLimit } = usePagingInfo();

  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const handleError = useCallback(
    (apolloError: ApolloError) => {
      apolloError.graphQLErrors.forEach((err) => {
        if (isDashbirdError(err)) handleExceededLimit(err);
        else
          enqueueSnackbar({
            title: 'Something went wrong.',
            variant: 'error',
          });
      });
    },
    [enqueueSnackbar, handleExceededLimit],
  );

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  const onFeatureClick = useCallback(
    (feature: string) => {
      handleNavigation({
        page: 'columns',
        modelId: urlParams.modelId,
        segmentTags: urlParams.segment,
        featureName: feature,
        saveParams: ['limit', 'offset', 'featureFilter'],
      });
    },
    [handleNavigation, urlParams.modelId, urlParams.segment],
  );

  const features: FeatureData[] =
    data?.model?.segment?.filteredFeatures?.results?.map((item) => {
      const alertsCount = item.anomalyCounts?.totals.reduce((acc, t) => acc + t.count, 0) ?? 0;

      return {
        name: item.name,
        alertsCount,
      };
    }) ?? [];

  const renderCards = () => {
    if (showComparison) {
      return (
        <div className={styles.cardCompare}>
          <div className={styles.halfTable}>
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <FeatureMonitorCards />
            </ErrorBoundary>
          </div>
          <div className={styles.halfTable}>
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <FeatureMonitorCards />
            </ErrorBoundary>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.table}>
        <ErrorBoundary FallbackComponent={SectionErrorFallback}>
          <FeatureMonitorCards />
        </ErrorBoundary>
      </div>
    );
  };

  return (
    <div className={styles.filterRoot}>
      <div className={styles.contentRoot}>
        {!showComparison && (
          <div id="pendo-feature-list" className={styles.nameCol}>
            <ErrorBoundary FallbackComponent={SectionErrorFallback}>
              <FeatureSideTable
                features={features}
                loading={loading}
                onFeatureClick={onFeatureClick}
                totalCount={data?.model?.segment?.filteredFeatures.totalCount ?? 0}
              />
            </ErrorBoundary>
          </div>
        )}
        {renderCards()}
      </div>
    </div>
  );
}
