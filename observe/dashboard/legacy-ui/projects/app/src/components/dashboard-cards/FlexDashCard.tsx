import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { isString } from 'utils/typeGuards';
import { ReactElement, ReactNode } from 'react';
import { Colors } from '@whylabs/observatory-lib';

type FlexDashCardProps = {
  flexDirection: 'row' | 'column';
  title: ReactNode;
  sections: ReactElement[];
  width?: number | string;
  height?: number | string;
  rootClassName?: string;
};
const useStyles = createStyles((_, { flexDirection, width, height }: FlexDashCardProps) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    padding: 20,
    width,
    minWidth: width ?? '100%',
    height,
    minHeight: height ?? '100%',
    background: 'white',
    borderRadius: 4,
    border: `2px solid ${Colors.secondaryLight200}`,
  },
  title: {
    fontFamily: 'Asap',
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.14,
  },
  contentWrapper: {
    display: 'flex',
    flexDirection,
    gap: 15,
  },
}));
export const FlexDashCard = (props: FlexDashCardProps): ReactElement => {
  const { classes, cx } = useStyles(props);
  const { title, sections, rootClassName } = props;
  const titleComponent = (() => {
    if (isString(title)) {
      return <WhyLabsText className={classes.title}>{title}</WhyLabsText>;
    }
    return title;
  })();
  return (
    <div className={cx(classes.root, rootClassName)}>
      {titleComponent}
      <div className={classes.contentWrapper}>{sections}</div>
    </div>
  );
};
