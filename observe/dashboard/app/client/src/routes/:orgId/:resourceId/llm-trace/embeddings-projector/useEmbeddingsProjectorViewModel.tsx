import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useMount } from '~/hooks/useMount';
import { useSuperGlobalDateRange } from '~/hooks/useSuperDateRange';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import {
  EmbeddingNearestNeighbor,
  EmbeddingsPlotlySeries,
  EmbeddingsSpace,
  embeddingTo3DSeries,
  embeddingsAtom,
  embeddingsFilterAtom,
  encodeSpaceVersion,
  fallback3DScatterData,
  generateNeighborMarkerAndLineSeries,
  generateNeighborSeriesId,
  getDatasetsMarkerProps,
  getTargetSpanEmbedding,
  handleEmbeddingsFilterForAPI,
  handleTextArray,
  mapDatasetColors,
  mergeSeriesChunk,
  neighborsContentCache,
  translateDataToPlotlySeries,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { useMarkedTracesSearchParams } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';
import { getAcknowledgeStatus } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/utils';
import { LoaderData } from '~/types/LoaderData';
import { NEAREST_NEIGHBORS_DATASET_QUERY_NAME } from '~/utils/searchParamsConstants';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { RouterInputs, trpc } from '~/utils/trpc';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { isValidNumber } from '~server/util/type-guards';
import { useAtom, useAtomValue } from 'jotai';
import { difference, isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderFunction, useLoaderData, useSearchParams } from 'react-router-dom';
import invariant from 'tiny-invariant';

const disableRefetch = {
  refetchOnReconnect: false,
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

const TRACE_EMBEDDINGS_CHUNK_SIZE = 1000;

type GetTraceEmbeddingsInput = RouterInputs['meta']['embeddingsProjector']['getTracesEmbeddings'];

export const loader = (({ params }) => {
  const { orgId, resourceId } = params;
  invariant(orgId, 'orgId must exist in this route');
  invariant(resourceId, 'resourceId must exist in this route');

  return { orgId, resourceId };
}) satisfies LoaderFunction;
export const useEmbeddingsProjectorViewModel = () => {
  const { orgId, resourceId } = useLoaderData() as LoaderData<typeof loader>;
  const [searchParams] = useSearchParams();
  const { handleNavigation } = useNavLinkHandler();
  const [selectedTracesData, setSelectedTracesData] = useState<{
    lastUpdatedAt: number;
    queryId: string | null;
    data: EmbeddingsPlotlySeries[];
    loadedAllChunks: boolean;
    relevantDatasets: Set<string>;
  }>({ lastUpdatedAt: 0, data: [], queryId: null, loadedAllChunks: false, relevantDatasets: new Set() });

  const [neighborsData, setNeighborsData] = useState<{
    version?: EmbeddingsSpace | null;
    data?: EmbeddingNearestNeighbor[];
  }>();

  const {
    embeddingsProjector: { spaceVersionsState, selectedSpaceVersion, displayWarningModalState },
  } = useLlmSecureContext();

  useMount(() => {
    displayWarningModalState.setter(!getAcknowledgeStatus());
  });

  if (neighborsData && !isEqual(neighborsData.version, selectedSpaceVersion)) {
    // reset neighbors data if version has changed
    setNeighborsData(undefined);
  }

  const { requestFilter } = useMarkedTracesSearchParams();

  const enableAssetsQuery =
    !!selectedTracesData.lastUpdatedAt && (spaceVersionsState.value?.size === 0 || !!selectedSpaceVersion);

  const { data: datasetsData, isLoading: loadingWhyLabsDatasetsQuery } =
    trpc.meta.embeddingsProjector.getEmbeddingsDatasets.useQuery(selectedSpaceVersion ?? {}, {
      ...disableRefetch,
      enabled: enableAssetsQuery,
    });

  const isLoadingWhylabsDatasets = loadingWhyLabsDatasetsQuery && enableAssetsQuery;

  const { dateRange } = useSuperGlobalDateRange({
    timePeriod: TimePeriod.Pt1H,
    autoAdjustTimestampsByTimePeriod: false, // traces are not grouped in buckets
  });
  const [queryOffset, setQueryOffset] = useState(0);
  const { composedFilters } = useLlmSecureContext();
  const embeddingsFilter = useAtomValue(embeddingsFilterAtom);
  const staticParams: Omit<GetTraceEmbeddingsInput, 'offset'> = {
    traceIds: requestFilter?.includedTraces ?? [],
    excludeIds: requestFilter?.excludedTraces ?? [],
    orgId,
    resourceId,
    fromTimestamp: dateRange.from,
    toTimestamp: dateRange.to,
    limit: TRACE_EMBEDDINGS_CHUNK_SIZE,
    composedFilters: composedFilters.filters,
    embeddingsFilter: { ...handleEmbeddingsFilterForAPI(embeddingsFilter), spanIds: requestFilter?.spanIds },
  };
  const {
    data: traceEmbeddingsChunk,
    isLoading: isLoadingSelectedTraces,
    dataUpdatedAt: chunkUpdatedTimestamp,
  } = trpc.meta.embeddingsProjector.getTracesEmbeddings.useQuery(
    {
      ...staticParams,
      offset: queryOffset,
    },
    { ...disableRefetch, enabled: !composedFilters.loading }, // expensive query should not be refetched
  );
  const isLoadingEmbeddingsChunks = !composedFilters.loading && isLoadingSelectedTraces;
  const queryId = JSON.stringify(staticParams);

  if (traceEmbeddingsChunk && chunkUpdatedTimestamp !== selectedTracesData.lastUpdatedAt) {
    const processedChunk = translateDataToPlotlySeries(traceEmbeddingsChunk.series);
    setSelectedTracesData((prev) => {
      const isNewQuery = queryId !== prev.queryId;
      const newData = isNewQuery ? [] : [...prev.data];
      if (!newData.length && !traceEmbeddingsChunk.series.length)
        return {
          lastUpdatedAt: chunkUpdatedTimestamp,
          data: newData,
          queryId,
          loadedAllChunks: true,
          relevantDatasets: new Set(),
        };
      const newVersions: EmbeddingsSpace[] = [];
      processedChunk.forEach((seriesChunk) => {
        const existentSeriesIndex = newData.findIndex(({ id }) => id === seriesChunk.id);
        if (existentSeriesIndex === -1) {
          newData.push(seriesChunk);
        } else {
          newData[existentSeriesIndex] = mergeSeriesChunk(newData[existentSeriesIndex], seriesChunk);
        }
        const { dataTag, dataVersion, dataMajorVersion } = seriesChunk;
        if (dataTag && isValidNumber(dataVersion) && isValidNumber(dataMajorVersion)) {
          newVersions.push({ dataTag, version: dataVersion, dataMajorVersion });
        }
      });
      newData.sort(
        (a, b) =>
          a.behavior?.localeCompare(b?.behavior ?? '') || a.embeddingType?.localeCompare(b?.embeddingType ?? '') || 0,
      );
      spaceVersionsState.setter((prevVersions) => {
        // set fetched space versions on context state to be used on the dark header component
        const newState = queryId === prev.queryId ? new Map(prevVersions) : new Map<string, EmbeddingsSpace>();
        newVersions.forEach((nv) => {
          const versionKey = encodeSpaceVersion(nv);
          const currentVersion = newState.get(versionKey);
          newState.set(versionKey, { ...nv, version: Math.max(nv.version, currentVersion?.version ?? 0) });
        });
        return newState;
      });
      const relevantDatasets = new Set(isNewQuery ? [] : prev.relevantDatasets);
      traceEmbeddingsChunk?.relevantDatasets?.forEach((dataset) => relevantDatasets.add(dataset));
      return {
        lastUpdatedAt: chunkUpdatedTimestamp,
        data: newData,
        queryId,
        loadedAllChunks: !traceEmbeddingsChunk.partial,
        relevantDatasets,
      };
    });
    if (traceEmbeddingsChunk.partial) {
      setQueryOffset((currentOffset) => traceEmbeddingsChunk.nextOffset ?? currentOffset + TRACE_EMBEDDINGS_CHUNK_SIZE);
    }
  }

  const [seriesHidden, setSeriesHidden] = useState<Set<string>>(new Set());

  const whylabsDatasetsData: EmbeddingsPlotlySeries[] = useMemo(() => {
    const embeddingsCount =
      datasetsData?.reduce((agg, [name, curr]) => {
        if (seriesHidden.has(name)) return agg;
        return agg + curr.x.length;
      }, 0) ?? 0;
    const datasets: EmbeddingsPlotlySeries[] =
      datasetsData?.map(([name, series]) => {
        const hovertemplate = `<b>${upperCaseFirstLetterOnly(name)}</b><br>${
          series?.text?.length ? '%{text}' : ''
        }<extra></extra>`;
        const color = mapDatasetColors.get(name);
        const marker = { color, ...getDatasetsMarkerProps(embeddingsCount) };
        const formatedText = handleTextArray(series?.text);
        const datasetSize = series?.x?.length;
        return {
          name: `Dataset ${name}${isValidNumber(datasetSize) ? ` (${datasetSize})` : ''}&nbsp;`,
          id: name,
          type: 'scatter3d',
          mode: 'markers',
          hovertemplate,
          marker,
          ...series,
          text: formatedText,
        } satisfies EmbeddingsPlotlySeries;
      }) ?? [];

    return datasetsData?.length ? datasets : [fallback3DScatterData];
  }, [datasetsData, seriesHidden]);

  const selectedEmbeddings = useAtomValue(embeddingsAtom);

  useEffect(() => {
    if (selectedEmbeddings === null) {
      // Clear all the neighbors when we reset the selected embeddings state
      setNeighborsData(undefined);
    }
  }, [selectedEmbeddings]);

  const removeEmbeddingsNeighbors = useCallback(
    (traceId: string, spanId: string, neighborSeriesIds: string[] | null) => {
      setNeighborsData((prev) => {
        const filteredNeighbors =
          prev?.data?.filter(
            (nnData) =>
              !(
                // neighborSeriesIds === null will remove all datasets for that trace span
                (
                  (!neighborSeriesIds || neighborSeriesIds.includes(generateNeighborSeriesId(nnData))) &&
                  nnData.targetEmbedding.traceId === traceId &&
                  nnData.targetEmbedding.spanId === spanId
                )
              ),
          ) ?? [];
        return { ...prev, data: filteredNeighbors };
      });
    },
    [],
  );

  const handleNeighborsData = useCallback(
    (nnData: EmbeddingNearestNeighbor[]) => {
      setNeighborsData((prev) => {
        return {
          version: selectedSpaceVersion,
          data: [...(prev?.data ?? []), ...nnData],
        };
      });
    },
    [selectedSpaceVersion],
  );

  const targetSpan = requestFilter?.spanIds?.length === 1 && requestFilter?.includedTraces?.length === 1;
  const { data: targetSpanDetails, isLoading: loadingTargetSpanDetails } = trpc.meta.llmTrace.describeItem.useQuery(
    { traceId: requestFilter?.includedTraces?.[0] ?? '', itemId: requestFilter?.spanIds?.[0] ?? '', resourceId, orgId },
    { enabled: targetSpan },
  );

  /*
   * Neighbors selected from a span details view
   * */
  const stickNeighborsData: EmbeddingNearestNeighbor[] = useMemo(() => {
    const neighborsDatasets = searchParams.getAll(NEAREST_NEIGHBORS_DATASET_QUERY_NAME);
    const targetEmbedding = targetSpan ? getTargetSpanEmbedding(selectedTracesData.data, requestFilter) : null;
    if (!targetEmbedding || !neighborsDatasets?.length || !targetSpanDetails?.nearestNeighborsData) return [];
    return targetSpanDetails.nearestNeighborsData.map((nnData) => {
      return {
        ...nnData,
        targetEmbedding,
      } satisfies EmbeddingNearestNeighbor;
    });
  }, [requestFilter, searchParams, selectedTracesData.data, targetSpan, targetSpanDetails?.nearestNeighborsData]);

  const [neighborsTextCache, setNeighborsTextCache] = useAtom(neighborsContentCache);

  const [neighborsPlotlySeries, activeNeighbors]: [EmbeddingsPlotlySeries[], EmbeddingNearestNeighbor[]] =
    useMemo(() => {
      const computedSeries = new Set<string>([]);
      const plotlySeries: EmbeddingsPlotlySeries[] =
        stickNeighborsData.concat(neighborsData?.data ?? []).flatMap((nnData) => {
          const nnSeriesId = generateNeighborSeriesId(nnData);
          const alreadyComputed = computedSeries.has(nnSeriesId);
          if (!alreadyComputed) computedSeries.add(nnSeriesId);
          return generateNeighborMarkerAndLineSeries({ ...nnData, showlegend: !alreadyComputed }, neighborsTextCache);
        }) ?? [];
      const activeStickNeighbors: EmbeddingNearestNeighbor[] = stickNeighborsData.map((nnData) => {
        return { ...nnData, source: 'spanView' };
      });
      const activeViolationNeighbors: EmbeddingNearestNeighbor[] = (neighborsData?.data ?? []).map((nnData) => {
        return { ...nnData, source: 'tags' };
      });
      const active = activeStickNeighbors.concat(activeViolationNeighbors);
      return [plotlySeries, active];
    }, [neighborsData?.data, neighborsTextCache, stickNeighborsData]);

  const neighborsContentCacheDelta = useMemo(
    () => activeNeighbors.flatMap(({ id }) => difference(id, [...neighborsTextCache.keys()])),
    [activeNeighbors, neighborsTextCache],
  );
  const { data: fetchedNeighborsContent } = trpc.meta.embeddingsProjector.getEmbeddingsContent.useQuery(
    { ids: neighborsContentCacheDelta },
    { enabled: !!neighborsContentCacheDelta.length },
  );

  if (fetchedNeighborsContent?.find(([uid]) => !neighborsTextCache.has(uid))) {
    setNeighborsTextCache((prevCache) => {
      const newCache = new Map(prevCache);
      fetchedNeighborsContent.forEach(([uid, text]) => {
        if (!newCache.has(uid)) newCache.set(uid, text);
      });
      return newCache;
    });
  }

  const whylabsDatasetNames = datasetsData?.map(([name]) => name) ?? [];
  /*
   * After all the embeddings chunks are loaded we may have relevant datasets based on the violations.
   * If we do, then we hide all the other ones. If we have no information about relevant, we display all.
   * */
  useDeepCompareEffect(() => {
    if (selectedTracesData.loadedAllChunks && whylabsDatasetNames.length) {
      const { relevantDatasets } = selectedTracesData;
      const nonRelevantDatasets = selectedTracesData.relevantDatasets.size
        ? whylabsDatasetNames.filter((dataset) => !relevantDatasets.has(dataset))
        : [];
      setSeriesHidden(new Set([...nonRelevantDatasets]));
    }
  }, [selectedTracesData.relevantDatasets, whylabsDatasetNames]);

  const handleLegendClick = (seriesIndex: number) => {
    setSeriesHidden((prev) => {
      const targetId = scatterPlotData?.[seriesIndex]?.id;
      if (!targetId) return prev;
      const newSet = new Set(prev);
      if (prev.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const scatterPlotData: EmbeddingsPlotlySeries[] = useMemo(() => {
    const embeddingsData = whylabsDatasetsData.concat(
      selectedTracesData.data.flatMap((traceSeries) => {
        const newSeries = {
          ...traceSeries,
          name: `${traceSeries.name} (${traceSeries.x.length})&nbsp;`,
        };
        if (!selectedSpaceVersion) return [newSeries];
        return traceSeries.dataMajorVersion === selectedSpaceVersion.dataMajorVersion &&
          traceSeries.dataTag === selectedSpaceVersion.dataTag
          ? [newSeries]
          : [];
      }),
      neighborsPlotlySeries,
    );
    selectedEmbeddings?.forEach((embedding) => {
      const series = embeddingTo3DSeries(embedding);
      embeddingsData.push(series);
    });
    return embeddingsData.map((series) =>
      seriesHidden.has(series.id) ? { ...series, visible: 'legendonly' } : series,
    );
  }, [
    neighborsPlotlySeries,
    selectedEmbeddings,
    selectedSpaceVersion,
    selectedTracesData.data,
    seriesHidden,
    whylabsDatasetsData,
  ]);

  const closeProjectorWarning = () => {
    displayWarningModalState.setter(false);
    handleNavigation({ page: 'llm-secure', llmSecure: { path: 'traces' } });
  };

  return {
    isLoadingWhylabsDatasets,
    isLoadingSelectedTraces: isLoadingEmbeddingsChunks,
    loadingTargetSpanDetails: loadingTargetSpanDetails && targetSpan,
    scatterPlotData,
    handleNeighborsData,
    handleLegendClick,
    activeNeighbors,
    removeEmbeddingsNeighbors,
    closeProjectorWarning,
  };
};
