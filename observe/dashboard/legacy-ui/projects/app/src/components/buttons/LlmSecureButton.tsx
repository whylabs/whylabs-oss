import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { IconShieldCheck, IconLock } from '@tabler/icons';
import { WhyLabsButton } from 'components/design-system';
import { LLM_SECURE_TAB, TRIAL_LLM_SECURE_BUTTON } from 'constants/analyticsIds';
import { useMountLlmSecureUrl } from 'hooks/useNewStackLinkHandler';

const useStyles = createStyles({
  secureButton: {
    padding: '3px 15px',
    borderRadius: '22px',
    background: Colors.securedBlueGradient,
    border: 'none',
    height: 30,
    color: Colors.brandSecondary100,
    fontFamily: "'Baloo 2'",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1,
    '&:hover': {
      opacity: 0.95,
    },
  },
  secureButtonWrapper: {
    padding: '0 10px 2px 10px',
  },
  securedButtonIcon: {
    marginLeft: 5,
  },
});

interface LlmSecureButtonProps {
  modelId: string;
  secureEnabled: boolean;
  setSecureFormOpen: (open: boolean) => void;
}

export function LlmSecureButton({ modelId, secureEnabled, setSecureFormOpen }: LlmSecureButtonProps): JSX.Element {
  const { classes } = useStyles();
  const { mountLlmTracesUrl } = useMountLlmSecureUrl();

  if (secureEnabled) {
    return (
      <div className={classes.secureButtonWrapper}>
        <WhyLabsButton
          variant="filled"
          className={classes.secureButton}
          id={LLM_SECURE_TAB}
          onClick={() => {
            window.location.href = mountLlmTracesUrl(modelId);
          }}
        >
          LLM Secure <IconShieldCheck color={Colors.white} size={16} className={classes.securedButtonIcon} />
        </WhyLabsButton>
      </div>
    );
  }
  return (
    <div className={classes.secureButtonWrapper}>
      <WhyLabsButton
        id={TRIAL_LLM_SECURE_BUTTON}
        variant="filled"
        className={classes.secureButton}
        enabledTooltip="Contact us to start a 14-day free trial of Secure"
        onClick={() => setSecureFormOpen(true)}
      >
        Get LLM Secure <IconLock color={Colors.white} size={16} className={classes.securedButtonIcon} />
      </WhyLabsButton>
    </div>
  );
}
