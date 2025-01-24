import { createStyles, Skeleton } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useCallback, useMemo, useState } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { IconAlertTriangle } from '@tabler/icons';
import { useAdHoc } from 'atoms/adHocAtom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AnalysisDataFragment, ModelType, useGetMonitorConfigQuery } from 'generated/graphql';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { stringToSchema } from 'utils/schemaUtils';
import { IMonitorDropdownList, mapAnalyzers } from './utils';
import { SelectCustomItems, WhyLabsLinkButton, WhyLabsSelect, WhyLabsText, WhyLabsTooltip } from '../design-system';

const useStyles = createStyles({
  monitorSelect: {
    height: 35,
    color: Colors.brandSecondary900,
    fontWeight: 500,
    fontFamily: 'Asap',
    maxWidth: 300,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'end',
    width: '100%',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    '& p': {
      fontSize: 13,
    },
  },
  label: {
    fontFamily: 'Asap',
    fontSize: 13,
    fontWeight: 400,
    display: 'flex',
    '& a': {
      fontWeight: 500,
      textDecoration: 'none',
    },
  },
  alertBox: {
    width: 23,
    height: 23,
    background: Colors.white,
    border: `1px solid ${Colors.red}`,
    borderRadius: 15,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  alertNum: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: 12,
    lineHeight: 20,
    color: Colors.red,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  icon: {
    color: Colors.brandSecondary900,
  },
  select: {
    '& #hideHack': {
      display: 'none',
    },
    '&:focus': {
      background: 'none',
      borderRadius: 4,
    },
  },
  selectMenu: {
    background: Colors.white,
    borderRadius: 3,
    border: '1px solid rgba(0, 0, 0, 0.25)',
    padding: 0,
  },
  addInfo: {
    color: Colors.brandSecondary600,
    fontSize: 12,
    fontWeight: 500,
  },

  menuItemText: {
    display: 'flex',
    flexDirection: 'column',
  },
  monitorName: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    fontSize: 12,
  },
  red: {
    color: Colors.red,
  },
  redBorder: {
    borderColor: Colors.red,
  },
  orange: {
    color: Colors.orange,
  },
  orangeBorder: {
    borderColor: Colors.orange,
  },
  notMonitoredRoot: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
});

interface MonitorDropdownComponentProps {
  column?: boolean;
  analysisResults: AnalysisDataFragment[];
  isLoading?: boolean;
  analyzer?: string | null;
  showNotMonitoredWarning?: boolean;
  showCreateMonitorButton?: boolean;
  onChange: (analyzer: string | null) => void;
  width?: number;
}
export const MonitorDropdownComponent: React.FC<MonitorDropdownComponentProps> = ({
  analyzer,
  column,
  analysisResults,
  showNotMonitoredWarning,
  showCreateMonitorButton,
  onChange,
  width,
  isLoading,
}) => {
  const { classes: styles } = useStyles();
  const { modelId, featureId, segment, pageType } = usePageTypeWithParams();
  const { data: configString } = useGetMonitorConfigQuery({ variables: { modelId } });
  const {
    resourceState: { resource },
  } = useResourceContext();
  const isLLM = resource?.type === ModelType.Llm;
  const [adHocRunId] = useAdHoc(modelId, featureId, segment, pageType);
  const { getNavUrl } = useNavLinkHandler();
  const monitorConfig = useMemo(() => {
    return configString ? stringToSchema(configString.monitorConfig) : undefined;
  }, [configString]);
  const analyzers: IMonitorDropdownList[] = useMemo(
    () => mapAnalyzers(modelId, analysisResults, monitorConfig?.monitors),
    [analysisResults, modelId, monitorConfig?.monitors],
  );
  const activeMonitorName = useMemo(() => {
    return analyzers.find((a) => a.analyzerId === analyzer)?.monitorName;
  }, [analyzers, analyzer]);
  const getUrlToMonitorCreation = () =>
    getNavUrl({
      modelId,
      page: 'monitorManager',
      monitorManager: { path: isLLM ? 'presets' : 'customize-ui' },
    });
  const displayNotMonitoredCTA = () => {
    if (!showNotMonitoredWarning) return null;
    return (
      <div className={styles.notMonitoredRoot}>
        <IconAlertTriangle color={Colors.orange} size={20} />
        <WhyLabsText color={Colors.orange} fz={12} fw={500}>
          Not monitored
        </WhyLabsText>
        {showCreateMonitorButton && (
          <WhyLabsLinkButton href={getUrlToMonitorCreation()} size="xm" variant="outline" color="gray">
            <WhyLabsText fz={13} fw={600}>
              Create monitor
            </WhyLabsText>
          </WhyLabsLinkButton>
        )}
      </div>
    );
  };
  const getAnomalyCount = useCallback(
    (analyzerId: string | undefined) => {
      if (analyzerId === undefined) {
        return 0;
      }

      const filtered = analysisResults.filter((an) => an.analyzerId === analyzerId && an.isAnomaly && !an.isFalseAlarm);
      return filtered.length;
    },
    [analysisResults],
  );
  const selectMonitorsData = useMemo(() => {
    return (
      analyzers
        ?.filter((m) => !!m.analyzerId)
        .map(({ analyzerId, monitorName, monitorId }) => {
          const totalAnomalies = getAnomalyCount(analyzerId) ?? 0;
          return {
            label: monitorName || monitorId || analyzerId || 'Unknown monitor',
            group: totalAnomalies ? 'Monitors with anomalies' : 'Monitors with no anomalies',
            value: analyzerId ?? '',
            adHocRunId,
            bottomText: monitorName ? monitorId : analyzerId,
            totalAnomalies,
          };
        })
        ?.sort((a, b) => b.totalAnomalies - a.totalAnomalies || a.label.localeCompare(b.label)) ?? []
    );
  }, [adHocRunId, analyzers, getAnomalyCount]);
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <Skeleton width="100%" height={28} />;
  }

  return (
    <div className={column ? styles.column : styles.row}>
      <WhyLabsText className={styles.label}>
        {analyzers.length ? `Monitors (${analyzers.length})` : displayNotMonitoredCTA()}
      </WhyLabsText>
      {analyzers.length !== 0 && (
        <div style={{ width: width ?? '100%', maxWidth: width ?? 280, flex: 1 }}>
          <WhyLabsTooltip label={!open && activeMonitorName ? activeMonitorName : ''}>
            <WhyLabsSelect
              size="xs"
              label="monitor"
              withinPortal
              hideLabel
              data={selectMonitorsData}
              itemComponent={SelectCustomItems.LabelWithLineBreakAndAnomalyCount}
              onChange={onChange}
              value={analyzer ?? null}
              onDropdownToggle={setOpen}
            />
          </WhyLabsTooltip>
        </div>
      )}
    </div>
  );
};
