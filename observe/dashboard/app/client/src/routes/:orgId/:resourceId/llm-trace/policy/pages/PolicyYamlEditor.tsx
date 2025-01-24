import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

const useStyles = createStyles(() => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyItems: 'center',
  },
  iframe: {
    overflow: 'hidden',
    borderRadius: 4,
    border: `1px solid ${Colors.secondaryLight1000}`,
  },
}));

export const PolicyYamlEditor = (): ReactElement => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const flags = useFlags();

  if (!flags.policySmartEditor) {
    // Safe redirect back mechanism for users trying to access using the URL
    const url = getNavUrl({ page: 'llm-secure', llmSecure: { path: 'policy' } });
    return <Navigate to={url} />;
  }

  const getUrl = () => {
    if (window.location.host === 'hub.whylabsapp.com') {
      return 'https://secure-policy-editor.whylabsapp.com/latest/index.html';
    }
    return 'https://secure-policy-editor.development.whylabsdev.com/latest/index.html';
  };

  return (
    <div className={classes.root}>
      <iframe
        src={getUrl()}
        width="100%"
        height="100%"
        title="yaml policy editor"
        allow="clipboard-write"
        className={classes.iframe}
      />
    </div>
  );
};
