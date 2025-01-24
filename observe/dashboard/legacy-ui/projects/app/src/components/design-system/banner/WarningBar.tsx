import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';

import { IconX } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
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
      minHeight: 40,
      padding: '0px 8px 0px 15px',
    },
    content: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontFamily: 'Asap',
    },
    buttonsContainer: {
      alignItems: 'center',
      display: 'flex',
      gap: 4,
    },
    closeButton: {
      color: textColor,
      '&:hover': {
        backgroundColor: Colors.transparent,
      },
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

export const WarningBar: React.FC<WarningBarProps> = ({ button, children, color, id, onClose }) => {
  const { bgColor, textColor } = getWarningBarColors(color);
  const { classes } = useStyles(bgColor, textColor)();

  const contentId = `${id}-content`;

  const renderButtonsContainer = () => {
    if (!button && !onClose) return null;

    return (
      <div className={classes.buttonsContainer}>
        {button && (
          <WhyLabsButton
            color="gray"
            onClick={button.onClick}
            variant={color === 'info' ? 'filled' : 'outline'}
            size="xs"
          >
            {button.label}
          </WhyLabsButton>
        )}
        {onClose && (
          <WhyLabsActionIcon className={classes.closeButton} label="Close alert" onClick={onClose}>
            <IconX size={20} />
          </WhyLabsActionIcon>
        )}
      </div>
    );
  };

  return (
    <div aria-labelledby={contentId} className={classes.root} data-testid="WarningBar" id={id} role="status">
      <WhyLabsText id={contentId} inherit className={classes.content}>
        {children}
      </WhyLabsText>
      {renderButtonsContainer()}
    </div>
  );
};
