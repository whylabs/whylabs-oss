import { Colors, WhyLabsAutoSizer, TableLoading } from '@whylabs/observatory-lib';
import 'fixed-data-table-2/dist/fixed-data-table.css';
import { GetModelOverviewInformationQuery } from 'generated/graphql';
import { ApolloQueryResult } from '@apollo/client';
import 'ui/fixedDataOverrides.css';
import useTypographyStyles from 'styles/Typography';
import AddIcon from '@material-ui/icons/Add';
import { SortDirectionType, ModelSortBy } from 'hooks/useSort/types';

import { createStyles } from '@mantine/core';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import DashboardTable, { TABLE_ROW_HEIGHT } from './DashboardTable/DashboardTable';
import { ModelSetSort, ResourceOverviewData } from '../../layoutHelpers';

export const TABLE_DASHBOARD_CONTAINER_TEST_ID = 'table-dashboard-layout';
export const SETUP_MODEL_BTN_TEST_ID = 'table-dashboard-setup-model-btn';

const useStyles = createStyles({
  tableRoot: {
    width: '100%',
    '& .fixedDataTableLayout_rowsContainer': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  linkOverride: {
    fontSize: '12px',
    lineHeight: '14px',
    margin: 0,
  },
  setupModelContainer: {
    display: 'flex',
    justifyContent: 'center',
    background: 'white',
    minHeight: `${TABLE_ROW_HEIGHT}px`,
    borderBottom: `1px solid rgb(219, 229, 231)`,
  },
  setupModelContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  addIcon: {
    marginLeft: '10px',
    color: Colors.chartAqua,
  },
});

export interface DashboardLayoutProps {
  readonly searchTerm?: string;
  models?: ResourceOverviewData[];
  loading: boolean;
  refetchData: () => Promise<ApolloQueryResult<GetModelOverviewInformationQuery>>;
  setIsOpen: (open: boolean) => void;
  handleSort: ModelSetSort;
  sortDirection: SortDirectionType;
  sortBy: ModelSortBy | undefined;
  userCanManageDatasets: boolean;
  withTags?: boolean;
  addResourceTagToFilter: (t: string[]) => void;
}

export default function DashboardLayout({
  searchTerm,
  models,
  loading,
  refetchData,
  setIsOpen,
  handleSort,
  sortDirection,
  sortBy,
  userCanManageDatasets,
  withTags = false,
  addResourceTagToFilter,
}: DashboardLayoutProps): JSX.Element {
  const { classes: typographyStyles, cx } = useTypographyStyles();
  const { classes: styles } = useStyles();

  function calculateRootHeight(): number {
    /**
     * 2 - borders
     * TODO: Horizontal scroll height is missing from calculation, since its always hidden in DashboardTable.tsx
     */
    if (models) return models.length * TABLE_ROW_HEIGHT + TABLE_ROW_HEIGHT + 18;

    return TABLE_ROW_HEIGHT + 18;
  }

  if (loading) {
    return <TableLoading />;
  }

  const useTagsLayout = withTags; // Calling out separately because the logic will be separated in the future
  const renderTagsLayout = () => {
    return (
      <WhyLabsAutoSizer className="table-dashboard-content-wrapper-tests">
        {({ height, width }) => (
          <DashboardTable
            height={height}
            width={width}
            data={models ?? []}
            sortBy={sortBy}
            sortDirection={sortDirection}
            handleSort={handleSort}
            refetchData={refetchData}
            searchTerm={searchTerm}
            withTags={withTags}
            addResourceTagToFilter={addResourceTagToFilter}
          />
        )}
      </WhyLabsAutoSizer>
    );
  };

  const renderLegacyLayout = () => {
    return (
      <WhyLabsAutoSizer className="table-dashboard-content-wrapper-tests">
        {({ height, width }) => (
          <DashboardTable
            height={height}
            width={width}
            data={models ?? []}
            sortBy={sortBy}
            sortDirection={sortDirection}
            handleSort={handleSort}
            refetchData={refetchData}
            searchTerm={searchTerm}
            withTags={withTags}
          />
        )}
      </WhyLabsAutoSizer>
    );
  };

  const getContainerStyle = () => {
    if (useTagsLayout) {
      return { height: '100%' };
    }
    return { height: calculateRootHeight() };
  };
  return (
    <>
      <div className={styles.tableRoot} style={getContainerStyle()} data-testid={TABLE_DASHBOARD_CONTAINER_TEST_ID}>
        {useTagsLayout ? renderTagsLayout() : renderLegacyLayout()}
      </div>
      {userCanManageDatasets && (
        <div className={styles.setupModelContainer} data-testid={SETUP_MODEL_BTN_TEST_ID}>
          <InvisibleButton className={styles.setupModelContent} onClick={() => setIsOpen(true)}>
            <p className={cx(typographyStyles.link, styles.linkOverride)}>Create resource</p>
            <AddIcon className={styles.addIcon} />
          </InvisibleButton>
        </div>
      )}
    </>
  );
}
