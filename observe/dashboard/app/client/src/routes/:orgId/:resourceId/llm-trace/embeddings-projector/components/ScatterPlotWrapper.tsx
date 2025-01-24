import { createStyles } from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { useMount } from '~/hooks/useMount';
import {
  DEFAULT_LAYOUT,
  EmbeddingsPlotlySeries,
  ProjectorInteractionsState,
  ThreeDimensionalDatum,
  clickEmbeddingEvent,
  defaultCameraCenter,
  defaultCameraEye,
  embeddingsAtom,
  getEmbeddingCardId,
  safeTranslateEmbeddingPoint,
  translateCameraCoordsToRtz,
  translateRtzToCameraCoords,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { JSONValue } from '~/types/genericTypes';
import { useAtom } from 'jotai';
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';

const ANIMATION_FPS = 24;
const LEFT_CONTROLS_WIDTH = 220;
const useStyles = createStyles({
  injectedClass: {
    '.svg-container': {
      width: '100% !important',
    },
    '& #scene': {
      width: `calc(100% - ${LEFT_CONTROLS_WIDTH}px) !important`,
      height: 'calc(100% - 50px) !important',
      top: '45px !important',
      right: '0 !important',
      left: 'unset !important',
      borderRadius: '6px 0 0 6px',
      overflow: 'hidden',
    },
    '& .legend': {
      transform: 'translate(0px, 25px)',
      '& .legendpoints .scatterpts': {
        opacity: `1 !important`,
      },
    },
    '& .modebar': {
      left: 4,
      '& .modebar-group': {
        opacity: `1 !important`,
      },
      '& .modebar-btn--logo': {
        display: 'none',
      },
      '& a[rel="tooltip"]::after': {
        right: 'unset !important',
      },
    },
  },
});

type ScatterPlotWrapperProps = {
  data: EmbeddingsPlotlySeries[];
  width: number;
  height: number;
  legendClickHandler: (seriesIndex: number) => void;
};
export const ScatterPlotWrapper = ({
  data,
  height,
  width,
  legendClickHandler,
}: ScatterPlotWrapperProps): ReactElement => {
  const { classes } = useStyles();
  const [reactiveEyeState, setReactiveEyeState] = useState<ThreeDimensionalDatum | undefined>(defaultCameraEye);
  const nonReactiveEyeState = useRef<{ eye: ThreeDimensionalDatum; center: ThreeDimensionalDatum }>({
    eye: defaultCameraEye,
    center: defaultCameraCenter,
  });
  const [interactionsState, setInteractionsState] = useState<ProjectorInteractionsState>({});
  const [selectedEmbeddings, setSelectedEmbeddings] = useAtom(embeddingsAtom);
  const onClickEmbedding = useCallback(
    ({ points }: Record<string, JSONValue>) => {
      const embedding = safeTranslateEmbeddingPoint(points);
      if (!embedding?.traceId || !embedding?.spanId) return;
      const embeddingAlreadySelected = selectedEmbeddings?.find(
        (selectedEmbedding) => getEmbeddingCardId(selectedEmbedding) === getEmbeddingCardId(embedding),
      );
      if (embeddingAlreadySelected) {
        const embeddingId = getEmbeddingCardId(embeddingAlreadySelected);
        dispatchEvent(new CustomEvent(clickEmbeddingEvent, { detail: { id: embeddingId } }));
        return;
      }
      setTimeout(() => {
        setSelectedEmbeddings((prev) => {
          if (prev?.find((prevEmbedding) => getEmbeddingCardId(embedding) === getEmbeddingCardId(prevEmbedding)))
            return prev;
          return [...(prev ?? []), embedding];
        });
        // this timeout is necessary to mitigate a Plotly bug
        // where the camera flashes because of state change
      }, 100);
    },
    [selectedEmbeddings, setSelectedEmbeddings],
  );

  const animation = () => {
    if (reactiveEyeState) {
      setReactiveEyeState((prev) => {
        if (!prev) return undefined;
        const angle = Math.PI / 720; // this is the radian equivalent for 0.25 degree
        const rtz = translateCameraCoordsToRtz(prev);
        rtz.t += angle;
        const newEye = translateRtzToCameraCoords(rtz);
        nonReactiveEyeState.current = { eye: newEye, center: defaultCameraCenter }; // sync non-reactive state
        return newEye;
      });
    }
  };
  const interval = useInterval(animation, 1000 / ANIMATION_FPS);

  const legendHoverCallback = useCallback(
    (e: Event, mouseOut: boolean) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment,
      // @ts-ignore -- that's how plotly inject the trace data in a legend
      // eslint-disable-next-line no-underscore-dangle
      const hoveredDataset = e.target ? (e.target as unknown).__data__?.[0]?.trace?.name : null;
      setInteractionsState((prev) => {
        if (mouseOut || !hoveredDataset) {
          return { ...prev, hoveredLegend: undefined };
        }
        if (prev.hoveredLegend === hoveredDataset) return prev;
        return { ...prev, hoveredLegend: hoveredDataset };
      });
    },
    [setInteractionsState],
  );

  useEffect(() => {
    setTimeout(() => {
      const legend = document.querySelectorAll('#embeddings-projector .legend g.traces');
      legend.forEach((legendItem) => {
        legendItem.addEventListener('mouseover', (e) => legendHoverCallback(e, false));
        legendItem.addEventListener('mouseout', (e) => legendHoverCallback(e, true));
      });
    }, 1000);

    return () => {
      const legend = document.querySelectorAll('#embeddings-projector .legend g.traces');
      legend.forEach((legendItem) => {
        legendItem.addEventListener('mouseover', (e) => legendHoverCallback(e, false));
        legendItem.addEventListener('mouseout', (e) => legendHoverCallback(e, true));
      });
    };
  }, [data, legendHoverCallback]);

  useMount(() => {
    const wheelListener = () => {
      interval.stop();
    };
    interval.start();
    window.addEventListener('wheel', wheelListener);
    return () => {
      interval.stop();
      window.removeEventListener('wheel', wheelListener);
    };
  });

  const usedDefaultCameraEye = (() => {
    // the reactive state is necessary to rerender the screen and make the rotation animation
    if (interval.active) return reactiveEyeState;
    /*
     * the ref object is used to store all the camera updates without trigger the rerender,
     * so when we have another dependency change like the data, it will be used to avoid resetting the camera state
     * */
    return nonReactiveEyeState.current.eye;
  })();

  const relayoutHandler = (event: Record<string, Record<string, ThreeDimensionalDatum>>) => {
    if (interval.active) {
      interval.stop();
    }
    const { eye, center } = event['scene.camera'] ?? {};
    nonReactiveEyeState.current = {
      eye: eye ?? nonReactiveEyeState.current.eye,
      center: center ?? nonReactiveEyeState.current.center,
    };
  };

  const usedData = useMemo(() => {
    return data.map((series) => {
      if (series.name !== interactionsState.hoveredLegend) return series;
      const { marker } = series;
      return {
        ...series,
        marker: marker
          ? {
              ...marker,
              opacity: Math.min(1, marker.opacity + 0.5),
              size: marker.size + 1,
            }
          : null,
      };
    });
  }, [data, interactionsState.hoveredLegend]);

  const onLegendClick = (seriesIndex: number) => {
    legendClickHandler(seriesIndex);
    return false;
  };

  return (
    <Plot
      divId="embeddings-projector"
      data={usedData}
      className={classes.injectedClass}
      onClick={onClickEmbedding}
      onRelayouting={relayoutHandler}
      onRelayout={relayoutHandler}
      onLegendClick={({ curveNumber }: { curveNumber: number }) => onLegendClick(curveNumber)}
      layout={{
        width,
        height,
        ...DEFAULT_LAYOUT,
        scene: {
          ...DEFAULT_LAYOUT.scene,
          camera: {
            eye: usedDefaultCameraEye,
            center: nonReactiveEyeState.current.center,
          },
        },
      }}
      // on
    />
  );
};
