import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Link } from 'react-router-dom';
import useTypographyStyles from 'styles/Typography';

const useStyles = createStyles({
  emptyState: {
    display: 'flex',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: 'Asap, sans-serif',
  },
});

interface MonitorManagerEmptyStateProps {
  modelId: string;
  userCanEdit: boolean;
}

export default function MonitorManagerEmptyState({ modelId, userCanEdit }: MonitorManagerEmptyStateProps): JSX.Element {
  const { classes: styles } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const { getNavUrl } = useNavLinkHandler();

  if (userCanEdit) {
    return (
      <div className={styles.emptyState}>
        <WhyLabsText inherit>
          No monitors for this resource. Create a monitor to get started.
          <br /> Enable monitors from{' '}
          <Link
            className={typography.link}
            to={getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'presets' } })}
          >
            presets
          </Link>{' '}
          with a single click!
        </WhyLabsText>
      </div>
    );
  }
  return (
    <div className={styles.emptyState}>
      <WhyLabsText inherit>No monitors for this resource.</WhyLabsText>
    </div>
  );
}
