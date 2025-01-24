import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import { WhyLabsDrawer, WhyLabsLoadingOverlay, WhyLabsText } from '~/components/design-system';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';

import { ResourceForm } from './components/ResourceForm';
import { UseAddEditResourceViewModelProps, useAddEditResourceViewModel } from './useAddEditResourceViewModel';

const useStyles = createStyles(() => ({
  loadingContainer: {
    height: 200,
    position: 'relative',
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  title: {
    color: Colors.secondaryLight1000,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.5,
  },
}));

const FORM_ID = 'resource-form';

export const AddEditResource = (props: UseAddEditResourceViewModelProps) => {
  const { classes } = useStyles();
  const viewModel = useAddEditResourceViewModel(props);

  const { resourceId } = viewModel;

  const drawerTitle = (() => {
    if (viewModel.isEditing) return `Edit ${resourceId}`;
    return 'Create a new resource';
  })();

  const formElement = (() => {
    if (viewModel.isLoading) {
      return (
        <div className={classes.loadingContainer}>
          <WhyLabsLoadingOverlay visible />
        </div>
      );
    }

    if (viewModel.notFoundResource) {
      return (
        <SimpleEmptyStateMessage
          title={`${resourceId} not found`}
          subtitle="It looks like the resource you are trying to edit does not exist"
        />
      );
    }

    return <ResourceForm formId={FORM_ID} {...viewModel} />;
  })();

  return (
    <WhyLabsDrawer
      isOpen={viewModel.isOpen}
      lockScroll={false}
      onClose={viewModel.onClose}
      padding="lg"
      size={360}
      title={<WhyLabsText className={classes.title}>{drawerTitle}</WhyLabsText>}
      uniqueId="add-edit-resource"
      withOverlay={false}
    >
      {formElement}
      <ActionsBottomBar
        cancelButtonProps={{
          disabled: viewModel.isSaving,
          onClick: viewModel.onClose,
        }}
        className={classes.bottomToolbar}
        submitButtonProps={{
          disabled: viewModel.isFormDisabled,
          formId: FORM_ID,
          loading: viewModel.isSaving,
        }}
      />
    </WhyLabsDrawer>
  );
};
