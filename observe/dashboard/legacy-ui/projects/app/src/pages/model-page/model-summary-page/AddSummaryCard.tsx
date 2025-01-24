import { useState } from 'react';
import AddIcon from '@material-ui/icons/Add';
import { Typography, Dialog, DialogActions, DialogContent, Button } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import CloseIcon from '@material-ui/icons/Close';
import { Colors } from '@whylabs/observatory-lib';
import { CustomCard } from './SummaryCard';
import { useSummaryCardStyles } from './useModelSummaryCSS';

const useLocalStyles = createStyles({
  addCardTxt: {
    color: Colors.brandSecondary900,
    fontSize: 16,
    lineHeight: '24px',
  },
  cardAddition: {
    textAlign: 'center',
    cursor: 'default',
    padding: 0,
    '&:hover': {
      border: `2px solid ${Colors.brandSecondary400}`,
    },
  },
  cardAdditionContent: {
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 0,
    padding: 15,
    fontSize: '100%',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAdditionTxt: {
    fontSize: 12,
    lineHeight: 1,
  },

  // modal
  addCardModalContent: {
    display: 'flex',
    flexDirection: 'column',
    width: 300,
    maxHeight: 500,
    overflowY: 'auto',
  },
  addCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  addCardTitle: {
    color: Colors.secondaryLight1000,
    fontSize: 16,
    position: 'relative',
    fontWeight: 600,
    userSelct: 'none',
  },
  addCardCloseBtn: {
    color: Colors.brandSecondary600,
    cursor: 'pointer',
    background: 'none',
    border: 0,
    padding: 0,
    fontFamily: 'inherit',
    height: 24,
    width: 24,
    transform: 'translateX(3px)',
  },
  addCardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 15,
    '&:last-child': {
      marginBottom: 0,
    },
  },
  addCardButton: {
    width: 55,
    height: 30,
    background: 'none',
    fontSize: 12,
    lineHeight: '14px',
    borderColor: Colors.brandSecondary700,
    color: Colors.secondaryLight1000,
    fontWeight: 600,
  },
});
interface AddSummaryCardProps {
  cards: CustomCard[];
  showCard: (id: string) => void;
}

export default function AddSummaryCard({ cards: passedCards, showCard }: AddSummaryCardProps): JSX.Element {
  const { classes: styles, cx } = useSummaryCardStyles();
  const { classes: localStyles } = useLocalStyles();
  const [cardDialogOpened, setcardDialogOpen] = useState<boolean>(false);
  const cards = [...passedCards];
  const addedCards = cards
    .filter((card) => card.show)
    .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  const cardsToAdd = cards
    .filter((card) => !card.show)
    .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

  const AddCardItem = ({ id, show, title }: CustomCard) => (
    <div className={localStyles.addCardItem} key={`add-card-item-${id}`}>
      <Typography className={localStyles.addCardTxt}>{title}</Typography>

      <Button
        className={localStyles.addCardButton}
        onClick={() => {
          showCard(id);
          setcardDialogOpen(false);
        }}
        disabled={show}
        variant="outlined"
      >
        {show ? 'Added' : 'Add'}
      </Button>
    </div>
  );

  return (
    <div className={styles.cardWrap}>
      <div className={cx(styles.card, localStyles.cardAddition)}>
        <button
          type="button"
          className={cx(styles.cardLink, localStyles.cardAdditionContent)}
          onClick={() => setcardDialogOpen(true)}
        >
          <Typography className={localStyles.cardAdditionTxt}>
            Add widget
            <span className={styles.cardFooterIcon}>
              <AddIcon />
            </span>
          </Typography>
        </button>

        <Dialog open={cardDialogOpened} onBackdropClick={() => setcardDialogOpen(false)}>
          <DialogContent className={cx(styles.cardDialogBackground, localStyles.addCardModalContent)}>
            <div className={localStyles.addCardHeader}>
              <Typography className={localStyles.addCardTitle}>Add widgets to the dashboard</Typography>
              <button type="button" className={localStyles.addCardCloseBtn} onClick={() => setcardDialogOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            {cardsToAdd.map(AddCardItem)}
            {addedCards.map(AddCardItem)}
          </DialogContent>
          <DialogActions className={styles.cardDialogBackground}>
            <Button onClick={() => setcardDialogOpen(false)}>CANCEL</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
