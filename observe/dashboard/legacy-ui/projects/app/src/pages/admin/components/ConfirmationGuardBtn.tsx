import { useState } from 'react';
import { WhyLabsButton, WhyLabsText } from 'components/design-system';

interface ConfirmationBtnProps {
  handleClick: () => void;
  btnText: string;
  confirmationText: string;
}

export const ConfirmationGuardBtn: React.FC<ConfirmationBtnProps> = ({ handleClick, btnText, confirmationText }) => {
  const [confirmationShown, setConfirmationShown] = useState(false);

  const renderConfirmation = () => (
    <div style={{ height: 'inherit' }}>
      <WhyLabsText align="center">{confirmationText}</WhyLabsText>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        <WhyLabsButton variant="outline" size="xs" color="gray" onClick={() => setConfirmationShown(false)}>
          No
        </WhyLabsButton>
        <WhyLabsButton
          variant="outline"
          size="xs"
          color="primary"
          onClick={() => {
            setConfirmationShown(false);
            handleClick();
          }}
        >
          Yes
        </WhyLabsButton>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {confirmationShown ? (
        renderConfirmation()
      ) : (
        <WhyLabsButton size="xs" variant="outline" color="danger" onClick={() => setConfirmationShown(true)}>
          {btnText}
        </WhyLabsButton>
      )}
    </div>
  );
};
