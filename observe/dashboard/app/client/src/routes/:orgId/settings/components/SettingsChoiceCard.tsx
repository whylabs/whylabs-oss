import { WhyLabsText } from '~/components/design-system';
import { Link } from 'react-router-dom';

import { useSettingsChoiceCardStyles } from './SettingsChoiceCardStyle';

type SettingsChoiceCardProps = {
  description: string;
  link: string;
  linkText: string;
  src: string;
  title: string;
};

export const SettingsChoiceCard = ({ link, linkText, title, src, description }: SettingsChoiceCardProps) => {
  const { classes } = useSettingsChoiceCardStyles();

  return (
    <Link className={classes.cardAnchor} to={link}>
      <div className={classes.card}>
        <div className={classes.cardContent}>
          <div className={classes.title}>{title}</div>
          <div className={classes.description}>
            {/* There is no value in announcing the image in screen readers */}
            <img alt="" src={src} />
            <WhyLabsText inherit className={classes.text}>
              {description}
            </WhyLabsText>
          </div>
        </div>
        <div className={classes.cardFooter}>
          <hr className={classes.cardDivider} />
          <WhyLabsText inherit className={classes.cardFakeLink}>
            <span>{linkText}</span>
          </WhyLabsText>
        </div>
      </div>
    </Link>
  );
};
