import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsConfirmationDialog, WhyLabsRadioGroup, WhyLabsText } from '~/components/design-system';
import { useCommonButtonStyles } from '~/components/design-system/button/buttonStyleUtils';
import { embeddingsAtom, encodeSpaceVersion } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { SELECTED_EMBEDDINGS_SPACE } from '~/utils/searchParamsConstants';
import { useResetAtom } from 'jotai/utils';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const useStyles = createStyles({
  root: {},
  title: {
    color: 'black',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.12,
  },
  header: {
    padding: '20px 15px 25px 15px',
  },
  body: {
    padding: '0px 15px 20px 15px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    margin: '25px 0 10px 0',
  },
  footer: {
    marginTop: 25,
  },
  text: {
    color: 'black',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  explanation: {
    fontSize: 12,
    color: Colors.brandSecondary600,
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  dataVersion: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
  },
  dataTag: {
    color: Colors.secondaryLight800,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.55,
  },
});

export const EmbeddingsVersionModal = () => {
  const { classes } = useStyles();
  const {
    classes: { gradient },
  } = useCommonButtonStyles();
  const [, setSearchParams] = useSearchParams();
  const {
    embeddingsProjector: { spaceVersionsState, selectedSpaceVersion, modalIsOpenState },
  } = useLlmSecureContext();
  const resetSelectedEmbeddings = useResetAtom(embeddingsAtom);
  const fetchedVersions = [...(spaceVersionsState.value?.values() ?? [])];
  const options = fetchedVersions?.map((v) => ({
    value: encodeSpaceVersion(v),
    label: (
      <div className={classes.flexColumn}>
        <WhyLabsText className={classes.dataVersion}>Space version: {v.dataMajorVersion || 0}</WhyLabsText>
        {v.dataTag && <WhyLabsText className={classes.dataTag}>Encoder: {v.dataTag}</WhyLabsText>}
      </div>
    ),
  }));

  const fallbackOption = (() => {
    if (selectedSpaceVersion) return encodeSpaceVersion(selectedSpaceVersion);
    return fetchedVersions?.[0] ? encodeSpaceVersion(fetchedVersions[0]) : null;
  })();
  const [radioState, setRadioState] = useState<string | null>(fallbackOption);

  const displayModal = (() => {
    if (modalIsOpenState.value === undefined) return !selectedSpaceVersion;
    return modalIsOpenState.value;
  })();

  const onCloseModal = () => {
    modalIsOpenState.setter(false);
    if (!selectedSpaceVersion && fallbackOption) setSpaceVersion(fallbackOption);
  };

  const setSpaceVersion = (value: string | null) => {
    if (!value) return;
    modalIsOpenState.setter(false);
    resetSelectedEmbeddings();
    setSearchParams((nextParams) => {
      nextParams.set(SELECTED_EMBEDDINGS_SPACE, value);
      return nextParams;
    });
  };

  return (
    <WhyLabsConfirmationDialog
      onConfirm={() => setSpaceVersion(radioState)}
      onClose={onCloseModal}
      dialogTitle="Select an embeddings space"
      confirmButtonText="Continue"
      closeButtonText="Cancel"
      isOpen={displayModal}
      modalSize={440}
      confirmVariant="primary"
      confirmButtonClass={gradient}
    >
      <div className={classes.content}>
        <WhyLabsText className={classes.text}>
          The projector can only visualize one version of embedding space at a time. The selected traces were generated
          from different versions.
        </WhyLabsText>
        <WhyLabsText className={classes.text}>
          To continue, select a version:
          <WhyLabsText className={classes.explanation}>
            You can change the selected version in the projector&apos;s header
          </WhyLabsText>
        </WhyLabsText>
        <WhyLabsRadioGroup
          marginTop={7}
          label="Space version"
          orientation="column"
          spacing={6}
          options={options ?? []}
          value={radioState || undefined}
          onChange={setRadioState}
        />
      </div>
    </WhyLabsConfirmationDialog>
  );
};
