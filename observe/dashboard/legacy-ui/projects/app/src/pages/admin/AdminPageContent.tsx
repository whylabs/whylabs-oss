import {
  ModelType,
  SubscriptionTier,
  useListAllOrgsQuery,
  useListEmailDomainsForOrgLazyQuery,
  useListModelsForOrgLazyQuery,
  useListUsersForOrgLazyQuery,
  useNewModelMutation,
  useNewOrgMutation,
} from 'generated/graphql';
import { useHandlePossibleApolloErrors, useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useEffect, useState } from 'react';
import { WhyLabsButton, WhyLabsModal, WhyLabsSelect, WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useDebouncedState } from '@mantine/hooks';
import { AdminMembershipsViewer } from './components/AdminMembershipsViewer';
import EditEmailDomainsDialog from './components/EditEmailDomainsDialog';
import EditSubscriptionTierDialog from './components/EditSubscriptionTierDialog';
import { MaintenanceBarControl } from './components/MaintenanceBarControl';
import { UserManagerDialog } from './components/UserManagerDialog';

interface NewOrgMetadata {
  name: string;
  emailDomains: string[];
}

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
  tableActionContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  mainTableWrapper: {
    display: 'flex',
    background: 'white',
    flexDirection: 'column',
  },
  modelManagerTable: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '500px',
  },
});

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, GenericCell },
} = WhyLabsTableKit;

