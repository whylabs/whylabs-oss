import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { WhyLabsCheckboxGroup } from 'components/design-system';
import { useRecoilState } from 'recoil';
import { useMemo } from 'react';
import { EventFeedFilterAtom } from 'atoms/eventFeedFilterAtom';

const useStyles = createStyles(() => ({
  inner: {
    cursor: 'pointer',
  },
  label: {
    color: Colors.brandSecondary900,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 400,
    whiteSpace: 'nowrap',
  },
  cardTittle: {
    fontWeight: 600,
    color: Colors.brandSecondary900,
    fontSize: '14px',
    lineHeight: 1.55,
    whiteSpace: 'nowrap',
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
}));

const ANOMALIES_ONLY_KEY = 'anomalies_only';
const FAILED_ANOMALIES_KEY = 'show_failed_anomalies';
const UNHELPFUL_ANOMALIES_KEY = 'include_unhelpful_anomalies';

export const AnalysisFiltersWidget: React.FC = () => {
  const { classes } = useStyles();
  const [{ anomaliesOnly, includeFailed, includeUnhelpful }, setFilter] = useRecoilState(EventFeedFilterAtom);
  const selectedFilters = useMemo(() => {
    const filters: string[] = [];
    if (anomaliesOnly) filters.push(ANOMALIES_ONLY_KEY);
    if (includeFailed) filters.push(FAILED_ANOMALIES_KEY);
    if (includeUnhelpful) filters.push(UNHELPFUL_ANOMALIES_KEY);
    return filters;
  }, [anomaliesOnly, includeFailed, includeUnhelpful]);
  const setAnalysisFilters = (filters: string[]) => {
    setFilter({
      anomaliesOnly: filters.includes(ANOMALIES_ONLY_KEY),
      includeFailed: filters.includes(FAILED_ANOMALIES_KEY),
      includeUnhelpful: filters.includes(UNHELPFUL_ANOMALIES_KEY),
    });
  };
  return (
    <div className={classes.root}>
      <WhyLabsCheckboxGroup
        noWrap
        id="anomalies-feed--checkbox-filter-group"
        label="Events filter"
        labelTooltip="Filter viewable events"
        onChange={setAnalysisFilters}
        options={[
          {
            label: 'Anomalies only',
            value: ANOMALIES_ONLY_KEY,
          },
          {
            label: 'Show failures',
            value: FAILED_ANOMALIES_KEY,
          },
          {
            label: 'Show unhelpful anomalies',
            value: UNHELPFUL_ANOMALIES_KEY,
          },
        ]}
        value={selectedFilters}
      />
    </div>
  );
};
