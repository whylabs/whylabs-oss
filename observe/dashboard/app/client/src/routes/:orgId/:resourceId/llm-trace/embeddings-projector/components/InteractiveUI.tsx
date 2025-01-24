import { createStyles } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  SkeletonGroup,
  WhyLabsActionIcon,
  WhyLabsButton,
  WhyLabsCloseButton,
  WhyLabsText,
} from '~/components/design-system';
import { EmbeddingsFilters } from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/components/EmbeddingsFilters';
import {
  InteractiveUiProps,
  useInteractiveUIViewModel,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/components/useInteractiveUIViewModel';
import {
  TraceEmbeddingCard,
  clickEmbeddingEvent,
  embeddingsAtom,
  getEmbeddingCardId,
  getEmbeddingContentId,
  getReadableBehavior,
  mapTraceBehaviorColors,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { filterTagNeighbors } from '~/routes/:orgId/:resourceId/llm-trace/nearestNeighborsUtils';
import { LlmTraceTagBadge } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/LlmTraceTagBadge';
import { handlePlural, upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { ParsedSecureTag, TraceItem } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { useAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import { ReactElement, useEffect, useRef, useState } from 'react';

const useStyles = createStyles({
  filterTitle: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    fontSize: 12,
    lineHeight: 2,
  },
  filterOptionLabel: {
    color: Colors.secondaryLight1000,
    fontWeight: 400,
    fontSize: 13,
    lineHeight: 1.55,
  },
  filtersFlex: {
    background: 'white',
    position: 'absolute',
    zIndex: 1,
    top: 0,
    left: 200,
    padding: '0 20px',
    width: 'calc(100% - 200px)',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  selectionNitText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 400,
    marginLeft: 'auto',
    whiteSpace: 'normal',
    minWidth: 200,
    paddingLeft: 10,
  },
  selectedEmbeddingsSection: {
    zIndex: 999,
    position: 'absolute',
    right: 12,
    background: 'white',
    boxShadow: '0px 0px 20px 0px rgba(0, 0, 0, 0.15)',
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 0px 0px 0px',
    borderRadius: 4,
    border: `1px solid ${Colors.brandSecondary200}`,
    maxHeight: 'calc(100% - 30px)',
  },
  selectedEmbeddingsContent: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    paddingBottom: 8,
    scrollbarWidth: 'thin',
  },
  selectedEmbeddingsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 35,
    paddingRight: 6,
    backgroundColor: 'white',
  },
  borderBottom: {
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
  selectedEmbeddingsFooter: {
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    padding: '10px 15px',
    backgroundColor: 'white',
    boxShadow: '0px -2px 10px -1px rgba(0, 0, 0, 0.2)',
  },
  selectedEmbeddingsHeaderTitle: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.71,
    padding: '0px 15px',
  },
  embeddingCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: '10px 15px',
    backgroundColor: 'white',
    transition: 'background 300ms ease-in-out',
  },
  highlightedBg: {
    backgroundColor: Colors.secondaryLight100,
  },
  embeddingCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  horizontalLine: {
    height: 1,
    background: Colors.brandSecondary100,
    width: '100%',
  },
  horizontalSeparator: {
    width: '100%',
    height: 1,
    background: Colors.brandSecondary200,
    zIndex: 5,
  },
  metadataTitle: {
    fontSize: 12,
    color: Colors.brandSecondary600,
    fontWeight: 600,
    lineHeight: 1.66,
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    minHeight: 20,
  },
  itemName: {
    minWidth: 100,
    width: 100,
    color: 'black',
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'end',
  },
  itemValue: {
    color: Colors.secondaryLight1000,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1,
    wordBreak: 'break-all',
  },
  traceIdValue: {
    maxWidth: 135,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'unset',
  },
  flexCenterAligned: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  buttonsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  embeddingButton: {
    padding: '5px 17px',
    fontSize: 13,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    paddingBottom: 4,
  },
  emptyViolationsMessage: {
    color: Colors.brandSecondary600,
    fontSize: 13,
    fontStyle: 'italic',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'Inconsolata, Asap',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
});

/*
 * This component wraps all the elements displayed on the embeddings projector using position absolute
 * */
export const InteractiveUI = (props: InteractiveUiProps): ReactElement => {
  const { classes, cx } = useStyles();
  const [selectedEmbeddings, setSelectedEmbeddings] = useAtom(embeddingsAtom);
  const resetSelectedEmbeddings = useResetAtom(embeddingsAtom);
  const {
    embeddingsQueries,
    unselectEmbedding,
    handleOpenInTraceView,
    copyToClipboard,
    filterTableWithSelectedEmbeddings,
    handleTagWithNeighborsClick,
    stickNeighborsDatasets,
  } = useInteractiveUIViewModel(props);

  // state to display the header border after scroll
  const [scrollAreaTop, setScrollAreaTop] = useState(0);

  const embeddingsCardsRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [selectedEmbeddingsCount, setSelectedEmbeddingsCount] = useState<number>(0);

  (() => {
    if (!selectedEmbeddings || selectedEmbeddings?.length === selectedEmbeddingsCount) return;
    if (selectedEmbeddings.length < selectedEmbeddingsCount) {
      setSelectedEmbeddingsCount(selectedEmbeddings.length);
      return;
    }
    const lastSelectedEmbedding = selectedEmbeddings[selectedEmbeddings.length - 1];
    const embeddingId = getEmbeddingCardId(lastSelectedEmbedding);
    const newCard = embeddingsCardsRef.current.get(embeddingId);
    if (newCard) {
      newCard.scrollIntoView({ behavior: 'smooth' });
      setSelectedEmbeddingsCount(selectedEmbeddings.length);
    }
  })();

  const [highlightEmbeddingCard, setHighlightEmbeddingCard] = useState<string | undefined>(undefined);

  useEffect(() => {
    const eventHandler = (e: Event) => {
      const { detail } = e as CustomEvent;
      embeddingsCardsRef.current.get(detail.id)?.scrollIntoView({ behavior: 'smooth' });
      setHighlightEmbeddingCard(() => {
        setTimeout(setHighlightEmbeddingCard, 1500);
        return detail.id;
      });
    };
    window.addEventListener(clickEmbeddingEvent, eventHandler);
    return () => {
      // reset atom on unmount
      resetSelectedEmbeddings();
      window.removeEventListener(clickEmbeddingEvent, eventHandler);
    };
  }, [resetSelectedEmbeddings, setSelectedEmbeddings]);
  const loadingFakeCard = (
    <div className={classes.embeddingCard}>
      <div className={classes.embeddingCardHeader}>
        <WhyLabsText className={classes.metadataTitle}>METADATA</WhyLabsText>
        <div className={classes.horizontalLine} />
      </div>
      <SkeletonGroup count={4} height={20} width="100%" />
      <div className={classes.embeddingCardHeader}>
        <WhyLabsText className={classes.metadataTitle}>VIOLATIONS</WhyLabsText>
        <div className={classes.horizontalLine} />
      </div>
      <SkeletonGroup count={1} height={30} width="100%" />
      <div className={classes.horizontalLine} />
      <div className={classes.buttonsContainer}>
        <SkeletonGroup count={2} height={30} width="45%" />
      </div>
    </div>
  );

  const getLegendSymbol = (type: string, color: string) => {
    if (type === 'response')
      return (
        <svg height="12" width="12" xmlns="http://www.w3.org/2000/svg">
          <rect width={12} height={12} fill={color} />
        </svg>
      );
    if (type === 'prompt')
      return (
        <svg height="12" width="12" xmlns="http://www.w3.org/2000/svg">
          <circle r={6} cx={6} cy={6} fill={color} />
        </svg>
      );
    return <></>;
  };

  const mountEmbeddingTypeCell = (embedding: TraceEmbeddingCard) => {
    const { behavior, embeddingType } = embedding;
    const behaviorName = getReadableBehavior.get(behavior) ?? behavior;
    const legendColor = mapTraceBehaviorColors.get(behavior);
    return (
      <div className={classes.flexCenterAligned}>
        {getLegendSymbol(embeddingType, legendColor ?? 'gray')}
        {upperCaseFirstLetterOnly(`${behaviorName} ${embeddingType}`)}
      </div>
    );
  };

  const renderCopiableItem = (label: string, content: string) => {
    return (
      <div className={classes.metadataItem}>
        <WhyLabsText className={classes.itemName}>{label}:</WhyLabsText>
        <div className={classes.flexCenterAligned}>
          <WhyLabsText className={cx(classes.itemValue, classes.traceIdValue)}>{content}</WhyLabsText>
          <WhyLabsActionIcon
            label={`Copy ${label}`}
            size="xs"
            tooltip="Copy"
            onClick={() => copyToClipboard(content, label)}
          >
            <IconCopy size={14} />
          </WhyLabsActionIcon>
        </div>
      </div>
    );
  };

  const renderTagsSection = (data: TraceItem, cardData: TraceEmbeddingCard) => {
    const { parsedTags } = data;
    const { tagsWithNeighbors, otherTags } =
      parsedTags?.reduce(
        (acc, curr) => {
          if (curr.name.split('.')[0] !== cardData.embeddingType) return acc;
          const foundTagNeighborsData = filterTagNeighbors(
            data,
            cardData.embeddingType,
            [curr.name],
            stickNeighborsDatasets,
          );
          if (foundTagNeighborsData?.length) {
            acc.tagsWithNeighbors.push(curr);
          } else {
            acc.otherTags.push(curr);
          }
          return acc;
        },
        { tagsWithNeighbors: [] as ParsedSecureTag[], otherTags: [] as ParsedSecureTag[] },
      ) ?? {};

    const hasViolations = !!tagsWithNeighbors?.length || !!otherTags?.length;

    return (
      <div className={classes.tagsContainer}>
        {hasViolations ? (
          <>
            {!!tagsWithNeighbors?.length && (
              <LlmTraceTagBadge
                secureTags={tagsWithNeighbors}
                tooltip="Click to toggle nearest neighbors"
                flexWrap
                onClick={(tag) => handleTagWithNeighborsClick(data, cardData, tag)}
              />
            )}
            {!!otherTags?.length && <LlmTraceTagBadge secureTags={otherTags} flexWrap />}
          </>
        ) : (
          <WhyLabsText className={classes.emptyViolationsMessage}>The embedding has no policy violations</WhyLabsText>
        )}
      </div>
    );
  };

  const renderEmbeddingCard = (cardData: TraceEmbeddingCard, data: TraceItem) => {
    const embeddingCardId = getEmbeddingCardId(cardData);
    const contentId = getEmbeddingContentId(data);
    const highlighted = highlightEmbeddingCard && embeddingCardId === highlightEmbeddingCard;
    return (
      <div className={cx(classes.embeddingCard, { [classes.highlightedBg]: highlighted })}>
        <div className={classes.embeddingCardHeader}>
          <WhyLabsText className={classes.metadataTitle}>METADATA</WhyLabsText>
          <div className={classes.horizontalLine} />
        </div>
        {renderCopiableItem('Trace ID', cardData.traceId)}
        {!!contentId && renderCopiableItem('Content ID', contentId)}
        <div className={classes.metadataItem}>
          <WhyLabsText className={classes.itemName}>Type:</WhyLabsText>
          <WhyLabsText className={classes.itemValue}>{mountEmbeddingTypeCell(cardData)}</WhyLabsText>
        </div>
        <div className={classes.metadataItem}>
          <WhyLabsText className={classes.itemName}>Latency:</WhyLabsText>
          <WhyLabsText className={classes.itemValue}>{data.latency || 'Unknown'}</WhyLabsText>
        </div>
        <div className={classes.embeddingCardHeader}>
          <WhyLabsText className={classes.metadataTitle}>VIOLATIONS</WhyLabsText>
          <div className={classes.horizontalLine} />
        </div>
        {renderTagsSection(data, cardData)}
        <div className={classes.horizontalLine} />
        <div className={classes.buttonsContainer}>
          <WhyLabsButton
            size="xs"
            className={classes.embeddingButton}
            variant="subtle"
            color="primary"
            onClick={() => unselectEmbedding(data)}
          >
            Unselect
          </WhyLabsButton>
          <WhyLabsButton
            size="xs"
            className={classes.embeddingButton}
            variant="outline"
            color="gray"
            onClick={() => handleOpenInTraceView(data)}
          >
            Open in trace view
          </WhyLabsButton>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className={classes.filtersFlex}>
        <EmbeddingsFilters />
        <WhyLabsText className={classes.selectionNitText}>Make a selection to inspect the embedding</WhyLabsText>
      </div>
      {!!selectedEmbeddings?.length && (
        <div className={classes.selectedEmbeddingsSection}>
          <div className={cx(classes.selectedEmbeddingsHeader, { [classes.borderBottom]: scrollAreaTop })}>
            <WhyLabsText className={classes.selectedEmbeddingsHeaderTitle}>
              {selectedEmbeddings.length} {handlePlural('Embedding', selectedEmbeddings.length)} Selected
            </WhyLabsText>
            <WhyLabsCloseButton
              variant="transparent"
              label="unselect all embeddings"
              onClick={resetSelectedEmbeddings}
            />
          </div>
          <div
            className={classes.selectedEmbeddingsContent}
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              if (target.scrollTop > 10 && scrollAreaTop === 0) {
                setScrollAreaTop(target.scrollTop);
              }
              if (target.scrollTop < 10 && scrollAreaTop > 0) {
                setScrollAreaTop(0);
              }
            }}
          >
            {selectedEmbeddings?.map((selectedEmbedding, i) => {
              const query = embeddingsQueries[i];
              const renderCard = () => {
                if (query.isLoading)
                  return (
                    <>
                      {!!i && <div className={classes.horizontalSeparator} />}
                      {loadingFakeCard}
                    </>
                  );
                if (!query.data)
                  return (
                    <>
                      {!!i && <div className={classes.horizontalSeparator} />}
                      <div className={classes.embeddingCard}>
                        <div className={classes.embeddingCardHeader}>
                          <WhyLabsText className={classes.metadataTitle}>Not found</WhyLabsText>
                        </div>
                      </div>
                    </>
                  );
                return (
                  <>
                    {!!i && <div className={classes.horizontalSeparator} />}
                    {renderEmbeddingCard(selectedEmbedding, query.data)}
                  </>
                );
              };
              const embeddingKey = getEmbeddingCardId(selectedEmbedding);
              return (
                <div
                  ref={(el) => embeddingsCardsRef.current.set(embeddingKey, el)}
                  className={classes.flexColumn}
                  key={`rendered-embedding-${embeddingKey}`}
                >
                  {renderCard()}
                </div>
              );
            })}
          </div>
          <div className={classes.selectedEmbeddingsFooter}>
            <WhyLabsButton variant="outline" color="gray" width="full" onClick={filterTableWithSelectedEmbeddings}>
              View related traces
            </WhyLabsButton>
          </div>
        </div>
      )}
    </>
  );
};
