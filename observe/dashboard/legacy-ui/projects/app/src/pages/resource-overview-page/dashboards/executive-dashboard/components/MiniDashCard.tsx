import { Colors } from '@whylabs/observatory-lib';
import { Text, createStyles } from '@mantine/core';
import { DynamicColor, MiniCard, ValueAttributes } from 'generated/dashboard-schema';
import { WhyLabsTooltip } from 'components/design-system';
import { ToggleOnClickAction, ToggleOnClickState } from '../helpers/cardReducers';
import { convertToDisplayString } from '../execDashHelpers';
import { determineSingleDynamicColor } from '../helpers/cardHelpers';

interface StylesProps {
  color: string;
  cardArea?: string;
}

const useStyles = createStyles((_, { color, cardArea }: StylesProps) => ({
  universalStyles: {
    color,
    layout: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    alignContent: 'end',
    padding: '4px',
    boxSizing: 'content-box',
    border: '1px solid',
    borderRadius: '4px',
    borderColor: Colors.transparent,
  },
  automaticLayoutCard: {
    gridColumnStart: 'auto',
    gridColumnEnd: `span 1`,
    gridRowStart: 'auto',
    gridRowEnd: `span 1`,
  },
  assignedLayoutCard: {
    gridArea: cardArea ?? 'auto',
  },
  noHover: {
    borderColor: Colors.transparent,
  },
  hoverReactive: {
    borderColor: Colors.transparent,
    '&:hover, &:focus-visible': {
      borderColor: Colors.brandSecondary300,
    },
  },
  clickity: {
    cursor: 'pointer',
  },
  nonClickity: {
    cursor: 'default',
  },
  titleText: {
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: 1,
    textAlign: 'end',
  },
  enabledTitle: {
    color: Colors.secondaryLight1000,
  },
  disabledTitle: {
    color: Colors.brandSecondary700,
  },
  heroText: {
    fontFamily: 'Asap',
    fontSize: '24px',
    lineHeight: 1,
    textAlign: 'end',
  },
  enabledHero: {
    color,
  },
  disabledHero: {
    color: Colors.brandSecondary400,
  },
  loadingHero: {
    color: Colors.brandSecondary900,
  },
}));

interface MiniDashCardProps {
  cardInfo: MiniCard;
  value: number;
  precision?: number;
  valueType?: ValueAttributes['valueType'];
  clickAction: React.Dispatch<ToggleOnClickAction> | null;
  clickState: ToggleOnClickState | null;
  tabIndex: number;
  cardArea?: string;
  dynamicColors?: DynamicColor[];
  loading: boolean;
}

export const MiniDashCard: React.FC<MiniDashCardProps> = ({
  cardInfo,
  value,
  precision = 0,
  valueType = 'number',
  clickAction,
  clickState,
  tabIndex,
  cardArea,
  dynamicColors,
  loading,
}) => {
  const defaultColor = cardInfo.config?.colorInfo?.color ?? Colors.brandSecondary900;
  const heroColor = determineSingleDynamicColor(
    dynamicColors ?? [],
    cardInfo.config?.dynamicColorId ?? '',
    value,
    defaultColor,
  );
  const { classes, cx } = useStyles({ color: heroColor, cardArea });

  const isClickable = clickAction !== null;
  const handleClick = () => {
    if (clickAction) {
      clickAction({ key: cardInfo.fieldId });
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ' /* space */) {
      handleClick();
    }
  };

  const isEnabled = clickState ? !clickState[cardInfo.fieldId] : true;
  const displayedValue = convertToDisplayString(value, precision, valueType);

  const renderText = () => {
    return (
      <>
        <Text className={cx(classes.titleText, isEnabled ? classes.enabledTitle : classes.disabledTitle)}>
          {cardInfo.title?.text ?? ''}
        </Text>
        <Text
          className={cx(classes.heroText, {
            [classes.enabledHero]: isEnabled,
            [classes.disabledHero]: !isEnabled,
            [classes.loadingHero]: loading,
          })}
        >
          {loading ? '-' : displayedValue}
        </Text>
      </>
    );
  };

  const renderStaticContent = () => {
    return (
      <div
        className={cx(
          classes.universalStyles,
          cardArea ? classes.assignedLayoutCard : classes.automaticLayoutCard,
          classes.nonClickity,
          classes.noHover,
        )}
      >
        {renderText()}
      </div>
    );
  };

  const renderClickableContent = () => {
    return (
      <WhyLabsTooltip label={`Click to ${isEnabled ? 'hide' : 'show'} category`} position="top">
        <div
          className={cx(
            classes.universalStyles,
            cardArea ? classes.assignedLayoutCard : classes.automaticLayoutCard,
            classes.clickity,
            classes.hoverReactive,
          )}
          onClick={handleClick}
          role="button"
          tabIndex={tabIndex}
          onKeyPress={handleKeyPress}
        >
          {renderText()}
        </div>
      </WhyLabsTooltip>
    );
  };

  const renderContent = (clickable: boolean) => {
    if (clickable) {
      return renderClickableContent();
    }
    return renderStaticContent();
  };

  return renderContent(isClickable);
};
