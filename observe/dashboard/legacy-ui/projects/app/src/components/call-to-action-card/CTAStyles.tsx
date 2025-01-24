import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export const useCTAStyles = createStyles(() => ({
  cardContainer: {
    backgroundColor: Colors.brandSecondary100,
    border: `2px solid ${Colors.brandSecondary300}`,
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    padding: '10px 13px',
    gap: '10px',
    cursor: 'pointer',
    width: '100%',
  },
  textWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    width: '80%',
  },
  cardTitle: {
    fontFamily: 'Asap',
    fontSize: '16px',
    lineHeight: 1.5,
    fontWeight: 600,
    color: 'black',
  },
  cardDescription: {
    marginTop: '4px',
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: 1.4,
    fontWeight: 400,
    color: Colors.secondaryLight1000,
    textAlign: 'initial',
  },
}));
