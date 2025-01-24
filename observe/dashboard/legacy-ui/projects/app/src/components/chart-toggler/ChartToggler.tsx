import { Colors } from '@whylabs/observatory-lib';
import { useAdHoc } from 'atoms/adHocAtom';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useMemo } from 'react';
import { WhyLabsSegmentedControl, WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';

export interface TogglerItem {
  label: string;
  alertNumber?: number;
}

interface ChartTogglerProps {
  items: TogglerItem[];
  onChange: (value: string) => void;
  selectedValue?: string;
}

const useStyles = createStyles(() => ({
  labelWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 2px',
  },
  controlWrapper: {
    marginLeft: 10,
  },
  alertBox: {
    minWidth: '20px',
    height: '20px',
    background: Colors.white,
    borderRadius: '15px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0px 6px',
  },
  alertNum: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '12px',
    lineHeight: '20px',
  },
  red: {
    color: Colors.red,
  },
  redBorder: {
    border: `1px solid ${Colors.red}`,
  },
  orange: {
    color: Colors.orange,
  },
  orangeBorder: {
    border: `1px solid ${Colors.orange}`,
  },
}));

const ControlItem: React.FC<{ label: string; alertNumber?: number; adHocRunId?: string }> = ({
  label,
  alertNumber,
  adHocRunId,
}) => {
  const { classes, cx } = useStyles();

  return (
    <div className={classes.labelWrapper}>
      <WhyLabsText size={12} fw={500}>
        {label}
      </WhyLabsText>
      {!!alertNumber && (
        <div className={cx(classes.alertBox, adHocRunId ? classes.orangeBorder : classes.redBorder)}>
          <WhyLabsText className={cx(classes.alertNum, adHocRunId ? classes.orange : classes.red)}>
            {alertNumber}
          </WhyLabsText>
        </div>
      )}
    </div>
  );
};

export default function ChartToggler({ items, onChange, selectedValue }: ChartTogglerProps): JSX.Element {
  const { modelId, featureId, segment, pageType } = usePageTypeWithParams();
  const [adHocRunId] = useAdHoc(modelId, featureId, segment, pageType);
  const { classes } = useStyles();
  const controlItems = useMemo(() => {
    return items.map(({ label, alertNumber }) => {
      return {
        label: <ControlItem label={label} alertNumber={alertNumber} adHocRunId={adHocRunId} />,
        value: label,
      };
    });
  }, [adHocRunId, items]);

  return items.length ? (
    <div className={classes.controlWrapper}>
      <WhyLabsSegmentedControl value={selectedValue} size="xs" onChange={onChange} data={controlItems} color="gray" />
    </div>
  ) : (
    <></>
  );
}
