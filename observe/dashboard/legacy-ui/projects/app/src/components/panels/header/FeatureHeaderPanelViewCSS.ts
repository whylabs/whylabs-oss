import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';

export const useFeatureHeaderPanelViewStyles = createStyles({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
    maxWidth: `calc(100% - ${Spacings.leftColumnWidth}px)`,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    minHeight: Spacings.tabContentHeaderHeight,
  },
  widgetRow: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'stretch',
    height: Spacings.tabContentHeaderHeight,
    minHeight: Spacings.tabContentHeaderHeight,
    maxHeight: Spacings.tabContentHeaderHeight,
    overflowX: 'auto',
    overflowY: 'hidden',
    width: '100%',
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
  buttonText: {
    textTransform: 'none',
    fontSize: '12px',
    lineHeight: '14px',
    paddingTop: '8px',
    paddingBottom: '8px',
  },
  comboWidgetText: {
    marginRight: '10px',
  },
  buttonActive: {
    backgroundColor: Colors.brandSecondary100,
    color: Colors.orange,
    borderColor: Colors.orange,
  },
  flexRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  adHoc: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: Colors.white,
    justifyContent: 'space-between',
    flexShrink: 0,
    alignItems: 'stretch',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  bottomBorder: {
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
  previewButton: {
    marginRight: Spacings.pageLeftPadding,
    color: Colors.secondaryLight1000,
    padding: '8px 13px',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '-0.14px',
    '&:disabled': {
      fontStyle: 'italic',
      pointerEvents: 'none',
    },
  },
  buttonFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  closePreviewButton: {
    backgroundColor: Colors.chartOrange,
    color: Colors.white,
    borderColor: Colors.white,
    fontWeight: 600,
    '&:hover': {
      backgroundColor: Colors.chartOrange,
    },
  },
});
