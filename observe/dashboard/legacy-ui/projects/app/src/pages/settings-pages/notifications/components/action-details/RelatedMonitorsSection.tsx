import { WhyLabsTableKit, WhyLabsText, WhyLabsTypography } from 'components/design-system';
import { Skeleton } from '@mantine/core';
import { ActionDetailsFragment, ModelType, useGetModelsInfoQuery } from 'generated/graphql';
import { SafeLink } from '@whylabs/observatory-lib';
import { useMemo } from 'react';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { getLabelForModelType } from 'utils/modelTypeUtils';
import { useNewNotificationPageStyles } from '../../NewNotificationsPageContentAreaStyles';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell, LinkCell },
} = WhyLabsTableKit;
interface RelatedMonitors {
  resourceId: string;
  resourceName: string;
  type: ModelType;
  monitors: { id: string; displayName?: string | null }[];
}

interface RelatedMonitorsSectionProps {
  data?: ActionDetailsFragment | null;
  loading?: boolean;
}

export const RelatedMonitorsSection: React.FC<RelatedMonitorsSectionProps> = ({ data, loading }) => {
  const { classes, cx } = useNewNotificationPageStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { data: allModelsData, loading: allModelsLoading } = useGetModelsInfoQuery();
  const relatedLoading = loading || allModelsLoading;
  const relatedMonitors = useMemo(() => {
    if (!allModelsData?.models) return [];
    const aggregation = new Map<string, RelatedMonitors>([]);
    data?.references?.forEach((item) => {
      const { modelType, name } = allModelsData.models.find(({ id }) => id === item?.datasetId) ?? {};
      if (!item?.itemId || !item.datasetId || item.type !== 'MONITOR') return;
      const { itemId, datasetId, itemDisplayName } = item;
      const current = aggregation.get(datasetId);
      const relations: RelatedMonitors = {
        resourceId: datasetId,
        resourceName: name ?? datasetId,
        type: modelType ?? ModelType.Unknown,
        monitors: [...(current?.monitors ?? []), { id: itemId, displayName: itemDisplayName }],
      };
      aggregation.set(datasetId, relations);
    });
    return [...aggregation.values()];
  }, [allModelsData, data?.references]);

  if (relatedLoading) {
    return (
      <div style={{ marginTop: 20 }}>
        <Skeleton width="15%" height={25} />
        <div style={{ marginTop: 5 }}>
          <Skeleton width="100%" height={40} mt={15} />
          <Skeleton width="100%" height={150} mt={5} />
        </div>
      </div>
    );
  }

  const emptyState = () => {
    return (
      <div>
        <WhyLabsTypography order={4} className={classes.bold}>
          No related monitors
        </WhyLabsTypography>
        <WhyLabsText mt={8} size={14}>
          Monitors that use this action will be listed here.
        </WhyLabsText>
      </div>
    );
  };

  const renderTable = () => {
    return (
      <WhyLabsTable.Container rowsCount={relatedMonitors.length} headerHeight={42}>
        <WhyLabsTable.Column
          uniqueKey="monitors-list"
          verticalAlign="top"
          header={<HeaderCell>Monitors triggering this action</HeaderCell>}
          minWidth={200}
          maxWidth="30%"
          cell={(index) => {
            const { resourceId, monitors } = relatedMonitors[index];
            return (
              <GenericCell>
                <div className={classes.monitorsCell}>
                  {monitors?.map(({ id, displayName }) => {
                    const link = getNavUrl({
                      page: 'monitorManager',
                      modelId: resourceId,
                      monitorManager: { path: 'config-investigator', id },
                    });
                    return (
                      <span key={id}>
                        <SafeLink href={link}>{displayName || id}</SafeLink>
                        {', '}
                      </span>
                    );
                  })}
                </div>
              </GenericCell>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="resource-name"
          verticalAlign="top"
          header={<HeaderCell>Resource</HeaderCell>}
          minWidth={200}
          maxWidth="25%"
          cell={(index) => {
            const { resourceName, resourceId } = relatedMonitors[index];
            const link = getNavUrl({
              page: 'summary',
              modelId: resourceId,
            });
            return (
              <LinkCell to={link}>
                <div className={cx(classes.linkCell, classes.alignedTopCellPadding)}>{resourceName}</div>
              </LinkCell>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="resource-id"
          verticalAlign="top"
          header={<HeaderCell>ID</HeaderCell>}
          minWidth={200}
          maxWidth="20%"
          cell={(index) => {
            const { resourceId } = relatedMonitors[index];
            return (
              <TextCell>
                <div className={cx(classes.dataRow, classes.alignedTopCellPadding)}>{resourceId}</div>
              </TextCell>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="resource-type"
          verticalAlign="top"
          header={<HeaderCell>Type</HeaderCell>}
          minWidth={100}
          cell={(index) => {
            const { type } = relatedMonitors[index];
            return (
              <TextCell>
                <div className={cx(classes.dataRow, classes.alignedTopCellPadding)}>{getLabelForModelType(type)}</div>
              </TextCell>
            );
          }}
        />
      </WhyLabsTable.Container>
    );
  };
  return (
    <div className={classes.relatedMonitorsSection}>
      {data?.references?.length ? (
        <>
          <WhyLabsTypography order={4} className={classes.bold}>
            Related monitors ({data.references.length})
          </WhyLabsTypography>
          {renderTable()}
        </>
      ) : (
        emptyState()
      )}
    </div>
  );
};
