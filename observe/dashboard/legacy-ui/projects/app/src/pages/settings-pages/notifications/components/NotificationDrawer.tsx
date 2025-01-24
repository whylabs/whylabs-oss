import { createStyles } from '@mantine/core';
import { ReactElement, useRef, useState } from 'react';
import {
  WhyLabsActionIcon,
  WhyLabsButton,
  WhyLabsDrawer,
  WhyLabsSelect,
  WhyLabsText,
  WhyLabsTextArea,
  WhyLabsTextInput,
} from 'components/design-system';
import { ActionDetailsFragment, ActionType, HeaderTuple } from 'generated/graphql';
import { arrayOfLength } from 'utils/arrayUtils';
import { generateFriendlyName } from 'utils/friendlyNames';
import { IconTrash } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { useListState } from '@mantine/hooks';
import { useNotificationActionRequestHandler } from './useNotificationActionRequestHandler';
import {
  ACTION_TYPES,
  ActionFormValidator,
  actionSelectOptions,
  defaultWebhookBody,
  extractActionFromPayload,
  extractExtraWebhookFieldsFromPayload,
  HTTP_METHODS,
  SupportedWebhookMethods,
  translateStringToAvailableMethod,
} from '../globalActionUtils';
import { useNewNotificationPageStyles } from '../NewNotificationsPageContentAreaStyles';

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
    fontWeight: 600,
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
type ComponentProps = {
  refetchActions: () => void;
  actionPrevData?: ActionDetailsFragment;
  isOpened: boolean;
  handleClose: () => void;
};
export const NotificationDrawer = ({
  refetchActions,
  actionPrevData,
  isOpened,
  handleClose,
}: ComponentProps): ReactElement => {
  const { classes } = useStyles();
  const { classes: pageClasses } = useNewNotificationPageStyles();

  const [selectedAction, setSelectedAction] = useState<ActionType>(
    actionPrevData?.type ?? actionSelectOptions[0]?.value,
  );
  const defaultWebhookFields = extractExtraWebhookFieldsFromPayload(actionPrevData?.payload);
  const [selectedMethod, setSelectedMethod] = useState<SupportedWebhookMethods>(
    translateStringToAvailableMethod(defaultWebhookFields?.method) ?? HTTP_METHODS[0],
  );
  const selectedActionObject = ACTION_TYPES.find(({ type }) => type === selectedAction);

  const [inputsValidation, setInputsValidation] = useState<ActionFormValidator>({});
  const { loadBlocker, createOrUpdateAction } = useNotificationActionRequestHandler({
    refetch: refetchActions,
    setInputsValidation,
  });

  const [headers, headersHandlers] = useListState<string>(
    (() => {
      if (defaultWebhookFields?.headers?.length)
        return defaultWebhookFields.headers.map(({ key, value }) => `${key}-${value}`);
      return [generateFriendlyName()];
    })(),
  );
  const formRef = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement | null>>(new Map());

  const hasInvalidForm = (id?: string, action?: string) => {
    const validationState: ActionFormValidator = {};
    if (!id) {
      validationState.id = 'Action ID is required';
    }
    if (!action) {
      validationState.action = `${selectedActionObject?.label ?? 'Action'} is required`;
    }
    setInputsValidation(validationState);
    return !!Object.keys(validationState).length;
  };

  const getValidHeaders = (): HeaderTuple[] => {
    return headers.flatMap((id) => {
      const headerKey = formRef.current.get(`${id}--key`)?.value;
      const headerValue = formRef.current.get(`${id}--value`)?.value;
      if (headerKey && headerValue) return [{ key: headerKey, value: headerValue }];
      return [];
    });
  };

  const handleCreate = async () => {
    const id = formRef.current.get('id')?.value?.trim() ?? '';
    const action = formRef.current.get('action')?.value?.trim() ?? '';
    const body = formRef.current.get('body')?.value?.trim() ?? '';
    const invalid = hasInvalidForm(id, action);
    if (invalid) return;
    const success = await createOrUpdateAction(
      {
        id,
        type: selectedAction,
        action,
        method: selectedMethod,
        headers: getValidHeaders(),
        body,
      },
      !!actionPrevData,
    );
    if (success) {
      handleClose();
    }
  };

  return (
    <WhyLabsDrawer
      uniqueId="notifications-drawer"
      size="500px"
      isOpen={isOpened}
      onClose={handleClose}
      padding={0}
      classNames={{ header: classes.drawerHeader }}
      title={
        <WhyLabsText className={classes.drawerTitle}>
          {actionPrevData ? 'Update action' : 'Create a new action'}
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
              defaultValue={actionPrevData?.id}
              label="Action ID"
              ref={(el) => formRef.current.set('id', el)}
              error={inputsValidation.id}
              disabled={!!actionPrevData}
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
                defaultValue={extractActionFromPayload(actionPrevData?.payload)}
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
                  defaultValue={actionPrevData ? defaultWebhookFields?.body ?? '' : defaultWebhookBody}
                  minRows={8}
                  ref={(el) => formRef.current.set('body', el)}
                />
                <span className={classes.inputDescription}>A default message is sent if no body is specified</span>
              </div>
            </div>
          )}
        </div>
        <footer className={classes.drawerFooter}>
          <WhyLabsButton variant="outline" className={classes.closeButton} onClick={handleClose} color="gray">
            Cancel
          </WhyLabsButton>
          <WhyLabsButton
            loading={loadBlocker}
            variant="filled"
            className={pageClasses.buttonOrangeGradient}
            onClick={handleCreate}
          >
            Save
          </WhyLabsButton>
        </footer>
      </div>
    </WhyLabsDrawer>
  );
};
