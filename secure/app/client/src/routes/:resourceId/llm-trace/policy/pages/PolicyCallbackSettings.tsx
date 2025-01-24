import { createStyles } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { ReactElement } from 'react';
import { WhyLabsCodeEditor } from '~/components/code-editor/WhyLabsCodeEditor';
import { useLlmTracePolicyContext } from '~/routes/:resourceId/llm-trace/policy/LlmTracePolicyIndex';

const useStyles = createStyles(() => ({
  root: {
    width: '100%',
    height: '100%',
  },
}));

export const PolicyCallbackSettings = (): ReactElement => {
  const { height, ref } = useElementSize();
  const { setCurrentCallbackYAML, callbackSettingsYAML, hasLoadingQueries } = useLlmTracePolicyContext();
  const { classes } = useStyles();

  return (
    <div className={classes.root} ref={ref}>
      <WhyLabsCodeEditor
        readOnly={hasLoadingQueries}
        language="yaml"
        code={callbackSettingsYAML}
        onChange={setCurrentCallbackYAML}
        height={`${height}px`}
        isLoading={hasLoadingQueries}
      />
    </div>
  );
};
