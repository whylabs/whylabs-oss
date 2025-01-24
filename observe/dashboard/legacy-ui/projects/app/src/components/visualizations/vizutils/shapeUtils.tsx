import { Colors } from '@whylabs/observatory-lib';
import { ScaleOrdinal } from 'd3-scale';

export type LegendShape = 'box' | 'line' | 'linedash' | 'empty' | 'circle';
export const LINE_WIDTH = 1.5;
export const STANDARD_POINT_WIDTH = 1.5;

export function renderCircle(
  xPosition: number,
  yPosition: number,
  color: string,
  filled: boolean,
  key?: string,
  radius = 3,
): JSX.Element {
  return (
    <circle
      r={radius}
      stroke={color}
      strokeWidth={1.5}
      cx={xPosition}
      cy={yPosition}
      fill={filled ? color : Colors.transparent}
      pointerEvents="none"
      key={key}
    />
  );
}

export function renderLegendItem(
  labelColor: string,
  labelText: string,
  shapeScale?: string | ScaleOrdinal<string, LegendShape>,
  shapeOverride?: LegendShape,
  height = 12,
): JSX.Element | null {
  let shape = 'line';
  if (shapeScale) {
    if (typeof shapeScale !== 'string') {
      shape = shapeScale(labelText);
    } else {
      shape = shapeScale;
    }
  }
  if (shapeOverride) {
    shape = shapeOverride;
  }

  if (!shape) {
    return null;
  }
  switch (shape) {
    case 'box':
      return (
        <svg width={12} height={height}>
          <rect fill={labelColor} width={12} height={height} />
        </svg>
      );
    case 'line':
      return (
        <svg width={12} height={height}>
          <g>
            <circle fill={labelColor} r={2.5} cx={5.5} cy={5.5} />
            <line stroke={labelColor} strokeWidth={1} x1={0} x2={11} y1={5.5} y2={5.5} />
          </g>
        </svg>
      );
    case 'linedash':
      return (
        <svg width={12} height={height}>
          <line stroke={labelColor} strokeWidth={1} x1={0} x2={11} y1={5.5} y2={5.5} strokeDasharray="2, 2" />
        </svg>
      );
    default:
      return (
        <svg width={12} height={height}>
          <rect fill={Colors.transparent} width={12} height={height} />
        </svg>
      );
  }
}
