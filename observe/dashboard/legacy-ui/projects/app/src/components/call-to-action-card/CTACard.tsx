import { IconArrowNarrowRight } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { useCTAStyles } from './CTAStyles';

type CTACardProps = {
  title: string;
  description?: string;
  onClick: () => void;
};
export const CTACard: React.FC<CTACardProps> = ({ title, description, onClick }) => {
  const { classes } = useCTAStyles();
  return (
    <button className={classes.cardContainer} onClick={onClick} type="button">
      <div className={classes.textWrapper}>
        <span className={classes.cardTitle}>{title}</span>
        {description && <span className={classes.cardDescription}>{description}</span>}
      </div>
      <IconArrowNarrowRight size={24} color={Colors.brandSecondary700} style={{ margin: '0 auto' }} />
    </button>
  );
};
