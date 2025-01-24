import { useUpdateEmailDomainsMutation } from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsModal, WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { useState } from 'react';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

interface EditEmailDomainsDialogProps {
  orgId: string;
  emailDomains: string[];
  emailDomainsUpdated: (orgId: string, emailDomains: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell },
} = WhyLabsTableKit;

const useStyles = createStyles({
  rowCell: {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
  },
  dataRow: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '12px',
    color: Colors.brandSecondary900,
  },
  cellPadding: {
    padding: '8px',
  },
  actionButtonsContainer: {
    display: 'flex',
    gridGap: '5px',
    paddingTop: '3px',
    paddingBottom: '3px',
  },
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '500px',
  },
});

const EditEmailDomainsDialog: React.FC<EditEmailDomainsDialogProps> = ({
  orgId,
  emailDomains,
  emailDomainsUpdated,
  isOpen,
  onClose,
  loading,
}) => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [newEmailDomain, setNewEmailDomain] = useState<string>('');
  const [updateEmailDomains] = useUpdateEmailDomainsMutation();
  const { classes, cx } = useStyles();
  const handleUpdateEmailDomains = (newDomains: string[]) => {
    if (!newDomains.length) {
      enqueueSnackbar({ title: `You need at least one email domain for the org`, variant: 'warning' });
      return;
    }
    updateEmailDomains({ variables: { orgId, emailDomains: newDomains } })
      .then(() => {
        // let parent page update appropriately with the new domains
        emailDomainsUpdated(orgId, newDomains);
        enqueueSnackbar({ title: 'Email domains updated' });
      })
      .catch((err) =>
        enqueueSnackbar({
          title: 'Failed to update email domains for org',
          description: err.message,
          variant: 'error',
        }),
      );
  };

  const handleRemoveEmailDomain = (domain: string) => {
    handleUpdateEmailDomains(emailDomains.filter((e: string) => e !== domain));
  };

  const handleAddEmailDomain = (domain: string) => {
    if (emailDomains.indexOf(domain) === -1) {
      emailDomains.push(domain);
      handleUpdateEmailDomains(emailDomains);
    }
  };

  const renderEmailDomainTable = () => (
    <div className={classes.tableWrapper}>
      <WhyLabsTable.Container rowsCount={emailDomains?.length ?? 0} headerHeight={42} isLoading={loading}>
        <WhyLabsTable.Column
          uniqueKey="manage-domain-list-email-domain"
          maxWidth="max-content"
          header={<HeaderCell>Email Domain</HeaderCell>}
          cell={(index) => {
            const domain = emailDomains[index];
            return (
              <div className={classes.rowCell}>
                <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{domain ?? '-'}</TextCell>
              </div>
            );
          }}
        />
        <WhyLabsTable.Column
          uniqueKey="manage-domain-list-actions"
          maxWidth="max-content"
          header={<HeaderCell>Actions</HeaderCell>}
          cell={(index) => {
            const domain = emailDomains[index];
            return (
              <div className={classes.rowCell}>
                <GenericCell>
                  <WhyLabsButton
                    variant="outline"
                    color="danger"
                    size="xs"
                    onClick={() => handleRemoveEmailDomain(domain)}
                  >
                    Remove
                  </WhyLabsButton>
                </GenericCell>
              </div>
            );
          }}
        />
      </WhyLabsTable.Container>
    </div>
  );

  const renderNewDomainBox = () => (
    <div style={{ marginTop: '15px' }}>
      <WhyLabsText>New Domain</WhyLabsText>
      <input
        style={{ margin: '0 15px 0 5px' }}
        value={newEmailDomain}
        onChange={(e) => setNewEmailDomain(e.target.value)}
      />
      <WhyLabsButton variant="outline" color="primary" size="xs" onClick={() => handleAddEmailDomain(newEmailDomain)}>
        Add domain
      </WhyLabsButton>
    </div>
  );

  return (
    <WhyLabsModal opened={isOpen} onClose={onClose} title={`Email domains for ${orgId}`} centered>
      {renderEmailDomainTable()}
      {renderNewDomainBox()}
    </WhyLabsModal>
  );
};

export default EditEmailDomainsDialog;
