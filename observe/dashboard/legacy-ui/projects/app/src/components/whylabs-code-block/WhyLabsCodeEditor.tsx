import { Button, IconButton } from '@material-ui/core';
import { Center, createStyles } from '@mantine/core';
import Prism from 'prismjs';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { tooltips } from 'strings/tooltips';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { EDITING_KEY } from 'types/navTags';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { GenericCodeEditor } from '../generic-code-editor/GenericCodeEditor';
import { useCodeBlockStyles } from './WhyLabsCodeBlock';
import DarkCodeTheme from './themes/DarkCodeTheme';
import LightCodeTheme from './themes/LightCodeTheme';

const useStyles = createStyles({
  upButton: {
    position: 'fixed',
    bottom: '3%',
    right: '3%',
    zIndex: 100,
    border: `1px solid ${Colors.white}`,
    color: Colors.white,
  },
  disabledButton: {
    color: `${Colors.white} !important`,
  },
});

export interface WhyLabsCodeEditorProps {
  code: string;
  updateConfig: (
    newCode: string | undefined,
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>,
  ) => Promise<void>;
  isLoading: boolean;
  showEdit: boolean;
  userCanEdit: boolean;
  lightMode?: boolean;
  disabledMessage?: string;
}

export default function WhyLabsCodeEditor({
  code,
  updateConfig,
  isLoading,
  showEdit,
  userCanEdit,
  lightMode = false,
  disabledMessage,
}: WhyLabsCodeEditorProps): JSX.Element {
  const { classes: codeBlockStyles, cx } = useCodeBlockStyles();
  const { classes: styles } = useStyles();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [isEdit, setIsEdit] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const { handleNavigation } = useNavLinkHandler();
  const { modelId, monitorId } = usePageTypeWithParams();

  const parentRef = useRef<HTMLDivElement>(null);
  const editorConfig = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [code, isEdit]);

  function copyToClipboard() {
    navigator.clipboard.writeText(editorConfig.current?.value ?? code).then(() =>
      enqueueSnackbar({
        title: 'Code copied!',
      }),
    );
  }

  const handleEditing = () => {
    if (monitorId) {
      handleNavigation({
        modelId,
        page: 'monitorManager',
        monitorManager: { path: 'customize-json', id: monitorId },
        setParams: [{ name: EDITING_KEY, value: 'true' }],
      });
      return;
    }
    toggleIsEdit();
  };

  const CodeTheme = lightMode ? LightCodeTheme : DarkCodeTheme;
  const showTextWithButton = !showEdit && disabledMessage;

  return (
    <CodeTheme>
      <div
        className={codeBlockStyles.root}
        style={{ borderRadius: 0 }}
        onScroll={(e) => {
          if (e.currentTarget.scrollTop > 600) {
            setShowButton(true);
          } else {
            setShowButton(false);
          }
        }}
        ref={parentRef}
      >
        {showButton && (
          <IconButton aria-label="scroll to top" className={styles.upButton} onClick={onClickScrollToTop}>
            <KeyboardArrowUpIcon />
          </IconButton>
        )}
        {!isEdit ? (
          <pre className={cx(codeBlockStyles.highlightPre, 'line-numbers')}>
            <code className="language-json">{code}</code>
          </pre>
        ) : (
          <GenericCodeEditor
            contentRef={editorConfig}
            defaultCode={code}
            isLoading={isLoading}
            uniqueKey="WhyLabsCodeEditor"
          />
        )}
        <div className={cx(showTextWithButton ? codeBlockStyles.buttonsAndText : codeBlockStyles.buttons)}>
          {!!showTextWithButton && (
            <Center>
              <WhyLabsText inherit className={codeBlockStyles.buttonText}>
                {disabledMessage}
              </WhyLabsText>
            </Center>
          )}
          <Button className={codeBlockStyles.btn} onClick={copyToClipboard}>
            COPY
          </Button>
          {!isEdit && userCanEdit && showEdit && (
            <WhyLabsTooltip label={!showEdit ? tooltips.config_coming_soon : ''}>
              <div style={!showEdit ? { cursor: 'not-allowed' } : {}}>
                <Button
                  className={codeBlockStyles.btn}
                  onClick={handleEditing}
                  classes={{ disabled: styles.disabledButton }}
                  disabled={!showEdit}
                >
                  EDIT
                </Button>
              </div>
            </WhyLabsTooltip>
          )}
          {isEdit && (
            <>
              <Button className={codeBlockStyles.btn} onClick={toggleIsEdit}>
                CANCEL
              </Button>
              <Button className={codeBlockStyles.btn} onClick={onClickSaveButton}>
                SAVE
              </Button>
            </>
          )}
        </div>
      </div>
    </CodeTheme>
  );

  function toggleIsEdit() {
    setIsEdit((prevState) => !prevState);
  }

  function onClickSaveButton() {
    updateConfig?.(editorConfig.current?.value, setIsEdit);
  }

  function onClickScrollToTop() {
    parentRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}
