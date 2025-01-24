import { WhyLabsTooltip } from 'components/design-system';
import useTypographyStyles from 'styles/Typography';
import { Link, useLocation } from 'react-router-dom';
import { useCommonStyles } from 'hooks/useCommonStyles';

interface OverflowTextCellProps {
  text: string;
  link?: string;
  showOverflowTooltip?: boolean;
}

export default function OverflowTextCell({
  text,
  link,
  showOverflowTooltip = false,
}: OverflowTextCellProps): JSX.Element {
  const { classes: typography, cx } = useTypographyStyles();
  const hideTooltip = !showOverflowTooltip;
  const { classes: commonStyles } = useCommonStyles();
  const { search: searchString } = useLocation();
  function drawText() {
    return (
      <div
        className={typography.textTable}
        style={{ marginLeft: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {text}
      </div>
    );
  }

  function drawContents() {
    if (link) {
      return (
        <Link className={cx(typography.textTable, commonStyles.linkCell)} to={`${link}${searchString}`}>
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
        width: '100%',
        paddingLeft: '10px',
        paddingRight: '10px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {hideTooltip && drawContents()}
      {!hideTooltip && (
        <WhyLabsTooltip label={text} position="bottom-start">
          {drawContents()}
        </WhyLabsTooltip>
      )}
    </div>
  );
}
