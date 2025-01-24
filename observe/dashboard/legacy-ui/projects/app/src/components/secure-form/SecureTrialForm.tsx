import { ReactElement, useRef, useState } from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useSubmitSecureTrialFormMutation } from 'generated/graphql';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsButton, WhyLabsModal, WhyLabsText, WhyLabsTextInput } from '../design-system';

const useStyles = createStyles({
  root: {
    padding: '20px 24px',
    fontFamily: 'Asap',
  },
  title: {
    fontSize: 16,
    lineHeight: 1.5,
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    fontFamily: 'Asap',
  },
  noPadding: {
    padding: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    justifyContent: 'end',
  },
  dialogConfirmButton: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.53,
    letterSpacing: '-0.13px',
    padding: '5px 17px',
    background: Colors.securedBlueGradient,
    border: 'none',
  },
  dialogButtonCancel: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.53,
    letterSpacing: '-0.13px',
    padding: '8px 17px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    padding: '25px 0',
    gap: 20,
  },
  inputMainText: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    fontFamily: 'Asap',
    lineHeight: 1.42,
    fontSize: 14,
  },
  inputSecondaryText: {
    fontWeight: 400,
  },
  smallText: {
    color: Colors.secondaryLight1000,
    fontWeight: 400,
    fontFamily: 'Asap',
    lineHeight: 1.66,
    fontSize: 12,
    paddingTop: 4,
  },
});

type SecureTrialFormProps = {
  isOpened?: boolean;
  onClose(): void;
};
export const SecureTrialForm = ({ isOpened, onClose }: SecureTrialFormProps): ReactElement => {
  const { classes } = useStyles();
  const { modelId } = usePageTypeWithParams();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const formRef = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const [errorMessage, setErrorMessage] = useState('');
  const [formMutation, { loading }] = useSubmitSecureTrialFormMutation();

  const renderInputLabel = (mainText: string, secondary?: string) => (
    <WhyLabsText className={classes.inputMainText}>
      {mainText}
      {secondary && <span className={classes.inputSecondaryText}> {secondary}</span>}
    </WhyLabsText>
  );

  const isFormInvalid = () => {
    const name = formRef.current?.get('fullName')?.value;
    if (!name) {
      setErrorMessage('Please fill the form with your name.');
      return true;
    }
    setErrorMessage('');
    return false;
  };

  const submitForm = async () => {
    if (isFormInvalid()) return;
    try {
      const response = await formMutation({
        variables: {
          form: {
            fullName: formRef.current.get('fullName')?.value ?? '',
            phone: formRef.current.get('phone')?.value ?? '',
            contactEmail: formRef.current.get('email')?.value ?? '',
            datasetId: modelId || 'N/A',
          },
        },
      });
      if (response) {
        enqueueSnackbar({
          title: 'Success! We will contact you in the next 48 hours to get your free trial set up.',
        });
        onClose();
        return;
      }
    } catch (e) {
      console.error('Error submiting LLM secure trial form ', e);
    }
    enqueueSnackbar({
      title: 'Something went wrong, please try again later.',
      variant: 'error',
    });
  };

  return (
    <WhyLabsModal
      opened={!!isOpened}
      onClose={onClose}
      centered
      classNames={{ content: classes.root, title: classes.title, header: classes.noPadding, body: classes.noPadding }}
      size="510px"
      withCloseButton={false}
      title="Request an unrestricted 14 day free trial of all Secure features"
    >
      <div className={classes.form}>
        <WhyLabsTextInput
          label={renderInputLabel('Full name', '(required)')}
          placeholder="Type your name"
          ref={(el) => formRef.current.set('fullName', el)}
          onChange={() => setErrorMessage('')}
          error={errorMessage}
        />
        <WhyLabsTextInput
          label={renderInputLabel('Phone number')}
          placeholder="Type your phone number"
          ref={(el) => formRef.current.set('phone', el)}
        />
        <div>
          <WhyLabsTextInput
            label={renderInputLabel('Contact email')}
            placeholder="Type your email"
            ref={(el) => formRef.current.set('email', el)}
          />
          <WhyLabsText className={classes.smallText}>
            Provide an alternate email from the one you’re logged in with
          </WhyLabsText>
        </div>
      </div>
      <div className={classes.buttonGroup}>
        <WhyLabsButton variant="outline" color="gray" onClick={onClose} className={classes.dialogButtonCancel}>
          Cancel
        </WhyLabsButton>
        <WhyLabsButton variant="filled" onClick={submitForm} className={classes.dialogConfirmButton} loading={loading}>
          Request a free trial
        </WhyLabsButton>
      </div>
    </WhyLabsModal>
  );
};
