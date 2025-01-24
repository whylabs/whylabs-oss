import { WhyLabsNoDataBlockProps, WhyLabsNoDataBlock } from 'components/empty-states/WhyLabsNoDataBlock';
import { createStyles } from '@mantine/core';
import noDataBackground from 'ui/noDataBackground.svg';
import noDataCubesLeft from 'ui/noDataCubesLeft.svg';
import noDataCubesRight from 'ui/noDataCubesRight.svg';

const sidePadding = 20;
const useStyles = createStyles((_, maxContentWidth: number | undefined) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexGrow: 1,
    padding: `70px ${sidePadding}px`,
    backgroundImage: `url(${noDataCubesLeft}), url(${noDataCubesRight}), url(${noDataBackground})`,
    backgroundPosition: 'left top, right top, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    backgroundSize: '465px 419px, 261px 367px, cover',
  },
  contentWrap: {
    width: 'auto',
    maxWidth: maxContentWidth ? `${maxContentWidth}px` : '80vw',
    zIndex: 1,
  },
}));

export const WhyLabsNoDataPage: React.FC<WhyLabsNoDataBlockProps> = ({ maxContentWidth, ...rest }) => {
  const { classes } = useStyles(maxContentWidth);
  return (
    <div className={classes.root}>
      <div className={classes.contentWrap}>
        <WhyLabsNoDataBlock {...rest} />
      </div>
    </div>
  );
};
