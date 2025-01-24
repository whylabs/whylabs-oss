import { ModelInfoForCodeHelpersFragment } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import WhyLabsCodeBlock from 'components/whylabs-code-block/WhyLabsCodeBlock';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';

export const showNoSegments = (props: ModelInfoForCodeHelpersFragment): boolean => {
  return !props.totalSegments;
};

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    color: 'black',
    fontSize: '16px',
    padding: '8px 0',
  },
  text: {
    paddingTop: '12px',
    fontSize: '16px',
    color: Colors.brandSecondary900,
  },
}));

const code = `### To segment data when logging, use the
### segments parameter in a DatasetSchema
`;
export const NoSegmentsToShow: React.FC = () => {
  const { classes } = useStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const segmentsLink = getNavUrl({ modelId, page: 'segments' });
  return (
    <div className={classes.root}>
      <span className={classes.label}>No segments to show</span>
      <WhyLabsCodeBlock key="helpers.no-segment-targeting" disableCopy code={code} language="python" />
      <span className={classes.text}>
        Access the <SafeLink href={segmentsLink}>segments page</SafeLink> to see code samples or see an example notebook
        with segments{' '}
        <SafeLink href="https://github.com/whylabs/whylogs/blob/mainline/python/examples/advanced/Segments.ipynb">
          here
        </SafeLink>
        .
      </span>
    </div>
  );
};
