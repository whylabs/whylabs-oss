import { useCallback, useRef, useState } from 'react';
import { createStyles, Group } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { GenericCodeEditor } from 'components/generic-code-editor/GenericCodeEditor';
import { usePatchMonitorConfigMutation } from 'generated/graphql';
import { JSONObject } from 'types/genericTypes';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { WhyLabsButton, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { IconX } from '@tabler/icons';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { EDITING_KEY } from 'types/navTags';
import WhyLabsSubmitButton from 'components/design-system/button/WhyLabsSubmitButton';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { tooltips } from 'strings/tooltips';
import { useCustomMonitorJsonHandler } from './useCustomMonitorJsonHandler';
import { translateValidMonitorConfig } from './monitorSchemaHandlerUtils';
import { useJsonPresetCode } from './presets/useJsonPresetCode';
import { SideListSection } from './components/SideListSection';
import { AVAILABLE_PRESETS, NO_PRESET_ID } from './presets/types';
import useMonitorSchema from '../../hooks/useMonitorSchema';

const useCustomMonitorJsonConfigStyles = createStyles((z) => ({
  header: {
    display: 'flex',
    width: '100%',
    background: 'white',
    alignItems: 'center',
  },
  buttonsWrapper: {
    marginLeft: 'auto',
    marginRight: '8px',
    gap: '8px',
  },
  gradientBtn: {
    display: 'inline-block',
    background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    maxHeight: '30px',
    padding: '5px 15px',
    color: Colors.white,
    textDecoration: 'none',
    fontWeight: 600,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.5,
    fontFamily: 'Asap',
  },
  defaultsText: {
    fontFamily: 'Asap',
    fontSize: '16px',
    lineHeight: 1.5,
    fontWeight: 400,
  },
  headerLabel: {
    padding: '10px 15px',
  },
  cancelButton: {
    borderColor: Colors.brandSecondary700,
    '& .MuiButton-label': {
      color: Colors.secondaryLight1000,
      fontSize: '13px',
      fontWeight: 600,
    },
    maxHeight: '30px',
  },
  link: {
    color: Colors.linkColor,
  },
  codeEditor: {
    position: 'relative',
    display: 'flex',
    overflow: 'hidden',
    background: Colors.editorBackground,
    height: '100%',
  },
  editorContainer: {
    width: '100%',
    overflow: 'auto',
    '::-webkit-scrollbar': {
      width: '10px',
    },
    '::-webkit-scrollbar-thumb': {
      background: Colors.brandSecondary700,
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: Colors.brandSecondary900,
    },
    '::-webkit-scrollbar-track': {
      background: Colors.darkCodeBackground,
    },
  },
  sideContainer: {
    height: '100%',
    width: '45%',
    minWidth: '415px',
    margin: 0,
    background: '#F8F9FA',
  },
  errorContainer: {
    whiteSpace: 'pre-wrap',
    background: '#FFCCCC',
    wordWrap: 'break-word',
    overflow: 'auto',
    padding: '16px',
    margin: 0,
    height: '100%',
    '& div': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  closeErrorIcon: {
    width: '18px',
    cursor: 'pointer',
  },
}));

const UNIQUE_KEY = 'custom_monitor_json_config';
export const CustomMonitorJsonConfig: React.FC = () => {
  const { classes, cx } = useCustomMonitorJsonConfigStyles();
  const { passedId } = usePageTypeWithParams();
  const isNewMonitor = AVAILABLE_PRESETS.find((p) => p === passedId) || !passedId;
  useSetHtmlTitle(isNewMonitor ? 'New monitor' : 'Edit monitor');

  const { handleNavigation } = useNavLinkHandler();
  const editorConfig = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isEdit = getParam(EDITING_KEY) === 'true';
  const { isValidSchema } = useCustomMonitorJsonHandler(UNIQUE_KEY, isEdit);
  const { resourceState, resourceId } = useResourceContext();
  const { monitorSchema } = useMonitorSchema({ modelId: resourceId });
  const { handleJsonCode, displayName } = useJsonPresetCode(isEdit, resourceState);
  const defaultCode = useRef('');
  const [schemaError, setSchemaError] = useState(false);
  const [patchMonitorConfig] = usePatchMonitorConfigMutation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [prevResourceState, setPrevResourceState] = useState(resourceState);
  const backToMonitorsManager = () => {
    handleNavigation({ page: 'monitorManager', modelId: resourceId });
  };
  const backToConfigInvestigator = () => {
    handleNavigation({
      page: 'monitorManager',
      modelId: resourceId,
      monitorManager: { path: 'config-investigator', id: passedId },
    });
  };

  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const userCanManageMonitors = canManageMonitors(user);

  const handleDefaultCode = useCallback(
    (id: string) => {
      if (!isEdit || (isEdit && monitorSchema)) {
        const code = handleJsonCode(id, monitorSchema);
        defaultCode.current = code;
        if (editorConfig.current?.value) {
          editorConfig.current.value = code;
        }
        const newStatus = !isValidSchema(code);
        if (newStatus !== schemaError) setSchemaError(newStatus);
        if (isLoading) setIsLoading(false);
      }
    },
    [handleJsonCode, isEdit, isLoading, isValidSchema, monitorSchema, schemaError, setSchemaError],
  );

  if (resourceState !== prevResourceState) {
    handleDefaultCode(passedId ?? NO_PRESET_ID);
    setPrevResourceState(resourceState);
  }

  if (!defaultCode.current) {
    handleDefaultCode(passedId ?? NO_PRESET_ID);
  }

  const enqueueCustomToast = (toastText: string, variant: 'success' | 'error' | 'warning', errorText?: string) => {
    if (variant === 'error') setErrorMessage(errorText || toastText);
    const message = toastText || 'Error. Please review your configuration and try again.';
    enqueueSnackbar({
      title: message,
      variant,
    });
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const newCode = editorConfig.current?.value;
      const jsonCode: JSONObject = JSON.parse(newCode ?? '{}');
      const config = JSON.stringify(translateValidMonitorConfig(jsonCode, !isEdit));
      await patchMonitorConfig({
        variables: {
          modelId: resourceId,
          config,
        },
      });
      enqueueCustomToast(`Monitor configuration successfully ${isEdit ? 'updated' : 'created'}.`, 'success');
      backToMonitorsManager();
    } catch (err) {
      const toastMessage = `Your JSON has invalid configuration.`;
      const errorText = err.message;
      enqueueCustomToast(toastMessage, 'error', errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const onJsonChange = (content: string) => {
    if (!content) return;
    const newStatus = !isValidSchema(content);
    if (newStatus !== schemaError) setSchemaError(!isValidSchema(content));
  };

  return (
    <>
      <div className={classes.header}>
        <WhyLabsText className={cx(classes.headerLabel, classes.defaultsText)}>
          {displayName ?? 'Loading...'}
        </WhyLabsText>
        <Group className={classes.buttonsWrapper}>
          <WhyLabsButton
            variant="outline"
            color="gray"
            size="xs"
            onClick={isEdit ? backToConfigInvestigator : backToMonitorsManager}
          >
            Cancel
          </WhyLabsButton>
          <WhyLabsTooltip
            maxWidth={300}
            label={
              schemaError &&
              'Your configuration has errors. Please check the warnings and errors in the line number on the left side of your code'
            }
          >
            <WhyLabsSubmitButton
              size="xs"
              onClick={saveConfig}
              disabled={schemaError || !userCanManageMonitors}
              disabledTooltip={
                schemaError
                  ? 'Monitor config has errors. Take a look on the inline messages'
                  : tooltips.hasNoPermissionToCreateMonitor
              }
            >
              {isEdit ? 'Save changes' : 'Save new configuration'}
            </WhyLabsSubmitButton>
          </WhyLabsTooltip>
        </Group>
      </div>
      <div className={classes.codeEditor}>
        <div className={classes.editorContainer}>
          <GenericCodeEditor
            onChangeListener={onJsonChange}
            contentRef={editorConfig}
            defaultCode={defaultCode.current}
            isLoading={isLoading}
            uniqueKey={UNIQUE_KEY}
          />
        </div>
        <aside className={classes.sideContainer}>
          {errorMessage && (
            <pre className={classes.errorContainer}>
              <div>
                <strong>Errors:</strong>
                <IconX className={classes.closeErrorIcon} onClick={() => setErrorMessage(undefined)} />
              </div>
              <br />
              {errorMessage}
            </pre>
          )}
          <SideListSection applyPreset={handleDefaultCode} activePreset={passedId} />
        </aside>
      </div>
    </>
  );
};
