import { createStyles } from '@mantine/core';

const useDarkTheme = createStyles(() => ({
  root: {
    'code[class*="language-"], pre[class*="language-"]': {
      color: 'white',
      fontFamily: 'Consolas, Menlo, Monaco, source-code-pro, Courier New, monospace !important',
      fontFeatureSettings: 'normal',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      marginBottom: '0',
      MozTabSize: '4',
      OTabSize: '4',
      tabSize: 4,
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
      fontSize: '0.875rem !important',
    },
    pre: {
      background: '#011627',
    },
    'pre > code[class*="language-"]': {
      fontSize: '0.875rem !important',
    },
    'pre[class*="language-"]': {
      overflow: 'auto',
      padding: '1.3125rem',
    },
    'pre[class*="language-"]::-moz-selection': {
      background: '#27292a',
    },
    'pre[class*="language-"]::selection': {
      background: '#27292a',
    },
    'pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection': {
      textShadow: 'none',
      background: 'rgba(255, 255, 255, 0.15)',
    },
    'pre[class*="language-"]::selection, pre[class*="language-"] ::selection': {
      textShadow: 'none',
      background: 'rgba(255, 255, 255, 0.15)',
    },
    ':not(pre) > code[class*="language-"]': {
      borderRadius: '0.3em',
      background: '#cbeafb',
      color: 'inherit',
      padding: '0.15em 0.2em 0.05em',
      whiteSpace: 'normal',
    },
    '.token.attr-name': {
      color: '#addb67',
      fontStyle: 'italic',
    },
    '.token.comment': {
      color: '#809393',
    },
    '.token.string, .token.url': {
      color: '#addb67',
    },
    '.token.variable': {
      color: '#d6deeb',
    },
    '.token.number': {
      color: '#f78c6c',
    },
    '.token.builtin, .token.char, .token.constant, .token.function': {
      color: '#82aaff',
    },
    '.token.important, .token.function, .token.bold': {
      fontWeight: 600,
    },
    '.token.punctuation': {
      color: '#c792ea',
    },
    '.token.selector, .token.doctype': {
      color: '#c792ea',
      fontStyle: 'italic',
    },
    '.token.class-name': {
      color: '#ffcb8b',
    },
    '.token.tag, .token.operator, .token.keyword': {
      color: '#ffa7c4',
    },
    '.token.boolean': {
      color: '#ff5874',
    },
    '.token.property': {
      color: '#80cbc4',
    },
    '.token.namespace': {
      color: '#b2ccd6',
    },
    'pre[data-line]': {
      padding: '1em 0 1em 3em',
      position: 'relative',
    },
    '.gatsby-highlight-code-line': {
      backgroundColor: '#022a4b',
      display: 'block',
      paddingRight: '1em',
      paddingLeft: '1.25em',
      borderLeft: '0.25em solid #ffa7c4',
    },
  },
}));

type DarkCodeThemeProps = {
  children: React.ReactNode;
};

const DarkCodeTheme = ({ children }: DarkCodeThemeProps): JSX.Element => {
  const { classes } = useDarkTheme();
  return <div className={classes.root}>{children}</div>;
};

export default DarkCodeTheme;
