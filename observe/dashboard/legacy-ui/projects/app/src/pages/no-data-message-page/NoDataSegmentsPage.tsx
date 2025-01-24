import { SafeLink, Colors } from '@whylabs/observatory-lib';

import { WhyLabsNoDataPage } from 'components/empty-states/WhyLabsNoDataPage';
import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useResourceText } from '../model-page/hooks/useResourceText';

const useStyles = createStyles({
  lightCode: {
    backgroundColor: Colors.brandSecondary100,
    color: Colors.chartOrange,
    fontFamily: 'Monaco',
    fontSize: '20px',
    lineHeight: '15px',
    padding: '5px 8px',
  },
});

export const NoDataSegmentsPage: React.FC = () => {
  const { classes: styles } = useStyles();
  useSetHtmlTitle('Segments');

  const segmentsNotebookExampleLink =
    'https://github.com/whylabs/whylogs/blob/mainline/python/examples/advanced/Segments.ipynb';
  const codeLeft = `### First, install the latest whylogs version:
### pip install 'whylogs'
### See all examples here:
### https://github.com/whylabs/whylogs/tree/mainline/python/examples

import whylogs as why
from whylogs.core.schema import DatasetSchema
from whylogs.core.segmentation_partition import segment_on_column

results = why.log(
  df,
  schema=DatasetSchema(segments=segment_on_column("col1"))
)
`;

  const codeRight = `### First, install the latest whylogs version:
### pip install 'whylogs'

import whylogs as why
from whylogs.core.schema import DatasetSchema
from whylogs.core.segmentation_partition import segment_on_column
from whylogs.core.segmentation_partition import SegmentFilter

filtered_segment = segment_on_column("column1")
filtered_segment['col1'].filter = SegmentFilter(
  filter_function=lambda df: df.col1=='value1' and df.col2='value2'
)
results = why.log(df, schema=DatasetSchema(segments=filtered_segment))
`;

  const title = 'No segments to show';
  const subtitle = (
    <>
      To segment data when logging, use the
      <span className={styles.lightCode}>segments</span> parameter in a{' '}
      <span className={styles.lightCode}>DatasetSchema</span>
    </>
  );
  const footer = (
    <>
      See a full segments example notebook <SafeLink primaryColor text="here" href={segmentsNotebookExampleLink} />.
    </>
  );
  const { resourceTexts } = useResourceText({
    DATA: { inputLabel: 'column' },
    MODEL: { inputLabel: 'feature' },
    LLM: { inputLabel: 'metric' },
  });

  const codeLabel = `Segmenting all values for a ${resourceTexts.inputLabel}:`;
  const secondaryCodeLabel = 'Segmenting with specific key-value pairs and filter:';

  return (
    <WhyLabsNoDataPage
      title={title}
      subtitle={subtitle}
      code={codeLeft}
      secondaryCode={codeRight}
      codeLabel={codeLabel}
      secondaryCodeLabel={secondaryCodeLabel}
      footer={footer}
    />
  );
};
