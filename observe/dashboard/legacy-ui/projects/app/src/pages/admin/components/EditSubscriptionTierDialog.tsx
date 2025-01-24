import { useState } from 'react';

import { WhyLabsButton, WhyLabsConfirmationDialog, WhyLabsModal } from 'components/design-system';
import { SubscriptionTier, useUpdateSubscriptionTierMutation } from 'generated/graphql';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

interface EditSubscriptionTierDialogProps {
  currentTier: SubscriptionTier;
  onClose: () => void;
  onUpdate: (newTier: SubscriptionTier) => void;
  orgId: string;
  orgName: string;
}

const EditSubscriptionTierDialog: React.FC<EditSubscriptionTierDialogProps> = ({
  currentTier,
  onClose,
  onUpdate,
  orgId,
  orgName,
}) => {
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [updateSubscriptionTier] = useUpdateSubscriptionTierMutation();

  const handleUpdateSubscriptionTier = () => {
    setIsConfirmationDialogOpen(false);
    setIsSaving(true);

    updateSubscriptionTier({ variables: { orgId, subscriptionTier: selectedTier } })
      .then(() => {
        onUpdate(selectedTier);
        enqueueSnackbar({ title: `Subscription Tier updated for org ${orgName}` });
      })
      .catch((err) => {
        setIsSaving(false);
        enqueueErrorSnackbar({ err, explanation: 'Failed to update subscription tier for org' });
      });
  };

  return (
    <>
      <WhyLabsModal
        opened
        onClose={onClose}
        size="500px"
        title={`Subscription Tier for ${orgName} (${orgId})`}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {getOptions().map((tier) => (
              <WhyLabsButton
                color="primary"
                disabled={isSaving}
                key={tier}
                onClick={onSelect(tier)}
                variant={selectedTier === tier ? 'filled' : 'subtle'}
              >
                {tier}
              </WhyLabsButton>
            ))}
          </div>
          <div style={{ alignSelf: 'end' }}>
            <WhyLabsButton variant="outline" color="primary" disabled={isSaving} onClick={onRequestConfirmation}>
              {isSaving ? 'Please wait...' : 'Set new Tier'}
            </WhyLabsButton>
          </div>
        </div>
      </WhyLabsModal>
      <WhyLabsConfirmationDialog
        isOpen={isConfirmationDialogOpen}
        dialogTitle="Are you sure?"
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={onClose}
        onConfirm={handleUpdateSubscriptionTier}
      >
        Subscription Tier for {orgName} will be updated from &quot;{currentTier}&quot; to &quot;{selectedTier}&quot;.
      </WhyLabsConfirmationDialog>
    </>
  );

  function onRequestConfirmation() {
    setIsConfirmationDialogOpen(true);
  }

  function getOptions() {
    return Object.values(SubscriptionTier).filter((tier) => tier !== SubscriptionTier.Unknown);
  }

  function onSelect(tier: SubscriptionTier) {
    return () => {
      setSelectedTier(tier);
    };
  }
};

export default EditSubscriptionTierDialog;
