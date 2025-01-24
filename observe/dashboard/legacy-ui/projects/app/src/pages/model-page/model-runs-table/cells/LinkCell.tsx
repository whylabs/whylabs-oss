import { TextCell } from '@whylabs/observatory-lib';
import { Link } from 'react-router-dom';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';

interface LinkCellProps {
  linkedText: string;
  link: string;
  unlinkedText?: string;
}

export default function LinkCell({ linkedText, link, unlinkedText }: LinkCellProps): JSX.Element {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  const linkOrNot = link ? (
    <Link className={cx(typography.textTable, commonStyles.linkCell)} to={link}>
      {linkedText}
    </Link>
  ) : (
    linkedText
  );

  return (
    <TextCell disableCaps>
      {linkedText.length > 0 ? (
        <span>
          {linkOrNot}
          {unlinkedText && <span>{unlinkedText}</span>}
        </span>
      ) : (
        <span className={typography.textTable}>N/a</span>
      )}
    </TextCell>
  );
}
