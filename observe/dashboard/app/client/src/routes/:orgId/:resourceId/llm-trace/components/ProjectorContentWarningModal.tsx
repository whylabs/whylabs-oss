import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsCheckboxGroup, WhyLabsConfirmationDialog, WhyLabsText } from '~/components/design-system';
import { useCommonButtonStyles } from '~/components/design-system/button/buttonStyleUtils';
import ExternalLink from '~/components/link/ExternalLink';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { setAcknowledgeWarningAccepted } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { ReactElement, useState } from 'react';

const useStyles = createStyles({
  title: {
    color: 'black',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.12,
  },
  header: {
    padding: '20px 15px 25px 15px',
  },
  body: {
    padding: '0px 15px 20px 15px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    margin: '25px 0 10px 0',
  },
  text: {
    color: 'black',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.57,
  },
  boldText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.57,
  },
  bulletList: {
    margin: 0,
    paddingLeft: 25,
  },
  checkbox: {
    marginTop: 25,
  },
  checkboxLabel: {
    color: Colors.llmTraceBadgesBackground.trace,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
  },
});

type ProjectorContentWarningModalProps = {
  onCancel?: () => void;
  onAccept?: () => void;
  avoidDismiss?: boolean;
};
export const ProjectorContentWarningModal = ({
  onCancel,
  onAccept,
  avoidDismiss,
}: ProjectorContentWarningModalProps): ReactElement => {
  const { classes } = useStyles();
  const {
    classes: { gradient },
  } = useCommonButtonStyles();

  const {
    embeddingsProjector: { displayWarningModalState },
  } = useLlmSecureContext();

  const onConfirmModal = () => {
    setAcknowledgeWarningAccepted();
    displayWarningModalState.setter(false);
    onAccept?.();
  };

  const onCancelModal = () => {
    displayWarningModalState.setter(false);
    onCancel?.();
  };

  const checkboxLabel = (
    <WhyLabsText className={classes.checkboxLabel}>
      I have read and agree to the above and the full <ExternalLink to="termsOfUse">Terms of Use</ExternalLink>.
    </WhyLabsText>
  );

  const [checkboxSelected, setCheckboxSelected] = useState<boolean>(false);

  return (
    <WhyLabsConfirmationDialog
      onConfirm={onConfirmModal}
      onClose={onCancelModal}
      dialogTitle="Content advisory"
      confirmButtonText="Continue"
      closeButtonText="Cancel"
      isOpen={displayWarningModalState.value}
      modalSize={530}
      confirmVariant="primary"
      confirmButtonClass={gradient}
      disabledConfirmButton={!checkboxSelected}
      avoidDismiss={avoidDismiss}
    >
      <div className={classes.content}>
        <WhyLabsText className={classes.boldText}>By proceeding, you acknowledge:</WhyLabsText>
        <ul className={classes.bulletList}>
          <li>
            <WhyLabsText className={classes.text}>
              The following content may be offensive, hateful, or inappropriate.
            </WhyLabsText>
          </li>
          <li>
            <WhyLabsText className={classes.text}>
              You access this content at your own risk and can stop viewing at any time.
            </WhyLabsText>
          </li>
          <li>
            <WhyLabsText className={classes.text}>
              You are at least 18 years old or of legal age in your jurisdiction.
            </WhyLabsText>
          </li>
          <li>
            <WhyLabsText className={classes.text}>
              Datasets are provided by WhyLabs for debugging and technical analysis only.
            </WhyLabsText>
          </li>
        </ul>
        <div className={classes.checkbox}>
          <WhyLabsCheckboxGroup
            label="acknowledge checkbox"
            hideLabel
            value={checkboxSelected ? ['true'] : []}
            onChange={(value) => setCheckboxSelected(value[0] === 'true')}
            options={[{ label: checkboxLabel, value: 'true' }]}
          />
        </div>
      </div>
    </WhyLabsConfirmationDialog>
  );
};
