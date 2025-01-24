import { useRef } from 'react';
import { CircularProgress, TextareaAutosize } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsTooltip } from 'components/design-system';
import { GenericEditorLineInfo, GenericEditorLineInfoType, genericEditorLinesAtom } from 'atoms/genericEditorLinesAtom';
import { useRecoilState } from 'recoil';

const useCodeEditorStyles = createStyles(() => ({
  lineCounter: {
    display: 'flex',
    borderColor: 'transparent',
    overflowY: 'hidden',
    textAlign: 'right',
    boxShadow: 'none',
    color: '#959696',
    backgroundColor: Colors.editorBackground,
    position: 'absolute',
    width: '45px',
    lineHeight: '1.5',
    borderRight: '1px solid #959696',
    margin: '20px 0',
    paddingRight: '10px',
    fontSize: '14px',
    fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, Courier New, monospace',
    resize: 'none',
    outline: 'none',
  },
  textContainer: {
    display: 'flex',
    backgroundColor: Colors.editorBackground,
  },
  linesArea: {
    backgroundColor: Colors.editorBackground,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '30px',
    padding: '20px 4px',
    '& span': {
      lineHeight: 1.5,
      display: 'block',
      fontSize: '14px',
      color: '#959696',
      backgroundColor: Colors.editorBackground,
      width: '100%',
      textAlign: 'end',
      fontFamily: 'Inconsolata',
    },
  },
  lineError: {
    backgroundColor: `${Colors.brandRed2} !important`,
    color: `${Colors.editorBackground} !important`,
  },
  lineWarn: {
    backgroundColor: `${Colors.yellowLight} !important`,
    color: `${Colors.editorBackground} !important`,
  },
  lineInfo: {
    backgroundColor: `${Colors.brandSecondary300} !important`,
    color: `${Colors.editorBackground} !important`,
  },
  textarea: {
    width: '100%',
    backgroundColor: Colors.editorBackground,
    color: Colors.attrColor,
    minHeight: '300px',
    fontSize: '14px',
    resize: 'none',
    lineHeight: 1.5,
    fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, Courier New, monospace',
    border: 'none',
    outline: 'none',
    padding: '20px 0 20px 55px',
    overflow: 'auto hidden !important',
    tabSize: '4 !important',
    '::-webkit-scrollbar': {
      height: '10px',
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
  loader: {
    position: 'fixed',
    top: '35%',
    left: '50%',
  },
}));

const getLinesDefault = (code = ''): GenericEditorLineInfoType[] => {
  return Array.from(Array(code.split('\n').length), () => {
    return {};
  });
};

type CodeEditorProps = {
  contentRef: React.RefObject<HTMLTextAreaElement>;
  uniqueKey: string;
  defaultCode?: string;
  isLoading?: boolean;
  onChangeListener?: (rawCode: string) => void;
};
export const GenericCodeEditor: React.FC<CodeEditorProps> = ({
  defaultCode = '',
  isLoading = false,
  contentRef,
  onChangeListener,
  uniqueKey,
}) => {
  const { classes } = useCodeEditorStyles();
  const firstLoad = useRef(true);
  const [{ [uniqueKey]: linesState }, setLinesState] = useRecoilState(genericEditorLinesAtom);

  const getLineStyle = new Map<GenericEditorLineInfo['type'], string>([
    ['warning', classes.lineWarn],
    ['error', classes.lineError],
    ['info', classes.lineInfo],
  ]);

  const setCodeLines = (code: string) => {
    setLinesState((state) => {
      return {
        ...state,
        [uniqueKey]: getLinesDefault(code),
      };
    });
  };

  if (firstLoad.current && !linesState) {
    setCodeLines(defaultCode);
    firstLoad.current = false;
  }

  return (
    <div className={classes.textContainer}>
      {isLoading && <CircularProgress className={classes.loader} />}
      <div className={classes.linesArea}>
        {linesState?.map(({ type, textContent }, index) => {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <span key={index} className={getLineStyle.get(type) ?? ''}>
              {textContent ? (
                <WhyLabsTooltip maxWidth={400} position="right" label={textContent}>
                  {index + 1}
                </WhyLabsTooltip>
              ) : (
                <>{index + 1}</>
              )}
            </span>
          );
        })}
      </div>
      <TextareaAutosize
        wrap="off"
        defaultValue={defaultCode}
        className={classes.textarea}
        ref={contentRef}
        onKeyDown={(e) => {
          const { key } = e;
          const { value, selectionStart, selectionEnd } = e.currentTarget;
          if (key === 'Tab') {
            e.preventDefault();
            e.currentTarget.value = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
            e.currentTarget.setSelectionRange(selectionStart + 2, selectionStart + 1);
          }
        }}
        onInput={(e) => {
          const content = e?.currentTarget.value ?? '';
          if (onChangeListener) {
            onChangeListener(content);
          } else {
            setCodeLines(content);
          }
        }}
        spellCheck={false}
      />
    </div>
  );
};
