import { Navigate, Route, Routes } from 'react-router-dom';
import { PageBases } from 'pages/page-types/pageType';
import HowToUseMobilePage from 'pages/how-to-use-mobile/HowToUseMobilePage';

export default function HowToUseMobileRouteBase(): JSX.Element {
  return (
    <Routes>
      <Route index element={<HowToUseMobilePage />} />
      <Route path="*" element={<Navigate to={PageBases.howToUseMobile} />} />
    </Routes>
  );
}
