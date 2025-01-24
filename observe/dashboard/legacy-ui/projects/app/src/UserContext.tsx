import { createContext, useReducer } from 'react';
import { User } from 'generated/graphql';

type FilteredUser = Omit<User, 'permissions'>;

export interface UserState {
  user?: FilteredUser | null | undefined;
}

function generateUserState(): UserState {
  return {};
}

const UserContext = createContext<
  [
    UserState,
    React.Dispatch<{
      user?: FilteredUser | null | undefined;
    }>,
  ]
>([
  generateUserState(),
  () => {
    /**/
  },
]);

function userReducer(state: UserState, action: { user?: FilteredUser | null | undefined }): UserState {
  if (action.user) {
    return { user: { ...action.user } };
  }
  return state;
}

const UserContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const [userState, userDispatch] = useReducer(userReducer, generateUserState());
  const { children } = props;
  return <UserContext.Provider value={[userState, userDispatch]}>{children}</UserContext.Provider>;
};

export { UserContext, UserContextProvider };
