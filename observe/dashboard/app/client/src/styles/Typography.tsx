import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

/**
 * Containts base typography styles
 * To visualy see how each of this styles look visit
 * https://www.figma.com/file/CzYRssnFYEnmraWrpyDFr6/Typography-Audit
 *
 * Edit:
 *  Porting styles from UI-EXP should be done carefully, make sure that each class introduced will have the same visual.
 *  We had issues with fontWeights on UI-EXP so things can look bolder on this app
 */
const useTypographyStyles = createStyles({
  headerLight: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    fontWeight: 300,
    lineHeight: '1.5',
    color: Colors.white,
  },
  widgetMediumTitle: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '24px',
    fontWeight: 400,
    lineHeight: '1.5',
    color: Colors.brandPrimary900,
  },
  helperTextThin: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: 1,
    fontWeight: 400,
  },
});

export default useTypographyStyles;
