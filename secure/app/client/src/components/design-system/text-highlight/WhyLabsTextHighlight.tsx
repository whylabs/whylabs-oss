import { Highlight, HighlightProps, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

type StyleProps = {
  inline?: boolean;
  /* For links usage, blue over yellow background haven't a great contrast,
   * so you can use the prop darkText to display the highlighted text in dark gray
   */
  darkText?: boolean;
};
export type WhyLabsTextHighlightProps = HighlightProps & StyleProps;

const useStyles = createStyles((_, { inline, darkText }: StyleProps) => ({
  highlight: {
    display: inline ? 'inline' : undefined,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    '& *': {
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
    },
    '& mark': {
      color: darkText ? `${Colors.secondaryLight1000} !important` : undefined,
    },
  },
}));

const WhyLabsTextHighlight = ({ inline = true, darkText, children, className, ...rest }: WhyLabsTextHighlightProps) => {
  const { classes, cx } = useStyles({ inline, darkText });
  return (
    <Highlight data-testid="WhyLabsTextHighlight" {...rest} className={cx(classes.highlight, className)}>
      {children}
    </Highlight>
  );
};

export default WhyLabsTextHighlight;
