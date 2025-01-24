import { createStyles } from '@mantine/core';
import { IconCircleX } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import { WhyLabsCodeEditor } from '~/components/code-editor/WhyLabsCodeEditor';
import { WhyLabsAlert, WhyLabsConfirmationDialog, WhyLabsDrawer, WhyLabsText } from '~/components/design-system';
import ExternalLink from '~/components/link/ExternalLink';
import { UserDefinedTags } from '~/components/tags/UserDefinedTags';
import { ReactElement } from 'react';

import { ResourceTaggingDrawerProps, useResourceTaggingDrawerViewModel } from './useResourceTaggingDrawerViewModel';

const useStyles = createStyles({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  content: {
    padding: `0 16px`,
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    flex: 1,
  },
  editorWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerBody: {
    padding: 0,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 0.93,
    color: Colors.secondaryLight1000,
  },
  subTitle: {
    color: Colors.secondaryLight900,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  link: {
    textDecoration: 'none',
    color: Colors.chartBlue,
    '&:visited': {
      color: Colors.chartBlue,
    },
  },
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 25,
    paddingTop: 25,
    paddingBottom: 10,
  },
  tagsDialogDescription: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  alertComponent: {
    color: Colors.secondaryLight1000,
  },
});

export const ResourceTaggingDrawer = ({ openState }: ResourceTaggingDrawerProps): ReactElement => {
  const { classes } = useStyles();
  const {
    orgId,
    user,
    yamlValidation,
    onCancelYamlChanges,
    onSaveTagsYaml,
    isLoadingYamlContent,
    yamlContent,
    updatedContent,
    onChangeYaml,
    isLoadingMutations,
    allowEdit,
  } = useResourceTaggingDrawerViewModel({
    openState,
  });

  const confirmationTagsModal = (
    <>
      {yamlValidation?.valid === false && (
        <WhyLabsAlert
          icon={<IconCircleX color={Colors.red} />}
          backgroundColor={Colors.lightRed}
          title="Invalid YAML. Fix the configuration according to the documentation and try again."
          className={classes.alertComponent}
        />
      )}
      <WhyLabsConfirmationDialog
        isOpen={!!yamlValidation?.droppedTagsInUse?.length && yamlValidation?.valid}
        dialogTitle="Remove resource tags?"
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={() => onCancelYamlChanges(false)}
        onConfirm={() => {
          onSaveTagsYaml(true);
        }}
        modalSize="440px"
        isLoading={isLoadingMutations}
      >
        <div className={classes.confirmDeletionDialogFlex}>
          <WhyLabsText className={classes.tagsDialogDescription}>
            Theses tags will be removed from resources tagged with them:
          </WhyLabsText>
          <UserDefinedTags
            flexWrap
            tags={
              yamlValidation?.droppedTagsInUse?.map((customTag) => ({
                customTag,
              })) ?? []
            }
          />
        </div>
      </WhyLabsConfirmationDialog>
    </>
  );

  return (
    <WhyLabsDrawer
      uniqueId="yaml-config-drawer"
      size="max(60%, 800px)"
      minWidth={400}
      isOpen={openState.value}
      onClose={onCancelYamlChanges}
      classNames={{ body: classes.drawerBody }}
      withOverlay={false}
      title={
        <WhyLabsText className={classes.drawerTitle}>
          YAML editor: Manage resource tags {user.organization?.name || orgId}
        </WhyLabsText>
      }
    >
      <div className={classes.root}>
        <div className={classes.content}>
          <WhyLabsText className={classes.subTitle}>
            Documentation and tagging examples can be found{' '}
            <ExternalLink to="resourcesTaggingDocs" className={classes.link}>
              here
            </ExternalLink>
            .
          </WhyLabsText>
          {confirmationTagsModal}
          <div className={classes.editorWrapper}>
            <WhyLabsCodeEditor
              readOnly={!allowEdit}
              language="yaml"
              code={yamlContent}
              height={`calc(100vh - 190px ${yamlValidation?.valid === false ? '- 80px' : ''})`}
              isLoading={isLoadingYamlContent}
              onChange={onChangeYaml}
              tabSize={2}
            />
          </div>
        </div>
        <ActionsBottomBar
          cancelButtonProps={{
            onClick: onCancelYamlChanges,
          }}
          submitButtonProps={{
            loading: isLoadingMutations,
            disabled: updatedContent === yamlContent || (!updatedContent && !!yamlContent) || isLoadingMutations,
            onClick: () => onSaveTagsYaml(false),
          }}
        />
      </div>
    </WhyLabsDrawer>
  );
};
