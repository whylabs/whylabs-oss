import { EmbeddingType, SpanBehaviorType } from '@whylabs/data-service-node-client';
import { Colors } from '~/assets/Colors';
import { GenericFlexColumnSelectItemData } from '~/components/design-system';
import { JSONValue } from '~/types/genericTypes';
import { arrayOfLength } from '~/utils/arrayUtils';
import { stringMax, upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { RouterOutputs } from '~/utils/trpc';
import { isNumber, isObject } from '~/utils/typeGuards';
import { EmbeddingsSeries, TracesEmbeddingsSeries } from '~server/services/data/songbird/api-wrappers/embeddings';
import { TraceItem } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { NearestNeighborData } from '~server/trpc/meta/llm-trace/utils/llmTraceUtils';
import { isValidNumber } from '~server/util/type-guards';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { isString } from 'lodash';
import LogRocket from 'logrocket';

export interface ProjectorInteractionsState {
  hoveredLegend?: string;
}
export const neighborsContentCache = atom<Map<string, string>>(new Map());

export interface TraceEmbeddingCard {
  spanId: string;
  traceId: string;
  pcaCoords: number[];
  embeddingType: string; // prompt | response
  behavior: string; // block | flag | observe
}

export type EmbeddingNearestNeighbor = NearestNeighborData & {
  targetEmbedding: TraceEmbeddingCard;
  showlegend?: boolean;
};

export const embeddingsAtom = atomWithReset<TraceEmbeddingCard[] | null>(null);

export interface TraceEmbeddingsFilter {
  embeddingType: EmbeddingType | 'ALL' | null; // prompt | response
  behaviorType: SpanBehaviorType | 'ALL' | null; // block | flag | observe
  tags: string[] | null;
}
export const embeddingsFilterAtom = atomWithReset<TraceEmbeddingsFilter>({
  embeddingType: null,
  behaviorType: null,
  tags: null,
});

export const handleEmbeddingsFilterForAPI = ({ embeddingType, behaviorType, tags }: TraceEmbeddingsFilter) => ({
  embeddingType: embeddingType === 'ALL' ? null : embeddingType,
  behaviorType: behaviorType === 'ALL' ? null : behaviorType,
  tags,
});
export const EMBEDDING_TYPE_OPTIONS: GenericFlexColumnSelectItemData[] = [
  {
    label: 'Prompts',
    value: EmbeddingType.Prompt,
  },
  {
    label: 'Response',
    value: EmbeddingType.Response,
  },
  {
    label: 'All',
    value: 'ALL',
  },
];

export const mapStringToEmbeddingType = new Map<string, EmbeddingType>([
  ['prompt', EmbeddingType.Prompt],
  ['response', EmbeddingType.Response],
]);

export const BEHAVIOR_TYPE_OPTIONS: GenericFlexColumnSelectItemData[] = [
  {
    label: 'Observed',
    value: SpanBehaviorType.Observe,
  },
  {
    label: 'Flagged',
    value: SpanBehaviorType.Flag,
  },
  {
    label: 'Blocked',
    value: SpanBehaviorType.Block,
  },
  {
    label: 'All',
    value: 'ALL',
  },
];

export const TRACES_DATASET_NAME = 'selected_traces';

const COMMON_AXIS_CONFIG = {
  spikethickness: 1,
  spikecolor: Colors.brandPrimary700,
  gridcolor: 'white',
  autorange: true,
  color: 'white',
  gridwidth: 3,
  backgroundcolor: Colors.secondaryLight100,
  showbackground: true,
  tickfont: { color: Colors.brandPrimary900, family: 'Asap' },
};

export const DEFAULT_LAYOUT = {
  scene: {
    xaxis: COMMON_AXIS_CONFIG,
    yaxis: COMMON_AXIS_CONFIG,
    zaxis: COMMON_AXIS_CONFIG,
  },
  font: {
    family: 'Asap',
    color: Colors.secondaryLight1000,
    weight: 500,
    size: 12,
  },
  hoverlabel: {
    bgcolor: '#fff',
    align: 'left',
    bordercolor: Colors.secondaryLight900,
  },
  legend: {
    borderwidth: 16,
    bordercolor: 'white',
    indentation: -10,
    itemsizing: 'constant',
    title: {
      text: 'EMBEDDINGS',
      font: {
        weight: 600,
        size: 12,
        family: 'Asap',
      },
    },
    font: {
      family: 'Asap',
    },
  },
};

export type EmbeddingsScatterMarker = {
  color?: string;
  opacity: number;
  size: number;
  symbol?: 'circle' | 'circle-open' | 'cross' | 'diamond' | 'diamond-open' | 'square' | 'square-open' | 'x';
};

type EmbeddingsScatterLine = {
  color?: string;
  width: number;
  dash?: 'dash' | 'dashdot' | 'dot' | 'longdash' | 'longdashdot' | 'solid';
};

export type EmbeddingsPlotlySeries = Pick<TracesEmbeddingsSeries, 'x' | 'y' | 'z'> &
  Partial<TracesEmbeddingsSeries> & {
    name: string;
    id: string;
    type: 'scatter3d';
    mode: 'markers' | string;
    line?: EmbeddingsScatterLine;
    marker?: EmbeddingsScatterMarker;
    hovertemplate?: string;
    embeddingType?: string; // prompt | response
    text?: EmbeddingsSeries['text'];
    showlegend?: boolean;
    hoverinfo?: string;
    visible?: false | true | 'legendonly';
    // used by nearest neighbors series
    isNearestNeighbor?: boolean;
  };

export const TOOLTIP_MAX_LINE_LENGTH = 60;
export const handleTextArray = (texts?: string[] | null) =>
  texts?.map((text) =>
    // this should be handled by backend
    stringMax(
      arrayOfLength(Math.ceil(text.length / TOOLTIP_MAX_LINE_LENGTH))
        .map((i) => text.substring(i * TOOLTIP_MAX_LINE_LENGTH, i * TOOLTIP_MAX_LINE_LENGTH + TOOLTIP_MAX_LINE_LENGTH))
        .join('<br>'),
      1500,
    ),
  );

export const safeTranslateEmbeddingPoint = (points: JSONValue): TraceEmbeddingCard | null => {
  const point = Array.isArray(points) ? points[0] : null;
  if (!isObject(point) || Array.isArray(point)) return null;
  const pointNumber = Number(point?.pointNumber);
  const pointData = point.data;
  if (!isObject(pointData) || Array.isArray(pointData) || pointData.isNearestNeighbor) return null;
  const pcaCoords = (() => {
    const coords: number[] = [];
    const addCoords = (coordsArray: JSONValue) => {
      const possibleCoords = Array.isArray(coordsArray) ? coordsArray[pointNumber] : null;
      if (isNumber(possibleCoords)) coords.push(possibleCoords);
    };
    addCoords(pointData.x);
    addCoords(pointData.y);
    addCoords(pointData.z);
    return coords;
  })();
  const spanId = Array.isArray(pointData.spanId) ? pointData.spanId[pointNumber] : pointData.spanId;
  const traceId = Array.isArray(pointData.traceId) ? pointData.traceId[pointNumber] : pointData.traceId;
  return {
    spanId: isString(spanId) ? spanId : '',
    traceId: isString(traceId) ? traceId : '',
    pcaCoords,
    behavior: isString(pointData.behavior) ? pointData.behavior : '',
    embeddingType: isString(pointData.embeddingType) ? pointData.embeddingType : '',
  };
};

export const fallback3DScatterData: EmbeddingsPlotlySeries = {
  // this object is necessary to render the empty 3D space while loading backend data
  mode: 'markers',
  type: 'scatter3d',
  name: 'Embeddings',
  id: 'fallback',
  x: [-1, 1],
  y: [-1, 1],
  z: [-1, 1],
  marker: {
    color: 'transparent',
    size: 0,
    opacity: 0,
  },
  showlegend: false,
};

export const mapDatasetColors = new Map<string, string>([
  ['medical', '#8fbc2b'],
  ['code', '#f46a9b'],
  ['hate', '#666565'],
  ['injection', '#bd7ebe'],
  ['financial', '#8bd3c7'],
  ['toxic', '#7c1158'],
  ['innocuous', '#00b7c7'],
  ['harmful', '#83baff'],
]);

export const mapTraceBehaviorColors = new Map<string, string>([
  ['observe', Colors.chartBlue],
  ['observed', Colors.chartBlue],
  ['flag', Colors.chartOrange],
  ['flagged', Colors.chartOrange],
  ['block', Colors.red],
  ['blocked', Colors.red],
]);

export const getReadableBehavior = new Map<string, string>([
  ['observe', 'observed'],
  ['flag', 'flagged'],
  ['block', 'blocked'],
]);

export const getEmbeddingCardId = (embedding: TraceEmbeddingCard): string => {
  const { spanId, embeddingType, traceId } = embedding;
  return `${embeddingType}:${spanId}:${traceId}`;
};

export const getTraceMarkerProps = (type?: string | null, behavior?: string | null): EmbeddingsScatterMarker => {
  const color = mapTraceBehaviorColors.get(behavior ?? '') ?? 'gray';
  const symbol = type === 'prompt' ? 'circle' : 'square';
  return {
    size: 6,
    opacity: 0.8,
    color,
    symbol,
  };
};

export const mountTraceEmbeddingTooltip = (type?: string | null, behavior: string | null = '') => {
  const readableBehavior = getReadableBehavior.get(behavior ?? '') ?? behavior;
  return (
    `<b>${upperCaseFirstLetterOnly(readableBehavior ?? '')}</b><br>` +
    `${upperCaseFirstLetterOnly(`${type || 'Trace'} embedding`)}<br>` +
    `<span style="font-size: 12px; color: ${Colors.secondaryLight700}">Click to inspect</span>` +
    `<extra></extra>`
  );
};

export const translateCameraCoordsToRtz = ({ x, y, z }: { x: number; y: number; z: number }) => {
  return {
    // using Pythagorean theorem to calculate the motion circle radius vector
    r: Math.sqrt(x * x + y * y),
    // calculate the tangent of y/x in radians.
    t: Math.atan2(y, x),
    // Z is constant because we are rotating horizontally
    z,
  };
};

export const translateRtzToCameraCoords = ({ r, t, z }: { r: number; t: number; z: number }) => {
  return {
    x: r * Math.cos(t),
    y: r * Math.sin(t),
    z,
  };
};

export type ThreeDimensionalSeries = { x: number[]; y: number[]; z: number[] };
export type ThreeDimensionalDatum = { x: number; y: number; z: number };

export const defaultCameraEye: ThreeDimensionalDatum = {
  x: 0.8,
  y: 0.8,
  z: 0.5,
};

export const defaultCameraCenter: ThreeDimensionalDatum = {
  x: 0,
  y: 0,
  z: 0,
};
export type TraceEmbeddingsResponse = RouterOutputs['meta']['embeddingsProjector']['getTracesEmbeddings'];

export const translateDataToPlotlySeries = (chunkData: TraceEmbeddingsResponse['series']) => {
  return (
    chunkData.map(([chunkName, series]) => {
      const { type: embeddingType, behavior, spanId, dataTag, dataMajorVersion, ...rest } = series;
      const hovertemplate = mountTraceEmbeddingTooltip(embeddingType, behavior);
      const marker = getTraceMarkerProps(embeddingType, behavior);
      const readableBehavior = getReadableBehavior.get(behavior) ?? behavior;
      const groupName = `${readableBehavior || 'Selected'} ${embeddingType || 'traces'}`;

      return {
        name: upperCaseFirstLetterOnly(groupName),
        id: `${groupName}#${dataTag}#${dataMajorVersion}`,
        type: 'scatter3d',
        mode: 'markers',
        hovertemplate,
        marker,
        behavior,
        embeddingType,
        spanId,
        dataTag,
        dataMajorVersion,
        ...rest,
      } satisfies EmbeddingsPlotlySeries;
    }) ?? []
  );
};

export const mergeSeriesChunk = (
  prevSeries: EmbeddingsPlotlySeries,
  newSeriesChunk: EmbeddingsPlotlySeries,
): EmbeddingsPlotlySeries => {
  // we have to make sure that both series are the same group before merge
  const newSpanIds = (prevSeries?.spanId ?? []).concat(newSeriesChunk.spanId ?? []);
  return {
    ...prevSeries,
    x: prevSeries.x.concat(newSeriesChunk.x),
    y: prevSeries.y.concat(newSeriesChunk.y),
    z: prevSeries.z.concat(newSeriesChunk.z),
    traceId: (prevSeries?.traceId ?? []).concat(newSeriesChunk.traceId ?? []),
    spanId: newSpanIds,
  };
};

export const clickEmbeddingEvent = 'clickSelectedEmbedding';

export const embeddingTo3DSeries = (embedding: TraceEmbeddingCard): EmbeddingsPlotlySeries => {
  const { embeddingType, behavior, pcaCoords, spanId, traceId } = embedding;
  const hovertemplate = mountTraceEmbeddingTooltip(embeddingType, behavior);
  const marker = getTraceMarkerProps(embeddingType);
  const [x, y, z] = pcaCoords;
  // legend will be hidden, so we can simply add each embedding as a series here
  return {
    name: 'hidden label',
    id: 'hidden',
    type: 'scatter3d',
    mode: 'markers',
    marker,
    hovertemplate,
    x: [x],
    y: [y],
    z: [z],
    spanId: [spanId],
    traceId: [traceId],
    behavior,
    embeddingType,
    showlegend: false,
  };
};

export const getEmbeddingContentId = (data: TraceItem): string | null => {
  let contentId: string | null = null;
  try {
    data.contents.forEach((details) => {
      if (contentId) return;
      const detailsContent = details.content;
      if (!isObject(detailsContent) || Array.isArray(detailsContent)) return;
      const secureMetrics = detailsContent['whylabs.secure.metrics'];
      if (!isObject(secureMetrics) || Array.isArray(secureMetrics)) return;
      if ('id' in secureMetrics && isString(secureMetrics.id)) {
        contentId = secureMetrics.id;
      }
    });
  } catch (e) {
    LogRocket.log(data.contents, `failed to parse embedding content id ${JSON.stringify(e)}`);
  }
  return contentId;
};

export const getDatasetsMarkerProps = (count: number, type?: string | null): EmbeddingsScatterMarker => {
  const symbol = type === 'response' ? 'square' : 'circle';
  if (count <= 4_000) {
    return { opacity: 0.7, size: 2.5, symbol };
  }
  if (count <= 12_000) {
    return { opacity: 0.35, size: 2.5, symbol };
  }
  if (count <= 50_000) {
    return { opacity: 0.3, size: 2, symbol };
  }
  if (count <= 100_000) {
    return { opacity: 0.4, size: 1.2, symbol };
  }
  return { opacity: 0.25, size: 1, symbol };
};

export type EmbeddingsSpace = { dataTag: string; version: number; dataMajorVersion: number };

const versionParamSeparator = '::';
export const encodeSpaceVersion = ({ dataTag, dataMajorVersion }: EmbeddingsSpace) =>
  `${dataTag}${versionParamSeparator}${dataMajorVersion}`;
export const decodeSpaceVersion = (versionString: string): { dataTag: string; dataMajorVersion: number } | null => {
  const separatorIndex = versionString.lastIndexOf(versionParamSeparator);
  const dataTag = versionString.substring(0, separatorIndex);
  const dataMajorVersion = versionString.substring(separatorIndex + versionParamSeparator.length);
  if (!dataTag || !isValidNumber(Number(dataMajorVersion))) return null;
  return { dataTag, dataMajorVersion: Number(dataMajorVersion) };
};

export const generateNeighborSeriesId = ({ dataset, type }: EmbeddingNearestNeighbor) => `${dataset}.neighbors-${type}`;

export const generateNeighborMarkerAndLineSeries = (
  nnData: EmbeddingNearestNeighbor,
  neighborsTextCache: Map<string, string>,
): EmbeddingsPlotlySeries[] => {
  const { type, dataset, id, targetEmbedding, showlegend } = nnData;
  const color = mapDatasetColors.get(dataset);
  const marker = { ...getTraceMarkerProps(type), color };
  const hovertemplate = `<b>${upperCaseFirstLetterOnly(dataset)} neighbor</b><br>%{text}<extra></extra>`;
  const { pcaCoords: embeddingCoords, spanId, traceId } = targetEmbedding;
  const neighborSeriesId = generateNeighborSeriesId(nnData);
  const commonProps = {
    type: 'scatter3d',
    id: neighborSeriesId,
    traceId: [traceId],
    spanId: [spanId],
    isNearestNeighbor: true,
  } satisfies Partial<EmbeddingsPlotlySeries>;
  const lineSeries: EmbeddingsPlotlySeries[] = nnData.id.map((nnId, i) => {
    const lineId = `${dataset}.neighbors-${spanId}-${type}-${nnId}-line`;
    return {
      ...commonProps,
      name: lineId,
      mode: 'lines',
      x: [nnData.x[i], embeddingCoords[0]],
      y: [nnData.y[i], embeddingCoords[1]],
      z: [nnData.z[i], embeddingCoords[2]],
      showlegend: false,
      hoverinfo: 'skip',
      line: {
        dash: 'dash',
        color,
        width: 2,
      },
    };
  });
  const contents = id.map((embeddingId, index) =>
    neighborsTextCache.has(embeddingId) ? neighborsTextCache.get(embeddingId) || `#${embeddingId}` : 'Loading...',
  );
  return [
    {
      ...nnData,
      ...commonProps,
      name: upperCaseFirstLetterOnly(`${dataset} ${type} neighbors`),
      mode: 'markers',
      text: handleTextArray(contents),
      marker,
      hovertemplate,
      showlegend,
    },
    ...lineSeries,
  ];
};

export const getTargetSpanEmbedding = (
  series: EmbeddingsPlotlySeries[],
  filter: { includedTraces?: string[]; spanIds?: string[] },
): EmbeddingNearestNeighbor['targetEmbedding'] | null => {
  const fetchedSpan = series[0];
  if (
    fetchedSpan?.spanId?.[0] &&
    fetchedSpan?.traceId?.[0] &&
    fetchedSpan.traceId[0] === filter?.includedTraces?.[0] &&
    fetchedSpan.spanId[0] === filter?.spanIds?.[0]
  ) {
    return {
      spanId: fetchedSpan.spanId[0],
      traceId: fetchedSpan.traceId[0],
      embeddingType: fetchedSpan.embeddingType ?? 'prompt',
      behavior: fetchedSpan.behavior ?? 'observe',
      pcaCoords: [fetchedSpan.x[0], fetchedSpan.y[0], fetchedSpan.z[0]],
    };
  }
  return null;
};
