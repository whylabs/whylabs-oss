import { ApolloQueryResult } from '@apollo/client';
import { useMemo, useState } from 'react';
import { Column, Table } from 'fixed-data-table-2';
import { GetModelOverviewInformationQuery } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { Colors, HtmlTooltip, HeaderCell } from '@whylabs/observatory-lib';
import { InputsCell, LastAlertCell, OutputCell, SegmentCell, SimpleTextCell } from 'components/controls/table/cells';
import ProfilesRangeCell from 'components/controls/table/cells/ProfilesRangeCell';
import HeaderCellSortSelect from 'pages/model-page/HeaderCellSortSelect';
import { ModelSortBy, SortDirectionType } from 'hooks/useSort/types';
import { tooltips } from 'strings/tooltips';
import { yearMonthDay, yearMonthDayUTC } from 'utils/dateUtils';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';

import { useModelOverviewInfoFragmentLists } from 'hooks/useModelOverviewInfoFragmentLists';
import AnomaliesInRangeCell from 'components/controls/widgets/alerts-table/cells/AnomaliesInRangeCell';
import { useUserContext } from 'hooks/useUserContext';
import ReferenceProfilesCell from 'components/controls/table/cells/ReferenceProfilesCell';
import { WhyLabsText } from 'components/design-system';
import { getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { isNumber } from 'utils/typeGuards';
import TagsCell from 'components/controls/table/cells/TagsCell';
import DecoratedModelCell from '../../DecoratedModelCell';
import ResourceTypeCell from '../../ResourceTypeCell';
import { ModelSetSort, ResourceOverviewData } from '../../../layoutHelpers';

const useStyles = createStyles({
  noDataText: {
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
    paddingRight: 0,
    width: 160,
  },
});

export interface OverviewTableProps {
  readonly searchTerm?: string;
  data: ResourceOverviewData[];
  width: number;
  height: number;
  refetchData: () => Promise<ApolloQueryResult<GetModelOverviewInformationQuery>>;
  handleSort: ModelSetSort;
  sortDirection: SortDirectionType;
  sortBy: ModelSortBy | undefined;
  withTags?: boolean;
  addResourceTagToFilter?: (t: string[]) => void;
}
export const TABLE_ROW_HEIGHT = 40;

export const getUrlProfilesRange = (from: number | null, to: number | null): string[] | null => {
  if (from && to) {
    return [`${yearMonthDayUTC(from)}`, `${yearMonthDayUTC(to)}`];
  }
  return null;
};

export default function DashboardTable({
  data,
  searchTerm,
  width,
  height,
  refetchData,
  handleSort,
  sortDirection,
  sortBy,
  withTags = false,
  addResourceTagToFilter,
}: OverviewTableProps): JSX.Element {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { getCurrentUser, canManageDatasets } = useUserContext();
  const user = getCurrentUser();
  const [nameEditIndex, setNameEditIndex] = useState<number | undefined>();
  const [typeEditIndex, setTypeEditIndex] = useState<number | undefined>();
  const { classes: styles } = useStyles();

  const { classes: typography } = useTypographyStyles();
  const normalizedTerm = useMemo(() => searchTerm?.toLowerCase(), [searchTerm]);
  const filteredData = useMemo(
    () =>
      normalizedTerm
        ? data.filter(
            (model) =>
              model.name.toLowerCase().includes(normalizedTerm) || model.id.toLowerCase().includes(normalizedTerm),
          )
        : data,
    [normalizedTerm, data],
  );

  const getTimestampLineageRange = (rowIndex: number): [number, number] | null => {
    const { oldestProfileTimestamp, latestProfileTimestamp } = filteredData[rowIndex]?.dataLineage ?? {};
    const { setEndOfProfile } = getFunctionsForTimePeriod.get(filteredData[rowIndex].batchFrequency) ?? {};
    if (isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp)) {
      const endOfBucket = setEndOfProfile ? setEndOfProfile(latestProfileTimestamp).getTime() : latestProfileTimestamp;
      return [oldestProfileTimestamp, endOfBucket];
    }
    return null;
  };

  const getReferenceProfilesCount = (rowIndex: number): number => {
    return filteredData[rowIndex].referenceProfiles?.length ?? 0;
  };

  const {
    modelBatchFrequencies,
    modelIds,
    modelLatestAnomalyTimestamps,
    modelNames,
    modelTotalFeatures,
    modelTotalOutputs,
    modelTotalSegments,
    modelTypes,
  } = useModelOverviewInfoFragmentLists(filteredData);

  return (
    <Table
      rowHeight={TABLE_ROW_HEIGHT}
      headerHeight={TABLE_ROW_HEIGHT}
      rowsCount={filteredData.length}
      width={width}
      height={height}
    >
      <Column
        columnKey="name"
        header={
          <HeaderCellSortSelect
            header="Resource"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.resource_feature_page_feature} />
            )}
            sortDirection={sortBy === 'Name' ? sortDirection : undefined}
            onSortDirectionChange={(newSortDir) => handleSort('Name', newSortDir)}
            isFirstColumn
          />
        }
        fixed
        cell={
          <DecoratedModelCell
            editIndex={nameEditIndex}
            setEditIndex={setNameEditIndex}
            modelsTypes={modelTypes}
            modelNames={modelNames}
            modelIds={modelIds}
            columnKey="name"
            refetchData={refetchData}
            enableEditing={user?.isAuthenticated && canManageDatasets}
            searchTerm={normalizedTerm}
          />
        }
        width={300}
      />
      <Column
        columnKey="latestProfile"
        align="left"
        header={
          <HeaderCellSortSelect
            header="Freshness"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_latest_profile} />
            )}
            onSortDirectionChange={(nextSortDirection) => handleSort('Freshness', nextSortDirection)}
            sortDirection={sortBy === 'Freshness' ? sortDirection : undefined}
          />
        }
        cell={({ rowIndex, height: h }) => {
          const timestamp = filteredData[rowIndex].dataAvailability?.latestTimestamp;
          return (
            <span
              className={cx(commonStyles.cellNestedPadding, typography.monoFont)}
              style={{ display: 'flex', alignItems: 'center', paddingLeft: '20px', height: h }}
            >
              {timestamp ? (
                yearMonthDay(timestamp)
              ) : (
                <span className={cx(typography.noDataText, typography.monoFont)}>No profiles found</span>
              )}
            </span>
          );
        }}
        width={160}
      />

      <Column
        columnKey="modelType"
        header={
          <HeaderCellSortSelect
            header="Resource type"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_resource_type} />
            )}
            onSortDirectionChange={(nextSortDirection) => handleSort('ResourceType', nextSortDirection)}
            sortDirection={sortBy === 'ResourceType' ? sortDirection : undefined}
          />
        }
        cell={({ rowIndex }) => {
          const { id, modelType, name } = filteredData[rowIndex];
          return (
            <ResourceTypeCell
              editIndex={typeEditIndex}
              setEditIndex={setTypeEditIndex}
              refetchData={refetchData}
              modelId={id}
              modelName={name}
              modelType={modelType}
              rowIndex={rowIndex}
              enableEditing={user?.isAuthenticated && canManageDatasets}
            />
          );
        }}
        width={220}
      />

      <Column
        columnKey="alertsByTime"
        header={
          <HeaderCellSortSelect
            header="Anomalies in range"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_alerts_in_range} />
            )}
            onSortDirectionChange={(nextSortDirection) => handleSort('AnomaliesInRange', nextSortDirection)}
            sortDirection={sortBy === 'AnomaliesInRange' ? sortDirection : undefined}
          />
        }
        cell={({ rowIndex }) => (
          <AnomaliesInRangeCell
            resourceId={filteredData[rowIndex]?.id}
            noDataText={
              <WhyLabsText inherit className={cx(styles.noDataText, typography.monoFont)}>
                No anomalies in range
              </WhyLabsText>
            }
            timeSeries={filteredData[rowIndex]?.anomalyCounts?.timeseries ?? []}
            totalAnomaliesCount={filteredData[rowIndex]?.totalAnomaliesInRange}
            viewMode="table"
          />
        )}
        width={220}
      />

      {withTags && (
        <Column
          columnKey="tags"
          header={
            <HeaderCell
              header="Tags"
              renderTooltip={() => <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_tags} />}
            />
          }
          cell={({ rowIndex }) => {
            const { resourceTags, id } = filteredData[rowIndex];
            return (
              <TagsCell
                tags={resourceTags}
                resourceId={id}
                columnKey="tags"
                height={TABLE_ROW_HEIGHT}
                width={400}
                addResourceTagToFilter={addResourceTagToFilter}
              />
            );
          }}
          minWidth={200}
          width={400}
          flexGrow={1}
        />
      )}
      <Column
        columnKey="lastAlert"
        header={
          <HeaderCellSortSelect
            header="Last profile with anomalies"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_last_alert_time} />
            )}
            onSortDirectionChange={(nextSortDirection) => handleSort('LatestAlert', nextSortDirection)}
            sortDirection={sortBy === 'LatestAlert' ? sortDirection : undefined}
          />
        }
        cell={<LastAlertCell alertTimestampsInMillis={modelLatestAnomalyTimestamps} columnKey="lastAlert" />}
        width={250}
      />
      <Column
        columnKey="batchFrequency"
        header={
          <HeaderCell
            header="Batch frequency"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_batch_frequency} />
            )}
          />
        }
        cell={<SimpleTextCell data={modelBatchFrequencies} columnKey="batchFrequency" />}
        width={140}
      />
      <Column
        columnKey="totalFeatures"
        align="right"
        header={
          <HeaderCell
            header="Columns"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_total_features} />
            )}
          />
        }
        cell={({ rowIndex, height: h, width: w }) => (
          <InputsCell
            height={h}
            width={w}
            rowIndex={rowIndex}
            modelId={filteredData[rowIndex].id}
            data={modelTotalFeatures}
            columnKey="totalFeatures"
          />
        )}
        width={100}
      />
      <Column
        columnKey="totalOutputs"
        align="right"
        header={
          <HeaderCell
            header="Outputs"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_view_output} />
            )}
          />
        }
        cell={({ rowIndex, height: h, width: w }) => {
          const resource = filteredData[rowIndex];

          return (
            <OutputCell
              columnKey="totalOutputs"
              data={modelTotalOutputs}
              height={h}
              resourceId={resource.id}
              resourceCategory={resource.assetCategory}
              resourceType={resource.modelType}
              rowIndex={rowIndex}
              width={w}
            />
          );
        }}
        width={100}
      />
      <Column
        columnKey="totalSegments"
        align="right"
        header={
          <HeaderCell
            header="Segments"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_total_segments} />
            )}
          />
        }
        cell={({ rowIndex, height: h, width: w }) => (
          <SegmentCell
            height={h}
            width={w}
            rowIndex={rowIndex}
            modelId={filteredData[rowIndex].id}
            data={modelTotalSegments}
            columnKey="totalSegments"
          />
        )}
        width={100}
      />
      <Column
        columnKey="referenceProfiles"
        align="right"
        header={
          <HeaderCell
            header="Reference profiles"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_ref_profile_count} />
            )}
          />
        }
        cell={({ rowIndex, height: h, width: w }) => (
          <ReferenceProfilesCell
            height={h}
            width={w}
            rowIndex={rowIndex}
            referenceProfileCount={getReferenceProfilesCount(rowIndex)}
          />
        )}
        width={150}
      />
      <Column
        columnKey="profilesRange"
        align="left"
        header={
          <HeaderCell
            header="Batch profile lineage"
            renderTooltip={() => (
              <HtmlTooltip topOffset="-8px" tooltipContent={tooltips.model_overview_page_profiles_lineage} />
            )}
          />
        }
        cell={({ rowIndex, height: h, width: w }) => (
          <ProfilesRangeCell
            height={h}
            width={w}
            modelId={filteredData[rowIndex].id}
            range={getTimestampLineageRange(rowIndex)}
            batchFrequency={filteredData[rowIndex].batchFrequency}
            assetCategory={filteredData[rowIndex].assetCategory ?? null}
          />
        )}
        width={200}
      />
    </Table>
  );
}
