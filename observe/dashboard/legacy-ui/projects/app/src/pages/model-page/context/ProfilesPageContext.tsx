import { useReducer, createContext } from 'react';
import { ReferenceProfile } from 'generated/graphql';
import { NumberOrString } from 'utils/queryUtils';

export type ProfileQueryData = { timestamp: number }[];
export interface ProfilesSelectionInput {
  id: NumberOrString;
  individualProfilesCount?: number;
}
export interface ProfilePageState {
  profileQueryData?: ProfileQueryData | null;
  staticProfiles?: ReferenceProfile[] | null;
  selectionInputs: ProfilesSelectionInput[];
  loadingProfilesInRange?: boolean;
}

function generatePageState(): ProfilePageState {
  return {
    selectionInputs: [{ id: new Date().getTime() }],
  };
}

const ProfilesPageContext = createContext<[ProfilePageState, React.Dispatch<Partial<ProfilePageState>>]>([
  generatePageState(),
  () => {
    /**/
  },
]);

function resourceReducer(state: ProfilePageState, updates: Partial<ProfilePageState>): ProfilePageState {
  if (Object.keys(updates).length) {
    return { ...state, ...updates };
  }
  return state;
}

const ProfilesPageContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const [pageState, resourceDispatch] = useReducer(resourceReducer, generatePageState());
  const { children } = props;
  return <ProfilesPageContext.Provider value={[pageState, resourceDispatch]}>{children}</ProfilesPageContext.Provider>;
};

export { ProfilesPageContext, ProfilesPageContextProvider };
