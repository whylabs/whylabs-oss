import { createStyles } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

import WhyLabsButton from '../button/WhyLabsButton';
import WhyLabsActionIcon from '../icon/WhyLabsActionIcon';
import WhyLabsText from '../text/WhyLabsText';

const useStyles = (backgroundColor: string, textColor: string) =>
  createStyles({
    root: {
      alignItems: 'center',
      backgroundColor,
      color: textColor,
      display: 'grid',
      gap: 8,
      gridTemplateColumns: '1fr auto',
      minHeight: 50,
      padding: '5px 8px 5px 15px',
    },
    content: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    buttonsContainer: {
      alignItems: 'center',
      display: 'flex',
      gap: 4,
    },
    button: {
      border: `1px solid ${textColor}`,
      color: textColor,
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: '20px',
      padding: '6px 12px',
      margin: '4px',
      textTransform: 'uppercase',
    },
  });

type WarningBarColor = 'warn' | 'info';

type WarningBarProps = {
  button?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
  color?: WarningBarColor;
  id: string;
  onClose?: () => void;
};

const getWarningBarColors = (color?: WarningBarColor): { bgColor: string; textColor: string } => {
  switch (color) {
    case 'info':
      return { bgColor: Colors.blue, textColor: Colors.white };
    case 'warn':
    default:
      return { bgColor: Colors.warningColor, textColor: Colors.black };
  }
};

export const WarningBar = ({ button, children, color, id, onClose }: WarningBarProps) => {
  const { bgColor, textColor } = getWarningBarColors(color);
  const { classes } = useStyles(bgColor, textColor)();

  const contentId = `${id}-content`;

  const renderButtonsContainer = () => {
    if (!button && !onClose) return null;

    return (
      <div className={classes.buttonsContainer}>
        {button && (
          <WhyLabsButton className={classes.button} onClick={button.onClick} variant="outline">
            {button.label}
          </WhyLabsButton>
        )}
        {onClose && (
          <WhyLabsActionIcon customColor={textColor} label="Close alert" onClick={onClose}>
            <IconX size={20} />
          </WhyLabsActionIcon>
        )}
      </div>
    );
  };

  return (
    <div aria-labelledby={contentId} className={classes.root} data-testid="WarningBar" id={id} role="status">
      <WhyLabsText id={contentId} inherit className={classes.content} displayTooltip>
        {children}
      </WhyLabsText>
      {renderButtonsContainer()}
    </div>
  );
};
