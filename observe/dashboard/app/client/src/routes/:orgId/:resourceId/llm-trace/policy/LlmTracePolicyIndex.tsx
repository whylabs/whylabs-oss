import { createStyles } from '@mantine/core';
import { ActionsBottomBar } from '~/components/ActionsBottomBar';
import { useFlags } from '~/hooks/useFlags';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { SideNavMenu, SideNavMenuProps } from '~/routes/:orgId/:resourceId/llm-trace/policy/components/SideNavMenu';
import { SETTINGS_NAV_MENU } from '~/routes/:orgId/:resourceId/llm-trace/policy/utils';
import { POLICY_RULESETS_NAME } from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useLlmTracePolicyViewModel } from './useLlmTracePolicyViewModel';

const CARD_WIDTH = {
  min: 600,
  max: 900,
};

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexGrow: 1,
    maxHeight: '100%',
  },
  contentRoot: {
    display: 'flex',
    gap: 20,
    padding: '0 15px',
    width: '100%',
    flexGrow: 1,
  },
  policyHistoryWrapper: {
    padding: '15px',
    width: '100%',
    overflow: 'auto',
    maxHeight: 'calc(100vh - 44px - 54px)', // dark-header / tabs
  },
  pageContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 30,
    overflow: 'auto',
    maxHeight: 'calc(100vh - 44px - 54px - 67px)', // dark-header / tabs / footer
    padding: '15px 0',
  },
  policyGroupFlexContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
  },
  cardWrapper: {
    display: 'flex',
    flexGrow: 1,
    width: '100%',
    maxWidth: CARD_WIDTH.max,
    minWidth: CARD_WIDTH.min,
  },
}));

export const LlmTracePolicyIndex = () => {
  const { classes } = useStyles();
  const { pathname } = useLocation();
  const { handleNavigation } = useNavLinkHandler();
  const viewModel = useLlmTracePolicyViewModel();
  const { activeMenuItem, cardRefs, setActiveMenuItem } = viewModel;
  const flags = useFlags();
  useSetHtmlTitle(upperCaseFirstLetterOnly(POLICY_RULESETS_NAME));
  useEffect(() => {
    const sectionRef = activeMenuItem && cardRefs.current.get(activeMenuItem);
    if (activeMenuItem && sectionRef) {
      setTimeout(() => sectionRef.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [activeMenuItem, cardRefs]);

  const getNotAvailableMessage = (id: string): [boolean, string] => {
    if (id !== 'change-history') {
      const isDisabled = viewModel.isDemoOrg === null || viewModel.isDemoOrg;
      return [isDisabled, 'Not available in the demo org'];
    }
    if (flags.isLoading) {
      return [true, 'Loading...'];
    }
    return [!flags.llmSecurePolicyHistory, 'Coming soon'];
  };

  const navSections: SideNavMenuProps['sections'] = [
    {
      title: 'POLICY RULESETS',
      items:
        viewModel?.schema?.policies.map(({ id, icon, title }) => ({
          id,
          icon,
          label: title,
          clickHandler: () => {
            setActiveMenuItem(id);
            viewModel.setPolicySearchParam(id);
          },
        })) ?? [],
    },
    {
      title: 'SETTINGS',
      items: SETTINGS_NAV_MENU.flatMap((item) => {
        const [disabled, disabledTooltip] = getNotAvailableMessage(item.id);
        return [
          {
            ...item,
            disabled,
            disabledTooltip,
            clickHandler: () => {
              setActiveMenuItem(item.id);
              handleNavigation({ page: 'llm-secure', llmSecure: { path: 'policy', page: item.id } });
            },
          },
        ];
      }),
    },
  ];

  const activeNavTab = (() => {
    const activePath = pathname.substring(pathname.lastIndexOf('/') + 1);
    if (SETTINGS_NAV_MENU.map(({ id }) => id).find((id) => id === activePath)) return activePath;
    return activeMenuItem;
  })();

  return (
    <div className={classes.root}>
      <div className={classes.contentRoot}>
        {!viewModel.isPolicySourceAPI && (
          <SideNavMenu sections={navSections} activeItem={activeNavTab} isLoading={viewModel.hasLoadingQueries} />
        )}
        <div className={classes.pageContent}>
          <Outlet context={viewModel} />
        </div>
      </div>
      {!viewModel.isPolicySourceAPI && (
        <ActionsBottomBar
          cancelButtonProps={{
            disabled: !viewModel.isDirty || viewModel.isSaving,
            label: 'Clear changes',
            onClick: viewModel.onClearClick,
          }}
          submitButtonProps={{
            disabled: !viewModel.isDirty || viewModel.isDemoOrg === null || viewModel.isDemoOrg,
            disabledTooltip: viewModel.isDemoOrg && viewModel.isDirty ? 'Not available in the demo org' : undefined,
            loading: viewModel.isSaving,
            onClick: viewModel.onClickSave,
          }}
        />
      )}
    </div>
  );
};
