import { Link, useNavigate } from 'react-router-dom';
import { WhyLabsText } from 'components/design-system';
import { useSettingsChoiceCardStyles } from './SettingsChoiceCardStyle';

interface SettingsChoiceCardProps {
  link: string;
  linkText: string;
  title: string;
  src: string;
  description: string;
}

const SettingsChoiceCard: React.FC<SettingsChoiceCardProps> = ({ link, linkText, title, src, description }) => {
  const { classes: styles } = useSettingsChoiceCardStyles();
  const navigate = useNavigate();

  const changeUrl = () => {
    navigate(link);
  };
  return (
    <div onKeyDown={changeUrl} role="button" tabIndex={0} className={styles.card} onClick={changeUrl}>
      <div className={styles.cardContent}>
        <div className={styles.title}>{title}</div>
        <div className={styles.description}>
          <img src={src} alt={title} />
          <WhyLabsText inherit className={styles.text}>
            {description}
          </WhyLabsText>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <hr className={styles.cardDivider} />
        <Link className={styles.cardLink} to={link}>
          <WhyLabsText inherit className={styles.cardFooterTxt}>
            <span>{linkText}</span>
          </WhyLabsText>
        </Link>
      </div>
    </div>
  );
};

export default SettingsChoiceCard;
