import { createStyles, getStylesRef } from '@mantine/core';
import { IconEdit, IconTag, IconTrash } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { TABLE_ACTIONS_GROUP_STYLE_REF } from '~/components/design-system/responsive-table/tableUtils';
import { ReactNode } from 'react';

import { InvisibleButton } from '../../../misc/InvisibleButton';
import WhyLabsActionIcon, { WhyLabsActionIconProps } from '../../icon/WhyLabsActionIcon';
import GenericCell from './GenericCell';

export const useStyles = createStyles((_, { mode }: { mode: 'visibility' | 'display' }) => ({
  actionCell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  actionsGroup: {
    ref: getStylesRef(TABLE_ACTIONS_GROUP_STYLE_REF),
    display: mode === 'display' ? 'none' : 'flex',
    gap: 8,
    visibility: mode === 'display' ? 'visible' : 'hidden',
  },
  button: {
    backgroundColor: Colors.white,
    borderColor: Colors.secondaryLight300,
    color: Colors.secondaryLight1000,
    '&:hover': {
      backgroundColor: Colors.white,
      borderColor: Colors.secondaryLight300,
    },
  },
}));

type ActionType = Pick<WhyLabsActionIconProps, 'label' | 'loading' | 'onClick' | 'disabled' | 'tooltip'> & {
  type: 'delete' | 'edit' | 'tag';
};

type ActionsCellProps = {
  actions: ActionType[];
  children?: ReactNode;
  classNames?: {
    root?: string;
  };
  onClick?: () => void;
  mode?: 'visibility' | 'display';
};

const ActionsCell = ({ actions, children, classNames, onClick, mode = 'visibility' }: ActionsCellProps) => {
  const { classes } = useStyles({ mode });

  const cellContent = (
    <GenericCell rootClassName={classNames?.root}>
      <div className={classes.actionCell}>
        {children}

        <div className={classes.actionsGroup}>
          {actions.map(({ label, type, tooltip, ...rest }) => {
            const iconProps = { size: 16 };

            const iconElement = (() => {
              if (type === 'delete') return <IconTrash {...iconProps} />;
              if (type === 'tag') return <IconTag {...iconProps} />;

              return <IconEdit {...iconProps} />;
            })();

            return (
              <WhyLabsActionIcon
                className={classes.button}
                key={label}
                label={label}
                size={24}
                tooltip={tooltip || label}
                {...rest}
              >
                {iconElement}
              </WhyLabsActionIcon>
            );
          })}
        </div>
      </div>
    </GenericCell>
  );

  if (!onClick) return cellContent;

  return <InvisibleButton onClick={onClick}>{cellContent}</InvisibleButton>;
};

export default ActionsCell;
