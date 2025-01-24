import { createStyles } from '@mantine/core';
import { WhyLabsSubmitButton, WhyLabsTextInput } from '~/components/design-system';
import WhyLabsDatePicker from '~/components/design-system/datepicker/WhyLabsDatePicker';
import { addNDays } from '~/utils/dateUtils';
import { FormEvent, useState } from 'react';

export const useStyles = createStyles({
  formRow: {
    display: 'flex',
    gap: 16,
    '& small': { fontWeight: 300, fontSize: 12 },
    alignItems: 'end',
  },
  inputName: {
    width: 400,
  },
  dateInput: {
    width: 140,
  },
  submitButton: {
    marginTop: 25,
  },
});

type AccessTokenFormProps = {
  className?: string;
  isSaving: boolean;
  onSubmit: (tokenName: string, expiresAt: Date | null) => Promise<boolean>;
};

export const AccessTokenForm = ({ className, isSaving, onSubmit }: AccessTokenFormProps) => {
  const { classes } = useStyles();

  const [tokenName, setTokenName] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const tomorrow = addNDays(new Date(), 1);

  return (
    <form className={className} onSubmit={onSubmitForm}>
      <div className={classes.formRow}>
        <WhyLabsTextInput
          className={classes.inputName}
          label="Name"
          onChange={setTokenName}
          required
          value={tokenName}
        />
        <WhyLabsDatePicker
          className={classes.dateInput}
          label={
            <>
              Expires&nbsp;
              <small>optional</small>
            </>
          }
          minDate={tomorrow}
          onChange={setExpiresAt}
          value={expiresAt}
        />
        <WhyLabsSubmitButton className={classes.submitButton} disabled={!tokenName} loading={isSaving}>
          Create access token
        </WhyLabsSubmitButton>
      </div>
    </form>
  );

  function onSubmitForm(e: FormEvent) {
    e.preventDefault();

    (async () => {
      const success = await onSubmit(tokenName, expiresAt);
      if (success) {
        // Reset form
        setTokenName('');
        setExpiresAt(null);
      }
    })();
  }
};
