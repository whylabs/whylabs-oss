import { Route, Routes } from 'react-router-dom';
import { RelativePages } from 'pages/page-types/pageType';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import NotificationActionsList from './pages/NotificationActionsList';
import { NotificationActionDetails } from './pages/NotificationActionDetails';

export const NewNotificationsPageContentArea: React.FC = () => {
  useSetHtmlTitle('Notification actions');
  return (
    <Routes>
      <Route index element={<NotificationActionsList />} />
      <Route path={RelativePages.notificationAction} element={<NotificationActionDetails />} />
    </Routes>
  );
};
