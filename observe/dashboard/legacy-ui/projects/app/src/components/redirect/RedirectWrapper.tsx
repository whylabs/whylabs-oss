import { Navigate, useLocation } from 'react-router-dom';

interface RedirectWrapperProps {
  keepSearchParams?: boolean;
  newPath: string;
  oldPath: string;
}

export default function RedirectWrapper({ keepSearchParams, newPath, oldPath }: RedirectWrapperProps): JSX.Element {
  const { pathname, search } = useLocation();
  const newPathname = pathname.replaceAll(oldPath, newPath);
  console.log(`User visited old url ${pathname}, redirect to new ${newPathname}`);

  return (
    <Navigate
      to={{
        pathname: newPathname,
        search: keepSearchParams ? search : undefined,
      }}
    />
  );
}
