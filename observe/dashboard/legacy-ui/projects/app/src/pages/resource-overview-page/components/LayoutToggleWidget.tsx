import { createStyles, Button, getStylesRef } from '@mantine/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';
import { VIEW_TYPE } from 'types/navTags';
import { IconLayoutGrid, IconTable } from '@tabler/icons';
import { ApolloError } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { LayoutType, asLayoutTypeOrDefault } from '../layoutHelpers';

const useWidgetStyles = createStyles({
  labelBase: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: '14px',
    marginRight: 8,
    lineHeight: '1.5',
    color: Colors.brandSecondary900,
  },
  layoutSwitch: {
    paddingTop: '10px',
    display: 'flex',
    width: 'max-content',
    flexDirection: 'column',
    gap: 5,
    height: '100%',
    justifyContent: 'center',
  },
  layoutSwitchLightBackground: {
    padding: '0 20px',
    height: '100%',
  },
  layoutIconButtonBase: {
    minWidth: 0,
    padding: 0,
    borderRadius: 4,
  },
  layoutIconButtonOnDark: {
    color: Colors.brandSecondary800,
    '&:hover': {
      backgroundColor: Colors.secondaryLight1000,
      color: Colors.white,
    },
  },
  layoutIconButtonOnLight: {
    color: Colors.brandSecondary600,
    '&:hover': {
      backgroundColor: Colors.contrastTableRow,
      color: Colors.brandSecondary800,
    },
  },
  layoutIconButtonActive: {
    color: Colors.brandPrimary200,
    '&:hover': {
      color: Colors.brandPrimary100,
    },
  },
  layoutIconButtonActiveOnLight: {
    color: Colors.chartPrimary,
    backgroundColor: Colors.brandPrimary100,
    border: `1px solid ${Colors.chartPrimary}`,
    '&:hover': {
      backgroundColor: Colors.brandPrimary100,
      color: Colors.brandPrimary800,
    },
  },
  controlButton: {
    transitionDuration: '100ms',
    padding: '8px !important',
    '&:active': {
      transform: 'none',
    },
  },
  activeButton: {
    backgroundColor: `${Colors.brandPrimary600}`,
    border: `1px solid ${Colors.brandPrimary700}`,
    [`& .${getStylesRef('icon')}`]: {
      stroke: `${Colors.white} !important`,
    },
    '&:hover': {
      backgroundColor: `${Colors.brandPrimary600}`,
      border: `1px solid ${Colors.brandPrimary700}`,
    },
  },
  buttonIcon: {
    ref: getStylesRef('icon'),
    color: Colors.brandSecondary700,
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    backgroundColor: Colors.white,
  },
  resourceButtonWrapper: {
    paddingLeft: 10,
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    height: '100%',
    justifyContent: 'center',
    marginLeft: 15,
  },
  noBorderLeft: {
    borderLeft: `1px solid ${Colors.brandPrimary600}`,
  },
  noBorderRight: {
    borderRight: `1px solid ${Colors.brandPrimary600}`,
  },
});

interface LayoutToggleWidgetProps {
  addResourcesButton?: boolean;
  addResource: () => void;
  error: ApolloError | undefined;
  userCanManageDatasets: boolean;
}

export const LayoutToggleWidget: React.FC<LayoutToggleWidgetProps> = ({
  addResourcesButton,
  addResource,
  error,
  userCanManageDatasets,
}) => {
  const { classes: styles, cx } = useWidgetStyles();
  const [searchParams, setSearchParams] = useSearchParams();
  const layoutType = asLayoutTypeOrDefault(searchParams.get(VIEW_TYPE));

  const switchLayout = (newLayout: LayoutType) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(VIEW_TYPE, newLayout);
      return nextSearchParams;
    });
  };

  const renderButton = () => {
    if (!userCanManageDatasets || error) {
      return null;
    }

    return (
      <div className={styles.rightColumn}>
        <WhyLabsButton variant="outline" width="full" color="gray" onClick={addResource} id="create-new-resource">
          New resource
        </WhyLabsButton>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {addResourcesButton && renderButton()}
      <div className={cx(styles.layoutSwitch, styles.layoutSwitchLightBackground)}>
        <WhyLabsText className={styles.labelBase}>
          Layout <HtmlTooltip tooltipContent="Switch between dashboard and table layout" />
        </WhyLabsText>
        <Button.Group>
          <WhyLabsButton
            className={cx(styles.controlButton, {
              [cx(styles.activeButton, styles.noBorderRight)]: layoutType === 'card',
            })}
            onClick={() => {
              switchLayout('card');
            }}
            variant="outline"
            color="gray"
            aria-label="Card layout"
          >
            <IconLayoutGrid className={styles.buttonIcon} size={18} stroke={2} />
          </WhyLabsButton>
          <WhyLabsButton
            className={cx(styles.controlButton, {
              [cx(styles.activeButton, styles.noBorderLeft)]: layoutType === 'table',
            })}
            onClick={() => {
              switchLayout('table');
            }}
            variant="outline"
            color="gray"
            aria-label="Table layout"
          >
            <IconTable className={styles.buttonIcon} size={18} stroke={2} />
          </WhyLabsButton>
        </Button.Group>
      </div>
    </div>
  );
};
