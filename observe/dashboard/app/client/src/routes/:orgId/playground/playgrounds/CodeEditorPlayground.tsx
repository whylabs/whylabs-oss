import { createStyles } from '@mantine/core';
import { WhyLabsCodeEditor } from '~/components/code-editor/WhyLabsCodeEditor';
import { JSX } from 'react';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    background: 'white',
    padding: 12,
    gap: 24,
  },
});

const initialCode = `id: my-id
policy_version: 1
schema_version: 0.0.1
whylabs_dataset_id: model-150

metrics:
  - metric: prompt.sentiment.sentiment_score
    validation:
      lower_threshold: 0.0

  - metric: prompt.stats.char_count
    validation:
      upper_threshold: 200
      lower_threshold: 2

  - metric: response.sentiment.sentiment_score
    validation:
      lower_threshold: 0.8

callbacks:
  - callback: webhook.static_bearer_auth_validation_failure
    options:
      url: http://host.docker.internal:8001/failures
      auth_token: password
      include_input: true
`;

export const CodeEditorPlayground = (): JSX.Element => {
  const { classes } = useStyles();
  return (
    <div className={classes.root}>
      <WhyLabsCodeEditor code={initialCode} language="yaml" height="600px" />
    </div>
  );
};
