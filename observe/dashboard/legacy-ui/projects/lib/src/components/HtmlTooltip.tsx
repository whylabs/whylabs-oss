import { Button, createStyles, makeStyles, Tooltip, Typography } from '@material-ui/core';
import React from 'react';
import { Colors } from '../constants/colors';

const useStyles = makeStyles(() =>
  createStyles({
    tooltipTitle: {
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 8,
    },
    tooltipContent: {
      fontSize: 12,
    },
    // Normal <sup> tags and vertical-align:super cause the rest of the line's height to change.
    tooltipButtonWrap: {
      position: 'relative',
      display: 'inline-flex',
      lineHeight: 'inherit',
      verticalAlign: 'top',
      width: 14,
      height: 12,
    },
    tooltipButton: {
      position: 'absolute',
      left: 0,
      borderRadius: 4,
      padding: '0 4px',
      minWidth: 0,
      minHeight: 0,
      color: Colors.brandPrimary900,
      fontWeight: 600,
      fontSize: '0.8rem',
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: 'transparent',
      },
    },
  }),
);
export interface HtmlTooltipProps {
  /**
   * An optional tooltip title to display in the hover window.
   */
  readonly tooltipTitle?: string;

  /**
   * The content to display in the hover window.
   */
  readonly tooltipContent: React.ReactElement | string;

  /**
   * The children are the thing that the user has to hover over to
   * get the tooltip to display. It's defined as '?' by default.
   * Specifying children will overwrite it.
   */
  readonly children?: string;
  /**
   * Tooltip's children ('?') offset
   */
  topOffset?: string;
}

/**
 * Standard component for displaying tooltips.
 * This is mostly a wrapper around the core material ui building blocks to
 * customize styles and remove some boilerplate.
 */
export function HtmlTooltip(props: HtmlTooltipProps): JSX.Element {
  const { tooltipTitle, tooltipContent, children, topOffset = '-0.3rem' } = props;
  const style = useStyles();

  return (
    <Tooltip
      arrow
      title={
        <>
          {tooltipTitle && (
            <Typography className={style.tooltipTitle} color="inherit">
              {tooltipTitle}
            </Typography>
          )}
          <Typography className={style.tooltipContent} color="inherit">
            {tooltipContent}
          </Typography>
        </>
      }
      interactive
    >
      <span className={style.tooltipButtonWrap}>
        <Button className={style.tooltipButton} style={{ top: topOffset }}>
          {children || '?'}
        </Button>
      </span>
    </Tooltip>
  );
}
