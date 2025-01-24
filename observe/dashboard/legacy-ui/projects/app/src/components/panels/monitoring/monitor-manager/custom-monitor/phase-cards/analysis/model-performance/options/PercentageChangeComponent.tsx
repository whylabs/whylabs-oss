import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { Colors } from '@whylabs/observatory-lib';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { Slider, withStyles } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { ColumnCardContentProps } from '../../../phaseCard';
import useCustomMonitorManagerCSS from '../../../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../../../ReadModeMonitorManager';

const WhySlider = withStyles({
  root: {
    color: Colors.brandSecondary200,
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    height: 14,
    width: 14,
    backgroundColor: Colors.brandPrimary900,
    marginTop: -(14 / 3),
    marginLeft: -7,
    '&:focus, &:hover, &$active': {
      boxShadow: 'inherit',
    },
  },
  active: {},
  track: {
    height: 6,
    borderRadius: 3,
  },
  rail: {
    height: 6,
    borderRadius: 3,
  },
})(Slider);

const useSliderStyle = createStyles({
  sliderWrap: {
    marginBottom: 0,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: 12,
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
});

const PercentageChangeComponent = ({
  setContentHeight,
  isPhaseActive,
  setHasChanged,
}: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const { classes: sliderStyles } = useSliderStyle();
  const [{ thresholdPct }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, isPhaseActive]);

  if (!isPhaseActive) return <ReadModeMonitorManager label="Threshold value" text={thresholdPct.toString()} />;

  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <WhyLabsText inherit className={styles.columnCardTitle}>
        Percentage change
      </WhyLabsText>
      <WhyLabsText inherit className={styles.columnCardText}>
        Set the percentage change: <b>{thresholdPct}%</b>
      </WhyLabsText>
      <div className={sliderStyles.sliderWrap}>
        <div className={sliderStyles.sliderHeader}>
          <span>Less</span>
          <span>More</span>
        </div>
        <WhySlider
          value={thresholdPct}
          onChange={(_, newValue) => {
            setHasChanged(true);
            setRecoilState((prevState) => ({
              ...prevState,
              thresholdPct: newValue as number,
            }));
          }}
        />
      </div>
    </div>
  );
};

export default PercentageChangeComponent;
