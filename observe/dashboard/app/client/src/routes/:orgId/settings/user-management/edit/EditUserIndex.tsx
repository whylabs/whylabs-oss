import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import { WhyLabsDrawer, WhyLabsText } from '~/components/design-system';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';

import { EditUserForm } from './components/EditUserForm';
import { useEditUserViewModel } from './useEditUserViewModel';

const useStyles = createStyles(() => ({
  loadingContainer: {
    height: 200,
    position: 'relative',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  drawerHeader: {
    padding: '20px 20px 15px 20px',
  },
  drawerBody: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'space-between',
  },
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '0 20px',
    maxHeight: 'calc(100vh - 65px - 68px)',
    overflow: 'auto',
  },
}));

const FORM_ID = 'user-edit-form';

export const EditUserIndex = () => {
  const { classes } = useStyles();
  const viewModel = useEditUserViewModel();

  const { editingUser } = viewModel;

  const formElement = (() => {
    if (!editingUser) {
      return (
        <SimpleEmptyStateMessage
          title="User not found"
          subtitle="It looks like the user you are trying to edit does not exist"
        />
      );
    }

    return (
      <EditUserForm
        email={editingUser.email}
        formId={FORM_ID}
        onChangeRole={viewModel.onChangeRole}
        onSubmit={viewModel.onSubmit}
        value={viewModel.selectedRole}
      />
    );
  })();

  return (
    <WhyLabsDrawer
      isOpen
      onClose={viewModel.onClose}
      padding={0}
      classNames={{ header: classes.drawerHeader }}
      size="500px"
      title={<WhyLabsText className={classes.title}>Edit user</WhyLabsText>}
      uniqueId="edit-user-drawer"
    >
      <div className={classes.drawerBody}>
        <div className={classes.drawerContent}>{formElement}</div>
        <ActionsBottomBar
          cancelButtonProps={{
            disabled: viewModel.isSaving,
            onClick: viewModel.onClose,
          }}
          submitButtonProps={{
            formId: FORM_ID,
            loading: viewModel.isSaving,
            label: 'Update user',
          }}
        />
      </div>
    </WhyLabsDrawer>
  );
};
