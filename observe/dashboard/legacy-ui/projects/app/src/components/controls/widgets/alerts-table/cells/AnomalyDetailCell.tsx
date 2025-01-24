import ThumbDown from '@material-ui/icons/ThumbDown';
import useTypographyStyles from 'styles/Typography';
import { Link } from 'react-router-dom';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsTooltip } from 'components/design-system';

interface AnomalyDetailCellProps {
  text: string;
  tooltip?: string;
  link?: string;
  isUnhelpful?: boolean;
  showUnhelpfulIcon?: boolean;
  showOverflowTooltip?: boolean;
  width?: number;
}

export default function AnomalyDetailCell({
  text,
  link,
  isUnhelpful,
  tooltip,
  showUnhelpfulIcon = false,
  showOverflowTooltip = false,
  width,
}: AnomalyDetailCellProps): JSX.Element {
  const { classes: typography, cx } = useTypographyStyles();
  const hideTooltip = !showOverflowTooltip && !link;
  const { classes: commonStyles } = useCommonStyles();
  function drawText() {
    return (
      <div
        className={cx(isUnhelpful && typography.unhelpfulAlertText, typography.textTable, typography.overflowTextCell)}
        style={{ width }}
      >
        {text}
      </div>
    );
  }

  function drawContents() {
    if (link) {
      return (
        <Link className={cx(typography.textTable, commonStyles.linkCell)} to={link}>
          {drawText()}
        </Link>
      );
    }
    return drawText();
  }

  return (
    <div
      style={{
        height: '100%',
        width: 'fit-content',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {isUnhelpful && showUnhelpfulIcon && (
        <WhyLabsTooltip label="Marked as unhelpful">
          <ThumbDown style={{ height: '16px', width: '16px' }} />
        </WhyLabsTooltip>
      )}
      {hideTooltip && drawContents()}
      {!hideTooltip && (
        <WhyLabsTooltip
          label={tooltip || text}
          maxWidth={(width ?? 0) > 200 ? width : undefined}
          position="bottom-start"
        >
          {drawContents()}
        </WhyLabsTooltip>
      )}
    </div>
  );
}
