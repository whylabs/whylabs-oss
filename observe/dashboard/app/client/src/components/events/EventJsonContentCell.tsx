import TextCell from '~/components/design-system/responsive-table/cells/TextCell';
import { useResourceBatchFrequency } from '~/hooks/useResourceBatchFrequency';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { parseJsonContent } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';
import { useParams } from 'react-router-dom';

import { useEventsTableStyles } from './EventsTableStyles';

type EventJsonContentCellProps = {
  onSelectRowContent: (content: object[]) => void;
  resourceId: string;
  traceId: string;
};

export const EventJsonContentCell = ({ onSelectRowContent, resourceId, traceId }: EventJsonContentCellProps) => {
  const { classes, cx } = useEventsTableStyles();
  const { orgId } = useParams<{ orgId: string }>();
  const { batchFrequency, loading } = useResourceBatchFrequency({ orgId: orgId ?? '', resourceId });
  const {
    dateRange: { from: startTimestamp, to: endTimestamp },
  } = useSuperGlobalDateRange({ timePeriod: batchFrequency, loading });

  const isQueryEnabled = !!orgId && !!startTimestamp && !!endTimestamp && !loading;

  const response = trpc.dashboard.events.describeContent.useQuery(
    {
      orgId: orgId ?? '',
      resourceId,
      traceId,
      fromTimestamp: startTimestamp ?? 0,
      toTimestamp: endTimestamp ?? 0,
    },
    {
      enabled: isQueryEnabled,
    },
  );

  if (isQueryEnabled && response.isLoading) return renderBasicTextCell('loading...');

  const contentList = response.data;

  const firstContentJson = response.data?.[0];
  if (!firstContentJson) return renderBasicTextCell('-');

  return (
    <button className={classes.contentCellButton} onClick={handleOnSelectRowContent} type="button">
      <TextCell className={cx(classes.dataRow, classes.contentCell)}>View details</TextCell>
    </button>
  );

  function renderBasicTextCell(children: string) {
    return <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{children}</TextCell>;
  }

  function handleOnSelectRowContent() {
    const list: object[] = [];

    contentList?.forEach((c) => {
      const jsonObject = parseJsonContent(c);
      if (jsonObject) list.push(jsonObject);
    });

    onSelectRowContent(list);
  }
};
