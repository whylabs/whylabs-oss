import { createStyles, makeStyles } from '@material-ui/core';
import React from 'react';

const areaHeight = {
  panel: 70,
  titleBar: 40,
  banner: 60,
};
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    titleBarArea: {
      height: areaHeight.titleBar,
      background: '#021826',
    },
    panelArea: {
      height: areaHeight.panel,
    },
    tableArea: {
      // TODO move colors into lib and reference this from there
      backgroundColor: '#EBF2F3',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      // These overflow statements are safeguards against our autosizer repeatedly shifting the pagesize
      overflowX: 'auto',
    },
  }),
);

export interface TitleAndContentTemplateProps {
  readonly TitleBarAreaComponent: React.ReactNode;
  readonly BannerComponent?: React.ReactNode;
  readonly TabBarComponent: React.ReactNode;
  readonly ContentAreaComponent: React.ReactNode;
}

export const TitleAndContentTemplate = React.memo((props: TitleAndContentTemplateProps) => {
  const styles = useStyles();
  const { TabBarComponent: PanelAreaComponent, TitleBarAreaComponent, ContentAreaComponent, BannerComponent } = props;

  return (
    <div className={styles.root}>
      {BannerComponent && <div>{BannerComponent}</div>}
      <div className={styles.titleBarArea}>{TitleBarAreaComponent}</div>
      <div className={styles.panelArea}>{PanelAreaComponent}</div>
      <div className={styles.tableArea}>{ContentAreaComponent}</div>
    </div>
  );
});