export const AdminPageContent: React.FC = () => {
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [isUsersViewOpen, setUsersViewOpen] = useState(false);
  const [isModelsViewOpen, setModelsViewOpen] = useState(false);
  const [isDomainsViewOpen, setEditDomainsViewOpen] = useState(false);
  const [isSubscriptionTierViewOpen, setSubscriptionTierViewOpen] = useState(false);
  const [isNewOrgViewOpen, setIsNewOrgViewOpen] = useState(false);
  const [showAllOrgs, setShowAllOrgs] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [newModelName, setNewModelName] = useState<string>('');

  const [newModelType, setNewModelType] = useState<ModelType>(ModelType.Unknown);
  const [newOrgMetadata, setNewOrgMetadata] = useState<NewOrgMetadata>({ name: '', emailDomains: [] });
  const { classes, cx } = useStyles();
  const { data, loading, refetch, error: errorListAll } = useListAllOrgsQuery();
  const [
    listModelsForOrg,
    { data: modelsForOrg, loading: modelsLoading, refetch: refetchModelsForOrg, error: errorListModelsForOrg },
  ] = useListModelsForOrgLazyQuery();
  const [
    listUsersForOrg,
    { data: usersForOrg, loading: loadingUsers, refetch: refetchUsersForOrg, error: errorListUsersForOrg },
  ] = useListUsersForOrgLazyQuery();
  const [
    listEmailDomainsForOrg,
    {
      data: emailDomainsForOrg,
      loading: emailDomainLoading,
      refetch: refetchEmailDomainsForOrg,
      error: errorListEmailDomainsForOrg,
    },
  ] = useListEmailDomainsForOrgLazyQuery();

  const [createModel] = useNewModelMutation();
  const [createOrg] = useNewOrgMutation();

  const allOrgs = data?.admin?.organizations ?? [];
  const selectedOrg = selectedOrgId ? allOrgs.find(({ id }) => id === selectedOrgId) : undefined;
  const orgsToShow = showAllOrgs ? allOrgs.length : Math.min(allOrgs.length, 10);
  const organizationsToShow = allOrgs.slice(0, orgsToShow);

  const [searchString, setSearchString] = useDebouncedState('', 750, { leading: false });

  useEffect(() => {
    if (refetch) refetch({ search: searchString });
  }, [refetch, searchString]);

  useHandlePossibleApolloErrors([
    errorListAll,
    errorListModelsForOrg,
    errorListUsersForOrg,
    errorListEmailDomainsForOrg,
  ]);

  const handleClickViewUsers = (orgId: string) => {
    return () => {
      setSelectedOrgId(orgId);
      setUsersViewOpen(true);
      listUsersForOrg({ variables: { orgId } });
    };
  };

  const usersUpdated = (orgId: string) => {
    if (refetchUsersForOrg) {
      refetchUsersForOrg({ orgId });
    }
  };

  const handleCloseUsersView = (): void => {
    setUsersViewOpen(false);
    setSelectedOrgId('');
  };

  const handleClickViewModels = (orgId: string) => {
    return () => {
      setSelectedOrgId(orgId);
      setModelsViewOpen(true);
      listModelsForOrg({ variables: { orgId } });
    };
  };

  const handleCloseModelsView = (): void => {
    setModelsViewOpen(false);
    setSelectedOrgId('');
  };

  const handleClickEditDomains = (orgId: string) => {
    return () => {
      setEditDomainsViewOpen(true);
      setSelectedOrgId(orgId);
      listEmailDomainsForOrg({ variables: { orgId } });
    };
  };

  const handleCloseEditDomainsView = (): void => {
    setEditDomainsViewOpen(false);
    setSelectedOrgId('');
  };

  const handleClickSubscriptionTier = (orgId: string) => {
    return () => {
      setSubscriptionTierViewOpen(true);
      setSelectedOrgId(orgId);
    };
  };

  const handleCloseSubscriptionTierView = (): void => {
    setSubscriptionTierViewOpen(false);
    setSelectedOrgId('');
  };

  const handleCloseNewOrgView = (): void => {
    setIsNewOrgViewOpen(false);
    setNewOrgMetadata({ name: '', emailDomains: [] });
  };

  const handleCreateModel = async (): Promise<void> => {
    createModel({ variables: { orgId: selectedOrgId, name: newModelName, modelType: newModelType } })
      .then(() => {
        if (refetchModelsForOrg) refetchModelsForOrg({ orgId: selectedOrgId });
        enqueueSnackbar({ title: 'Project created' });
      })
      .catch((err) => enqueueErrorSnackbar({ explanation: `FAILED to create project`, err }));
  };

  const orgEmailDomainsUpdated = (orgId: string, emailDomains: string[]) => {
    const org = allOrgs.find((o) => o.id === orgId);
    if (org) org.emailDomains = emailDomains;
    if (refetchEmailDomainsForOrg) {
      refetchEmailDomainsForOrg({ orgId });
    }
  };

  const subscriptionTierUpdated = (newTier: SubscriptionTier) => {
    if (selectedOrg) {
      selectedOrg.subscriptionTier = newTier;
    }
    handleCloseSubscriptionTierView();
  };

  const handleCreateOrg = async (): Promise<void> => {
    const { name, emailDomains } = newOrgMetadata;
    createOrg({ variables: { name, emailDomains } })
      .then(() => {
        handleCloseNewOrgView();
        refetch();
        enqueueSnackbar({ title: 'Organization created' });
      })
      .catch((err) => enqueueErrorSnackbar({ explanation: `FAILED to create org`, err }));
  };

  const modelsList = modelsForOrg?.admin?.models ?? [];

  return (
    <div style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <WhyLabsButton
            variant="outline"
            color="primary"
            style={{ margin: '5px' }}
            onClick={() => setIsNewOrgViewOpen(true)}
          >
            Create new Organization
          </WhyLabsButton>
          <div>
            <WhyLabsText>Search organizations:</WhyLabsText>
            <input onChange={(e) => setSearchString(e.target.value)} />
          </div>
        </div>
        <MaintenanceBarControl />
        <AdminMembershipsViewer />
      </div>
      <WhyLabsText>
        Showing {organizationsToShow.length} of {allOrgs.length} organizations
      </WhyLabsText>
      <div className={classes.mainTableWrapper}>
        <WhyLabsTable.Container rowsCount={organizationsToShow?.length ?? 0} headerHeight={42} isLoading={loading}>
          <WhyLabsTable.Column
            uniqueKey="manage-org-list-org-id"
            maxWidth="max-content"
            header={<HeaderCell>ID</HeaderCell>}
            cell={(index) => {
              const { id } = organizationsToShow[index];
              return (
                <div className={classes.rowCell}>
                  <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{id ?? '-'}</TextCell>
                </div>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="manage-org-list-org-name"
            maxWidth="max-content"
            header={<HeaderCell>OrgID</HeaderCell>}
            cell={(index) => {
              const { name } = organizationsToShow[index];
              return (
                <div className={classes.rowCell}>
                  <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{name ?? '-'}</TextCell>
                </div>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="manage-org-list-org-subscription-tier"
            maxWidth="max-content"
            header={<HeaderCell>Subscription tier</HeaderCell>}
            cell={(index) => {
              const { subscriptionTier } = organizationsToShow[index];
              return (
                <div className={classes.rowCell}>
                  <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{subscriptionTier ?? '-'}</TextCell>
                </div>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="manage-org-list-org-email-domains"
            maxWidth="max-content"
            header={<HeaderCell>Email domains</HeaderCell>}
            cell={(index) => {
              const { emailDomains } = organizationsToShow[index];
              return (
                <div className={classes.rowCell}>
                  <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                    {emailDomains?.join(', ') ?? '-'}
                  </TextCell>
                </div>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="manage-org-list-actions"
            maxWidth="max-content"
            header={<HeaderCell>Actions</HeaderCell>}
            cell={(index) => {
              const { id } = organizationsToShow[index];
              if (!id) return <></>;
              return (
                <div className={classes.rowCell}>
                  <GenericCell>
                    <div className={classes.tableActionContainer}>
                      {getActionButtons().map(({ color, label, onClickHandler }) => (
                        <WhyLabsButton
                          variant="outline"
                          size="xs"
                          color="gray"
                          key={label}
                          onClick={onClickHandler(id)}
                          style={{ border: `solid ${color} 1px`, marginRight: 6 }}
                        >
                          {label}
                        </WhyLabsButton>
                      ))}
                    </div>
                  </GenericCell>
                </div>
              );
            }}
          />
        </WhyLabsTable.Container>
        {!showAllOrgs && orgsToShow < allOrgs.length && (
          <WhyLabsButton variant="subtle" width="full" color="gray" onClick={() => setShowAllOrgs(true)}>
            Show all results
          </WhyLabsButton>
        )}
      </div>

      {/* Org manager */}
      <WhyLabsModal
        opened={isNewOrgViewOpen}
        onClose={handleCloseNewOrgView}
        size="sm"
        title="Create an organization"
        centered
      >
        <WhyLabsText>Name</WhyLabsText>
        <input
          style={{ width: '100%', marginBottom: 8 }}
          value={newOrgMetadata.name}
          onChange={(e) => setNewOrgMetadata({ emailDomains: newOrgMetadata.emailDomains, name: e.target.value })}
        />
        <WhyLabsText>Domain</WhyLabsText>
        <input
          style={{ width: '100%' }}
          value={newOrgMetadata.emailDomains?.join(',')}
          onChange={(e) => setNewOrgMetadata({ name: newOrgMetadata.name, emailDomains: e.target.value.split(',') })}
        />
        <div />
        <WhyLabsButton style={{ marginTop: 10 }} width="full" variant="subtle" color="gray" onClick={handleCreateOrg}>
          Create organization
        </WhyLabsButton>
      </WhyLabsModal>

      {/* User manager */}
      <UserManagerDialog
        selectedOrg={selectedOrg}
        members={usersForOrg?.admin?.organization?.members ?? []}
        isOpen={isUsersViewOpen}
        onClose={handleCloseUsersView}
        usersUpdated={usersUpdated}
        loading={loadingUsers}
      />

      {/* Model manager */}
      <WhyLabsModal
        title={`Models belonging to ${selectedOrgId}`}
        opened={isModelsViewOpen}
        onClose={handleCloseModelsView}
        size="max-content"
        centered
      >
        <div className={classes.modelManagerTable}>
          <WhyLabsTable.Container rowsCount={modelsList?.length ?? 0} headerHeight={42} isLoading={modelsLoading}>
            <WhyLabsTable.Column
              uniqueKey="manage-models-list-model-id"
              maxWidth="max-content"
              header={<HeaderCell>ID</HeaderCell>}
              cell={(index) => {
                const { id } = modelsList[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{id ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="manage-models-list-model-name"
              maxWidth="max-content"
              header={<HeaderCell>Name</HeaderCell>}
              cell={(index) => {
                const { name } = modelsList[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{name ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
            <WhyLabsTable.Column
              uniqueKey="manage-models-list-model-type"
              maxWidth="max-content"
              header={<HeaderCell>Model Type</HeaderCell>}
              cell={(index) => {
                const { modelType } = modelsList[index];
                return (
                  <div className={classes.rowCell}>
                    <TextCell className={cx(classes.dataRow, classes.cellPadding)}>{modelType ?? '-'}</TextCell>
                  </div>
                );
              }}
            />
          </WhyLabsTable.Container>
        </div>
        <div>
          <WhyLabsText>Create new Model</WhyLabsText>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              Name:{' '}
              <input
                style={{ margin: '0 15px 0 5px' }}
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Type:{' '}
              <WhyLabsSelect
                withinPortal
                value={newModelType}
                size="xs"
                label="select model type"
                hideLabel
                data={Object.values(ModelType)}
                onChange={(m) => setNewModelType(m as ModelType)}
              />
            </div>
            <WhyLabsButton size="xs" variant="outline" color="primary" onClick={() => handleCreateModel()}>
              Create
            </WhyLabsButton>
          </div>
        </div>
      </WhyLabsModal>

      <EditEmailDomainsDialog
        orgId={selectedOrgId}
        emailDomains={emailDomainsForOrg?.admin?.organization?.emailDomains ?? []}
        emailDomainsUpdated={orgEmailDomainsUpdated}
        isOpen={isDomainsViewOpen}
        onClose={handleCloseEditDomainsView}
        loading={emailDomainLoading}
      />

      {isSubscriptionTierViewOpen && selectedOrg && (
        <EditSubscriptionTierDialog
          currentTier={selectedOrg.subscriptionTier || SubscriptionTier.Free}
          onClose={handleCloseSubscriptionTierView}
          onUpdate={subscriptionTierUpdated}
          orgId={selectedOrgId}
          orgName={selectedOrg.name || ''}
        />
      )}
    </div>
  );

  function getActionButtons() {
    return [
      { color: 'orange', label: 'View users', onClickHandler: handleClickViewUsers },
      { color: 'green', label: 'View models', onClickHandler: handleClickViewModels },
      { color: 'purple', label: 'Edit Tier', onClickHandler: handleClickSubscriptionTier },
      { color: 'blue', label: 'Edit domains', onClickHandler: handleClickEditDomains },
    ];
  }
};
