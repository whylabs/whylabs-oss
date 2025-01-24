import { Fade, makeStyles, Modal, Typography } from '@material-ui/core';
import React, { useContext, useState } from 'react';
import { Colors } from '../../constants/colors';

const modalFadeDuration = 1000;
const modalHeight = 520;

const useStyles = makeStyles((theme) => ({
  backdrop: {
    backgroundColor: `${Colors.brandSecondary900} !important`,
    opacity: '80%',
  },
  header: {
    height: 63,
    width: '100%',
    display: 'flex',
    padding: '20px 15px 20px 15px',
    backgroundColor: Colors.brandSecondary100,
  },
  container: {
    outline: 'none',
    borderRadius: 10,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    overflow: 'hidden',
    width: 900,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  closeButton: {
    marginLeft: 'auto',
    cursor: 'pointer',
  },
  root: {
    height: modalHeight,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: Colors.whiteBackground,
    position: 'relative',

    '& ul': {
      listStyle: 'none',
      paddingLeft: 20,
    },

    '& li': {
      paddingLeft: '1em',
      paddingTop: 4,
      textIndent: '-1.5em',
    },
    '& li:before': {
      content: `"• "`,
      marginRight: '1em',
      color: Colors.orange,
    },

    '& button.MuiButtonBase-root:hover': {
      backgroundColor: Colors.brandPrimary900,
    },

    '& button.MuiButtonBase-root': {
      backgroundColor: `${Colors.brandPrimary900} !important`,
    },
  },
  body: {
    flexGrow: 1,
  },
  footer: {
    position: 'relative',
    height: 63,
    width: '100%',
    padding: '20px 15px 20px 15px',
    backgroundColor: Colors.brandSecondary100,
  },
}));

type WhylabsModalProps = {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly footer?: React.ReactNode;
};

type WhylabsModalContextType = {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
};

type WelcomeModalProviderProps = {
  readonly children: React.ReactNode;
};

type CreateModelComponentReturnType = {
  Modal: (props: WhylabsModalProps) => JSX.Element;
  ModalProvider: ({ children }: WelcomeModalProviderProps) => JSX.Element;
  ModalContext: React.Context<WhylabsModalContextType>;
};

export function createModalComponent(): CreateModelComponentReturnType {
  function ModalProvider({ children }: WelcomeModalProviderProps) {
    const [open, setOpen] = useState<boolean>(false);
    return <ModalContext.Provider value={{ open, setOpen }}>{children}</ModalContext.Provider>;
  }

  const ModalContext = React.createContext<WhylabsModalContextType>({
    open: false,
    setOpen: () => {
      /**/
    },
  });

  function WhylabsModal(props: WhylabsModalProps): JSX.Element {
    const { children, title, footer } = props;
    const styles = useStyles();
    const { open } = useContext(ModalContext);

    // function onClosePress() {
    //   setOpen(false);
    // }

    return (
      <Modal
        open={open}
        BackdropProps={{ className: styles.backdrop }}
        // onClose={onClosePress}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <Fade in={open} timeout={modalFadeDuration}>
          <div className={styles.container}>
            <div className={styles.header}>
              <Typography className={styles.modalTitle}>{title}</Typography>
              {/* <div
                className={styles.closeButton}
                onClick={onClosePress}
                role="button"
                tabIndex={0}
                onKeyPress={onClosePress}
              >
                <ClearIcon />
              </div> */}
            </div>
            <div className={styles.root}>
              <div className={styles.body}>{children}</div>
              {footer && <div className={styles.footer}>{footer}</div>}
            </div>
          </div>
        </Fade>
      </Modal>
    );
  }

  return { Modal: WhylabsModal, ModalProvider, ModalContext };
}
