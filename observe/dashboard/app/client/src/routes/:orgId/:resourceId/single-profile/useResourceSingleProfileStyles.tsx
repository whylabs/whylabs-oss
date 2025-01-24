import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useResourceSingleProfileStyles = createStyles(() => ({
  main: {
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
  },
  thresholdContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  thresholdLabel: {
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.55,
    marginBottom: 1,
    marginTop: 2,
  },
  thresholdInputsContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 6,

    '& input': {
      width: 80,
    },

    '& span': {
      fontFamily: 'Asap',
      fontSize: 14,
    },
  },
  contentSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: 16,
  },
  isTruncatedAlert: {
    borderColor: Colors.chartBlue,
  },
  isTruncatedMessage: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
  },
  tableSection: {
    background: Colors.white,
    minHeight: 200,
    overflow: 'auto',
    position: 'relative',
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTitle: {
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    fontSize: 16,
  },
  tooltipBodyRoot: {
    padding: 0,
  },
  tooltipTitle: {
    color: Colors.black,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 700,
    padding: '5px 10px',
  },
  tooltipItem: {
    boxSizing: 'border-box',
    borderLeft: `6px solid ${Colors.chartPrimary}`,
    padding: '4px 8px',
    marginTop: 0,
    marginBottom: 0,

    '& p': {
      fontFamily: 'Asap',
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  tooltipItemFailed: {
    borderColor: Colors.red,
  },
  tooltipItemReferenceProfile: {
    borderColor: Colors.chartAqua,
  },
  downloadButton: {
    height: 30,
    width: 30,
  },
  preparingDownloadState: {
    alignItems: 'center',
    color: Colors.secondaryLight1000,
    display: 'flex',
    flexDirection: 'row',
    fontFamily: 'Asap',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: 400,
    gap: 8,
  },
}));
