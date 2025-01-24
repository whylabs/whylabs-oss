import { createStyles } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { ActionType } from '@whylabs/songbird-node-client';
import { Colors } from '~/assets/Colors';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import {
  WhyLabsActionIcon,
  WhyLabsButton,
  WhyLabsDrawer,
  WhyLabsSelect,
  WhyLabsText,
  WhyLabsTextArea,
  WhyLabsTextInput,
} from '~/components/design-system';
import { arrayOfLength } from '~/utils/arrayUtils';
import { generateFriendlyName } from '~/utils/friendlyNames';

import { useNewNotificationPageStyles } from '../notificationStyles';
import { useNotificationsViewModel } from '../useNotificationsViewModel';
import {
  HTTP_METHODS,
  SupportedWebhookMethods,
  actionSelectOptions,
  defaultWebhookBody,
  extractActionFromPayload,
} from '../utils/globalActionUtils';

const useStyles = createStyles({
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
  drawerFooter: {
    padding: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'end',
    gap: 10,
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    boxShadow: '0px 2px 10px 0px rgba(0, 0, 0, 0.50)',
  },
  closeButton: {
    padding: '8px 14px',
  },

  drawerHeader: {
    padding: '20px 20px 15px 20px',
  },
  drawerTitle: {
    color: Colors.secondaryLight1000,
    fontSize: 15,
    fontWeight: 700,
  },
  buttonActionsHeader: {
    placeSelf: 'flex-start',
    marginTop: '21.7px', // height of input label
  },
  commonInputsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
  },
  textInputs: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '14px',
  },
  inputDescription: {
    fontFamily: 'Asap',
    fontSize: 12,
    lineHeight: 1.55,
    fontWeight: 400,
    color: Colors.gray600,
  },
  webhookExtraFilds: {
    padding: '15px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  headersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  headerEntryContainer: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    width: '100%',
  },
  headerInputText: {
    flex: '1',
  },
  addHeaderButton: {
    padding: '8px 17px',
  },
  iconTrash: {
    alignSelf: 'end',
    height: 36,
    display: 'flex',
    alignItems: 'center',
  },
});

export const NotificationDrawer = () => {
  const { classes } = useStyles();
  const { classes: pageClasses } = useNewNotificationPageStyles();

  const viewModel = useNotificationsViewModel();
  const {
    defaultWebhookFields,
    editingAction,
    editingActionId,
    formRef,
    handleClose,
    headers,
    headersHandlers,
    inputsValidation,
    isCreatingNotification,
    onSubmit,
    selectedAction,
    selectedActionObject,
    selectedMethod,
    setInputsValidation,
    setSelectedAction,
    setSelectedMethod,
  } = viewModel;

  const FORM_ID = 'notifications-form';

  return (
    <WhyLabsDrawer
      uniqueId="notifications-drawer"
      size="500px"
      isOpen={!!editingActionId}
      onClose={handleClose}
      padding={0}
      classNames={{ header: classes.drawerHeader }}
      title={
        <WhyLabsText className={classes.drawerTitle}>
          {editingAction ? 'Update action' : 'Create a new action'}
        </WhyLabsText>
      }
    >
      <div className={classes.drawerBody}>
        <div className={classes.drawerContent}>
          <div className={classes.commonInputsSection}>
            <WhyLabsSelect
              data={actionSelectOptions}
              label="Type of action"
              clearable={false}
              searchable={false}
              value={selectedAction}
              onChange={(value: ActionType) => value && setSelectedAction(value)}
            />
            <WhyLabsTextInput
              defaultValue={editingAction?.id}
              label="Action ID"
              ref={(el) => formRef.current.set('id', el)}
              error={inputsValidation.id}
              disabled={!!editingAction}
              placeholder="Provide an ID"
              onChange={() => {
                if (inputsValidation.id) {
                  setInputsValidation((state) => ({ ...state, id: undefined }));
                }
              }}
              required
            />
            <div className={classes.textInputs}>
              <WhyLabsTextInput
                defaultValue={extractActionFromPayload(editingAction)}
                label={selectedActionObject?.label ?? ''}
                error={inputsValidation.action}
                placeholder={selectedActionObject?.placeholder ?? ''}
                ref={(el) => formRef.current.set('action', el)}
                required
                onChange={() => {
                  if (inputsValidation.action) {
                    setInputsValidation((state) => ({ ...state, action: undefined }));
                  }
                }}
              />
              {selectedActionObject?.bottomText && (
                <span className={classes.inputDescription}>{selectedActionObject.bottomText}</span>
              )}
            </div>
          </div>
          {selectedAction === ActionType.Webhook && (
            <div className={classes.webhookExtraFilds}>
              <WhyLabsSelect
                data={HTTP_METHODS}
                label="Method"
                clearable={false}
                searchable={false}
                value={selectedMethod}
                onChange={(value: SupportedWebhookMethods) => value && setSelectedMethod(value)}
              />
              <div className={classes.headersContainer}>
                {arrayOfLength(headers.length || 1).map((i) => {
                  // TO DO: FIX GETTING HEADERS WHEN EDITING
                  // https://app.clickup.com/t/86b2pd3cv
                  const headerId = headers?.[i] ?? generateFriendlyName();
                  const defaultHeaderValue = defaultWebhookFields?.headers?.find(
                    ({ key, value }) => `${key}-${value}` === headerId,
                  );
                  return (
                    <div className={classes.headerEntryContainer} key={`header-${headerId}`}>
                      <div className={classes.headerInputText}>
                        <WhyLabsTextInput
                          defaultValue={defaultHeaderValue?.key}
                          label="Header key"
                          hideLabel={i > 0}
                          placeholder="E.g. content-type"
                          ref={(el) => formRef.current.set(`${headerId}--key`, el)}
                        />
                      </div>
                      <div className={classes.headerInputText}>
                        <WhyLabsTextInput
                          defaultValue={defaultHeaderValue?.value}
                          label="Header value"
                          hideLabel={i > 0}
                          placeholder="E.g. application/json"
                          ref={(el) => formRef.current.set(`${headerId}--value`, el)}
                        />
                      </div>
                      {headers.length > 1 && (
                        <div className={classes.iconTrash}>
                          <WhyLabsActionIcon label="remove header field" onClick={() => headersHandlers.remove(i)}>
                            <IconTrash />
                          </WhyLabsActionIcon>
                        </div>
                      )}
                    </div>
                  );
                })}
                <WhyLabsButton
                  variant="outline"
                  className={classes.addHeaderButton}
                  color="gray"
                  onClick={() => headersHandlers.append(generateFriendlyName())}
                >
                  Add header
                </WhyLabsButton>
              </div>
              <div>
                <WhyLabsTextArea
                  className={pageClasses.codeTextArea}
                  label="Body"
                  defaultValue={editingAction ? defaultWebhookFields?.body ?? '' : defaultWebhookBody}
                  minRows={8}
                  ref={(el) => formRef.current.set('body', el)}
                />
                <span className={classes.inputDescription}>A default message is sent if no body is specified</span>
              </div>
            </div>
          )}
        </div>

        <ActionsBottomBar
          cancelButtonProps={{
            disabled: isCreatingNotification,
            onClick: handleClose,
          }}
          submitButtonProps={{
            formId: FORM_ID,
            loading: isCreatingNotification,
            onClick: onSubmit,
          }}
        />
      </div>
    </WhyLabsDrawer>
  );
};
