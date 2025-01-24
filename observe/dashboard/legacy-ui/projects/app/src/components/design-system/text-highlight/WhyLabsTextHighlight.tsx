import { createStyles, Highlight, HighlightProps } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

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
    lineHeight: 1.55,
    '& *': {
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
    },
    '& mark': {
      height: '100%',
      color: darkText ? `${Colors.secondaryLight1000} !important` : undefined,
    },
  },
}));

const WhyLabsTextHighlight: React.FC<WhyLabsTextHighlightProps> = ({
  inline = true,
  darkText,
  children,
  className,
  ...rest
}) => {
  const { classes, cx } = useStyles({ inline, darkText });
  return (
    <Highlight data-testid="WhyLabsTextHighlight" {...rest} className={cx(classes.highlight, className)}>
      {children}
    </Highlight>
  );
};

export default WhyLabsTextHighlight;
