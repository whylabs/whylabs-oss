import { useEffect, useMemo, useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import {
  MembershipType,
  JoinedOrganizationFragment,
  useGetUserQuery,
  useSelectDefaultOrganizationMutation,
  useGetUserOrganizationsQuery,
} from 'generated/graphql';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { useQueryParams } from 'utils/queryUtils';
import { createStyles, SelectItem } from '@mantine/core';
import { WhyLabsSelect } from 'components/design-system';

const useStyles = createStyles({
  dropdown: {
    color: Colors.white,
    border: `1px solid ${Colors.brandSecondary900}`,
    borderRadius: 4,
    height: 40,
    fontSize: '14px',
    '& .MuiSelect-select': {
      padding: '10px 29px 10px 10px',
    },
  },
  select: {
    padding: 0,
    '&:focus': {
      background: 'none',
    },
  },
  selectIcon: {
    color: Colors.white,
  },
  selectItem: {
    fontSize: '14px',
    fontFamily: 'Asap',
    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  selectedItem: {
    background: `${Colors.brandSecondary100} !important`,
  },
  selectMenu: {
    background: Colors.white,
    borderRadius: '3px',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    padding: 0,
  },
  modelDropdownLabel: {
    fontSize: '12px',
    paddingBottom: '4px',
    color: Colors.white,
  },
  organizationDropdown: {
    width: 280,
  },
});

/**
 * Determines if the target org is a demo org, which requires special handling in the dropdown
 * @param orgs All orgs
 * @param targetOrgId The selected org
 */
const isDemoOrg = (orgs: JoinedOrganizationFragment[], targetOrgId: string): boolean => {
  return orgs.find((o) => o.orgId === targetOrgId)?.membershipType === MembershipType.Demo;
};

const OrganizationSelect = (): JSX.Element => {
  const { data: loggedInUserData } = useGetUserQuery();
  const { data: orgsData, loading } = useGetUserOrganizationsQuery();
  const [setDefaultOrganization] = useSelectDefaultOrganizationMutation();

  const { setQueryParam } = useQueryParams();

  const { classes: styles } = useStyles();
  const [orgLoading, setOrgLoading] = useState(false);

  const [selectedOrganization, setSelectedOrganization] = useState<string>('');

  const sortedOrganizations = useMemo(
    () =>
      orgsData?.user.joinedOrganizations?.slice()?.sort((org1, org2) => {
        if (org1.membershipType === MembershipType.Demo) {
          // move demo orgs to the bottom of the list, regardless of their name
          return 1;
        }

        // sort orgs alphabetically otherwise
        return org1.name.localeCompare(org2.name);
      }) ?? [],
    [orgsData?.user.joinedOrganizations],
  );

  const hasMoreThanOneOrg = sortedOrganizations.length > 1;

  useEffect(() => {
    if (loggedInUserData) {
      const selectedOrg = sortedOrganizations.find((org) => org.orgId === loggedInUserData.user.organization?.id);
      setSelectedOrganization(selectedOrg?.orgId ?? '');
    }
  }, [loggedInUserData, sortedOrganizations]);

  const handleChange = (newOrg: string) => {
    if (selectedOrganization && newOrg) {
      setSelectedOrganization(newOrg);
      if (isDemoOrg(sortedOrganizations, newOrg)) {
        // demo org can be accessed directly by its membership type to allow the URLs to demo resources
        // to remain stable across deployment environments
        setQueryParam(TARGET_ORG_QUERY_NAME, MembershipType.Demo.toLocaleLowerCase());
        // for the demo org, just reload the page, no need to change default org (plus it isn't possible)
        window.location.reload();
        return;
      }

      setOrgLoading(true);
      setDefaultOrganization({ variables: { orgId: newOrg } })
        .catch((error) => console.error(error))
        .finally(() => {
          setOrgLoading(false);
          setQueryParam(TARGET_ORG_QUERY_NAME, newOrg);
          window.location.reload();
        });
    }
  };

  const selectItems: SelectItem[] = useMemo(
    () =>
      sortedOrganizations.map(({ name, orgId }) => {
        return {
          value: orgId,
          label: `${name} (${orgId})`,
        };
      }),
    [sortedOrganizations],
  );

  const isLoading = loading || orgLoading;

  if (!hasMoreThanOneOrg && !isLoading) {
    return <></>;
  }

  return (
    <div className={styles.organizationDropdown}>
      <WhyLabsSelect
        darkBackground
        data={selectItems}
        label="Select organization"
        placeholder="Select an organization"
        clearable={false}
        loading={isLoading}
        value={selectedOrganization}
        onChange={(value) => handleChange(value ?? '')}
      />
    </div>
  );
};
export default OrganizationSelect;
