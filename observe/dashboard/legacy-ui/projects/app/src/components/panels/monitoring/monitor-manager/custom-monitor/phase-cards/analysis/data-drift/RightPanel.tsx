import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import mv3CardBackground from 'ui/mv3-card-background.svg';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';

const useMonitorAnalysis2Styles = createStyles({
  columnCardSide: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    '& > *': {
      position: 'relative',
      zIndex: 2,
    },
    '& > img': {
      position: 'absolute',
      top: 0,
      transform: 'translate(0%, -10%)',
      zIndex: 1,
      height: 300,
    },
  },
  selectFeaturesBtn: {
    backgroundColor: Colors.white,
    '&:hover': {
      backgroundColor: Colors.white,
    },
  },
});

interface RightPanelProps {
  number: number;
  buttonText: string;
  title: string;
  onClick: () => void;
  classes?: {
    root?: string;
    number?: string;
  };
  hideButton?: boolean;
}
export default function RightPanel({
  classes,
  number,
  buttonText,
  title,
  onClick,
  hideButton = false,
}: RightPanelProps): JSX.Element {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const { classes: mStyles } = useMonitorAnalysis2Styles();

  return (
    <div className={cx(mStyles.columnCardSide, classes?.root)}>
      <img src={mv3CardBackground} alt="card background" />
      <WhyLabsText className={cx(styles.columnCardTitle, styles.columnCardTextCenter)}>{title}</WhyLabsText>
      <div className={cx(styles.highlightNumber, classes?.number)}>{number}</div>
      {!hideButton && (
        <WhyLabsButton
          onClick={() => {
            onClick();
          }}
          variant="outline"
          color="gray"
          className={cx(mStyles.selectFeaturesBtn)}
        >
          {buttonText}
        </WhyLabsButton>
      )}
    </div>
  );
}
