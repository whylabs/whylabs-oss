import * as useNavLinkHandlerHook from 'hooks/usePageLinkHandler';

export function mockUseNavLinkHandler(
  customProps?: Partial<ReturnType<typeof useNavLinkHandlerHook.useNavLinkHandler>>,
): jest.SpyInstance {
  return jest.spyOn(useNavLinkHandlerHook, 'useNavLinkHandler').mockImplementation(() => ({
    getNavUrl: () => '/',
    getNavUrlWithoutOrg: () => '/',
    handleNavigation: jest.fn(),
    handleNavigationWithoutOrg: jest.fn(),
    ...customProps,
  }));
}
