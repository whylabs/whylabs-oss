import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

export const useSettingsChoiceCardStyles = createStyles({
  root: {},
  card: {
    position: 'relative',
    display: 'grid',
    minHeight: '220px',
    gridTemplateAreas: `
                          "content"
                          "footer"`,
    maxWidth: 250,
    padding: 15,
    borderRadius: 4,
    backgroundColor: Colors.whiteBackground,
    border: `2px solid ${Colors.brandSecondary200}`,
    transition: 'opacity 300ms',

    '&:hover': {
      border: `2px solid ${Colors.brandSecondary300}`,
      cursor: 'pointer',
    },
  },
  cardDivider: {
    border: 'none',
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    width: '100%',
    pointerEvents: 'none',
  },
  cardLink: {
    fontSize: 14,
    lineHeight: 1,
    color: Colors.linkColor,
    textDecoration: 'underline',
    transition: 'opacity 300ms, color 300ms',

    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
  },
  cardFooterTxt: {
    fontSize: 12,
    fontFamily: 'Asap',
    lineHeight: 1,
    padding: '20px 0px 8px 0px',
    margin: '0 -15px',
    marginTop: -8,
  },
  cardFooter: {
    gridArea: 'footer',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  cardContent: {
    gridArea: 'content',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 500,
    fontSize: '14px',
    lineHeight: '20px',
  },
  description: {
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: '10px',
  },
  text: {
    marginLeft: '19px',
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '14px',
    lineHeight: '20px',
  },
});
