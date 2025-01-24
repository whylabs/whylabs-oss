import { Skeleton } from '@mantine/core';
import { ModelType } from '@whylabs/songbird-node-client';
import { WhyLabsTableKit, WhyLabsText, WhyLabsTypography } from '~/components/design-system';
import { SafeLink } from '~/components/link/SafeLink';
import { getOldStackResourcePageUrl } from '~/utils/oldStackUtils';
import { getLabelForModelType } from '~/utils/resourceTypeUtils';
import { Fragment, ReactNode } from 'react';

import { useNewNotificationPageStyles } from '../../notificationStyles';
import { useNotificationsViewModel } from '../../useNotificationsViewModel';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, LinkCell },
} = WhyLabsTableKit;

export const RelatedMonitorsSection = () => {
  const viewModel = useNotificationsViewModel();
  const { actionDetails, isLoading, relatedMonitors, isResourcesLoading, orgId } = viewModel;

  const { classes } = useNewNotificationPageStyles();
  const relatedLoading = isLoading || isResourcesLoading;

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
        <WhyLabsTypography className={classes.bold} element="h4">
          No related monitors
        </WhyLabsTypography>
        <WhyLabsText mt={8} size={14}>
          Monitors that use this action will be listed here.
        </WhyLabsText>
      </div>
    );
  };

  const relatedMonitorRow = (
    monitors: {
      id: string;
      displayName?: string | null | undefined;
    }[],
    resourceId: string,
  ) => {
    return (
      <TextCell>
        {monitors?.map(({ id, displayName }, index) => {
          const link = getOldStackResourcePageUrl({
            resourceId,
            additionalPath: `/monitor-manager/config-investigator/${id}`,
            orgId,
          });

          return (
            <Fragment key={id}>
              <SafeLink className={classes.monitorsCellLink} href={link}>
                {displayName || id}
              </SafeLink>
              {monitors.length - 1 !== index && ', '}
            </Fragment>
          );
        })}
      </TextCell>
    );
  };

  const renderLinkCell = (children: ReactNode, path: string) => {
    return <LinkCell to={path}>{children}</LinkCell>;
  };

  const renderBasicTextCell = (children: string) => {
    return <TextCell>{children}</TextCell>;
  };

  const renderTable = () => {
    return (
      <WhyLabsTable.Container rowsCount={relatedMonitors.length} headerHeight={34}>
        <WhyLabsTable.Column
          columnKey="monitors-list"
          verticalAlign="top"
          header={<HeaderCell columnKey="monitors-list">Monitors triggering this action</HeaderCell>}
          minWidth={200}
          maxWidth="30%"
          cell={(index: number) => {
            const { resourceId, monitors } = relatedMonitors[index];
            return relatedMonitorRow(monitors, resourceId);
          }}
        />
        <WhyLabsTable.Column
          columnKey="resource-name"
          verticalAlign="top"
          header={<HeaderCell columnKey="resource-name">Resource</HeaderCell>}
          minWidth={200}
          maxWidth="25%"
          cell={(index) => {
            const { resourceName, resourceId } = relatedMonitors[index];

            const link = getOldStackResourcePageUrl({ resourceId, orgId });
            return renderLinkCell(resourceName, link);
          }}
        />
        <WhyLabsTable.Column
          columnKey="resource-id"
          verticalAlign="top"
          header={<HeaderCell columnKey="resource-id">ID</HeaderCell>}
          minWidth={200}
          maxWidth="20%"
          cell={(index) => {
            const { resourceId } = relatedMonitors[index];
            return renderBasicTextCell(resourceId);
          }}
        />
        <WhyLabsTable.Column
          columnKey="resource-type"
          verticalAlign="top"
          header={<HeaderCell columnKey="resource-type">Type</HeaderCell>}
          minWidth={100}
          cell={(index) => {
            const { type } = relatedMonitors[index];
            return renderBasicTextCell(getLabelForModelType(type as ModelType) ?? 'Not defined');
          }}
        />
      </WhyLabsTable.Container>
    );
  };

  return (
    <div className={classes.relatedMonitorsSection}>
      {actionDetails?.references?.length ? (
        <>
          <WhyLabsTypography className={classes.bold} element="h4">
            Related monitors ({actionDetails.references.length})
          </WhyLabsTypography>
          {renderTable()}
        </>
      ) : (
        emptyState()
      )}
    </div>
  );
};
