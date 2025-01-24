import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useSettingsChoiceCardStyles = createStyles({
  cardAnchor: {
    color: 'inherit',
    textDecoration: 'none',
  },
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

    '& > *': {
      textDecoration: 'none',
    },

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
  cardFakeLink: {
    color: Colors.linkColor,
    fontSize: 12,
    lineHeight: 1,
    margin: '0 -15px',
    marginTop: -8,
    padding: '20px 0px 8px 0px',
    textDecoration: 'underline',
    transition: 'opacity 300ms, color 300ms',

    '&:hover': {
      color: Colors.brandPrimary600,
      opacity: 0.8,
    },
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
    color: '#000000de',
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
    color: Colors.gray900,
  },
});
