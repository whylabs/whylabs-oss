import { TitleAndContentTemplate } from '@whylabs/observatory-lib';
import { GlobalTitleBar } from 'components/controls/widgets/GlobalTitleBar';
import { Navigate } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { canAccessInternalAdmin } from 'utils/permissionUtils';
import { useUserContext } from 'hooks/useUserContext';
import { GlobalBanner } from 'components/controls/widgets/banner/GlobalBanner';
import { AdminPageContent } from './AdminPageContent';
import { WhyLabsInternalWarningBar } from './components/WhyLabsInternalWarningBar';

export const AdminPage: React.FC = () => {
  const { getCurrentUser } = useUserContext();
  const { getNavUrl } = useNavLinkHandler();

  // must have Whylabs admin access to view this page
  if (!canAccessInternalAdmin(getCurrentUser())) {
    return <Navigate to={getNavUrl({ page: 'notFound' })} />;
  }

  return (
    <div>
      <TitleAndContentTemplate
        BannerComponent={<GlobalBanner />}
        TitleBarAreaComponent={<GlobalTitleBar />}
        TabBarComponent={<WhyLabsInternalWarningBar />}
        ContentAreaComponent={<AdminPageContent />}
      />
      <WhyLabsInternalWarningBar />
    </div>
  );
};
