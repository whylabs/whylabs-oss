import { SelectItem, createStyles } from '@mantine/core';
import { WhyLabsSelect, WhyLabsTextInput } from '~/components/design-system';
import { MembershipRole } from '~server/graphql/generated/graphql';
import { FormEvent } from 'react';

import { USER_ROLE_OPTIONS } from '../../utils/roleUtils';

export const useStyles = createStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
});

type EditUserFormProps = {
  email: string;
  formId: string;
  onChangeRole: (newRole: MembershipRole) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: MembershipRole;
};

export const EditUserForm = ({ email, formId, onChangeRole, onSubmit, value }: EditUserFormProps) => {
  const { classes } = useStyles();

  const roleOptions: SelectItem[] = USER_ROLE_OPTIONS.map((label) => ({
    label,
    value: label,
  }));

  return (
    <form className={classes.form} id={formId} onSubmit={onSubmit}>
      <WhyLabsTextInput disabled disabledTooltip="User email cannot be changed" label="Email address" value={email} />
      <WhyLabsSelect data={roleOptions} label="Role" onChange={onChangeRole} value={value} />
    </form>
  );
};
