import { Navigate, Route, Routes } from 'react-router-dom';
import { PageBases } from 'pages/page-types/pageType';
import NewGetStartedPage from 'pages/get-started/pages/NewGetStartedPage/NewGetStartedPage';

export default function GetStartedRouteBase(): JSX.Element {
  return (
    <Routes>
      <Route index element={<NewGetStartedPage />} />
      <Route path="*" element={<Navigate to={PageBases.getStarted} />} />
    </Routes>
  );
}
