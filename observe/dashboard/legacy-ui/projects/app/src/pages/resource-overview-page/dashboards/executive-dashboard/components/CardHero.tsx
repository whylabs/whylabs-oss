import { isExactlyNullOrUndefined } from 'utils';
import { createStyles } from '@mantine/core';
import { ValueAttributes } from 'generated/dashboard-schema';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { convertToDisplayString } from '../execDashHelpers';

interface CardHeroProps {
  color?: string;
  value: number | null;
  precision?: number;
  valueType?: ValueAttributes['valueType'];
  emptyText?: string;
  altValue?: number | null;
  altPrecision?: number;
  altValueType?: ValueAttributes['valueType'];
}

interface StylesProps {
  color: string;
}

const useStyles = createStyles((_, { color }: StylesProps) => ({
  heroContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    gap: '10px',
  },
  heroText: {
    fontFamily: 'Asap',
    fontSize: '56px',
    lineHeight: 0.78,
    color,
    fontWeight: 300,
  },
  subHeroText: {
    fontFamily: 'Asap',
    fontSize: '24px',
    fontWeight: 500,
    lineHeight: 1,
    color: Colors.brandSecondary900,
  },
  infoText: {
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: 1,
    textAlign: 'end',
    color: Colors.brandSecondary900,
  },
}));

export const CardHero: React.FC<CardHeroProps> = ({
  color = Colors.brandSecondary900,
  value,
  precision = 0,
  valueType = 'number',
  emptyText = '',
  altValue,
  altPrecision = 0,
  altValueType = 'number',
}) => {
  const { classes } = useStyles({ color });
  const renderSubHeader = () => {
    if (isExactlyNullOrUndefined(altValue)) {
      return null;
    }
    const displayedValue = convertToDisplayString(altValue, altPrecision, altValueType);
    return (
      <WhyLabsText inherit className={classes.subHeroText}>
        {displayedValue}
      </WhyLabsText>
    );
  };

  const displayedValue = convertToDisplayString(value, precision, valueType);
  const textClass = isExactlyNullOrUndefined(value) ? classes.infoText : classes.heroText;

  return (
    <div className={classes.heroContainer}>
      <WhyLabsText inherit className={textClass}>
        {displayedValue ?? emptyText}
      </WhyLabsText>
      {renderSubHeader()}
    </div>
  );
};
