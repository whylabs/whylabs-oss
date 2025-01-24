import {
  IconAlien,
  IconBiohazard,
  IconBox,
  IconChevronDown,
  IconCodeDots,
  IconFlag,
  IconHandThreeFingers,
  IconHistory,
  IconIndentIncrease,
  IconMessageDollar,
  IconRulerMeasure,
  IconScan,
  IconSkull,
  IconTank,
  IconTargetArrow,
  IconTelescope,
  IconUserHeart,
  IconWebhook,
} from '@tabler/icons-react';

export type KnownIcons =
  | 'alien'
  | 'flag'
  | 'ruler'
  | 'ruler-measure'
  | 'biohazard'
  | 'hand-three-fingers'
  | 'skull'
  | 'tank'
  | 'user-heart'
  | 'target-arrow'
  | 'webhook'
  | 'indent-increase'
  | 'box'
  | 'history'
  | 'chevron-down'
  | 'scan'
  | 'message-dollar'
  | 'code-dots'
  | string;

type IconFactoryProps = {
  name: KnownIcons;
  color?: string;
  size?: number;
  width?: number;
  height?: number;
};

export function generateIcon({ name, ...rest }: IconFactoryProps): JSX.Element | null {
  switch (name) {
    case 'alien':
      return <IconAlien {...rest} />;
    case 'flag':
      return <IconFlag {...rest} />;
    case 'ruler':
    case 'ruler-measure':
      return <IconRulerMeasure {...rest} />;
    case 'biohazard':
      return <IconBiohazard {...rest} />;
    case 'hand-three-fingers':
      return <IconHandThreeFingers {...rest} />;
    case 'skull':
      return <IconSkull {...rest} />;
    case 'tank':
      return <IconTank {...rest} />;
    case 'user-heart':
      return <IconUserHeart {...rest} />;
    case 'target-arrow':
      return <IconTargetArrow {...rest} />;
    case 'webhook':
      return <IconWebhook {...rest} />;
    case 'indent-increase':
      return <IconIndentIncrease {...rest} />;
    case 'box':
      return <IconBox {...rest} />;
    case 'history':
      return <IconHistory {...rest} />;
    case 'chevron-down':
      return <IconChevronDown {...rest} />;
    case 'scan':
      return <IconScan {...rest} />;
    case 'message-dollar':
      return <IconMessageDollar {...rest} />;
    case 'telescope':
      return <IconTelescope {...rest} />;
    case 'code-dots':
      return <IconCodeDots {...rest} />;
    default:
      return null;
  }
}
