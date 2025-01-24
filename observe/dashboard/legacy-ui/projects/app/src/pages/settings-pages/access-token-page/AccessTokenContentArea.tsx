import { useEffect, useRef, useState } from 'react';
import {
  Button,
  CircularProgress,
  createStyles,
  FormControl,
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@material-ui/core';
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FileCopy from '@material-ui/icons/FileCopy';
import { Alert, AlertTitle, Skeleton } from '@material-ui/lab';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import cx from 'classnames';
import CustomDatePicker from 'components/form-fields/CustomDatePicker';
import CustomTextInput from 'components/form-fields/CustomTextInput';
import { addNDays, dateOnly } from 'utils/dateUtils';
import { getUTCEndOfDay } from 'utils/dateRangeUtils';
import ExternalLink from 'components/link/ExternalLink';
import {
  AccessTokenMetadata,
  RequestableTokenScope,
  RevokeAccessTokenMutationVariables,
  SubscriptionTier,
  useGenerateNewAccessTokenMutation,
  useGetAllAccessTokensQuery,
  useRevokeAccessTokenMutation,
} from 'generated/graphql';
import { apiKeyLimit } from 'limits';
import { useUserContext } from 'hooks/useUserContext';
import { canManageTokens } from 'utils/permissionUtils';
import { WhyLabsTooltip } from 'components/design-system';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';

const useKeysPageContentStyles = makeStyles(() =>
  createStyles({
    pageRootWrap: {
      overflowY: 'auto',
      maxHeight: '100%',
      height: '100%',
    },
    keysPageRoot: {
      display: 'grid',
      height: '100%',
      backgroundColor: Colors.white,
      padding: `30px ${Spacings.pageLeftPaddingLarge}px 40px`,
      gridGap: 35,
      gridTemplateColumns: '2fr 3fr',
      '@media (max-width:1250px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto',
        gridGap: 25,
        height: 'auto',
      },
    },
    blockText: {
      fontSize: 14,
    },
    contentSide: {
      display: 'flex',
      flexDirection: 'column',
    },
    tableSide: {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexGrow: 1,
    },
    loader: {
      marginLeft: 8,
    },
    title: {
      fontWeight: 600,
      fontSize: '16px',
      lineHeight: '24px',
      marginBottom: '16px',
    },
    inputsWrapper: {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '3fr 2fr',
      gridGap: 20,
      margin: '16px 0',
    },
    inputWrapper: {
      display: 'flex',
      flexDirection: 'column',
    },
    textInput: {
      '& input': {
        height: 40,
      },
      '& fieldset': {
        height: 40,
      },
    },
    inputLabel: {
      marginBottom: 4,
      fontSize: 14,
      '& span': {
        fontSize: 12,
      },
    },
    generateInput: {
      height: 40,
      fontSize: 14,
      fontFamily: 'asap',
      padding: '8px 10px',
      border: `1px solid ${Colors.brandSecondary200}`,
      borderRadius: 4,
      width: '100%',
      '&:focus': {
        outline: 'none',
      },
      '&::placeholder': {
        textTransform: 'uppercase',
        color: Colors.brandSecondary400,
        opacity: 1,
      },
    },
    newAccessTokenInput: {
      backgroundColor: Colors.brandPrimary100,
      marginBottom: 4,
    },
    relativeInputWrap: {
      position: 'relative',
    },
    dateInputIconWrap: {
      position: 'absolute',
      right: 8,
      top: '50%',
      translateY: '-50%',
      '& .MuiIconButton-root': {
        color: Colors.brandSecondary400,
      },
    },
    table: {
      '& thead': {
        backgroundColor: Colors.brandSecondary100,
        '& th': {
          fontWeight: 600,
        },
      },
      '& th:first-of-type': {
        paddingLeft: 14,
      },
    },
    tableWrap: {
      minHeight: '420px',
    },
    tableFirstColumn: {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      maxWidth: 280,
    },
    tableItemFirstColumHead: {
      maxWidth: 280,
      width: '100%',
    },
    tableTitle: { margin: 0 },
    tableItemText: {
      color: Colors.brandSecondary900,
      minWidth: 55,
    },
    submitBtn: {
      marginTop: 25,
      padding: '7px 15px',
      backgroundColor: Colors.yellow,
      border: `1px solid ${Colors.secondaryLight1000}`,
      textTransform: 'none',
      color: Colors.secondaryLight1000,
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    limitAlert: {
      marginTop: 25,
    },
    unclickable: { pointerEvents: 'none' },
    copyBtn: {
      position: 'absolute',
      width: 100,
      height: 40,
      right: 0,
      top: 0,
      textTransform: 'capitalize',
      borderRadius: 4,
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      border: `1px solid ${Colors.brandSecondary200}`,
      backgroundColor: Colors.white,
      color: Colors.brandPrimary700,

      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      '& svg': {
        width: 20,
        height: 20,
      },
      '& p': {
        lineHeight: '20px',
        marginLeft: 8,
      },
      '&:focus, &:active': {
        outline: 'none',
      },
    },
    revokeBtn: {
      color: Colors.red,
      border: `1px solid ${Colors.red}`,
      padding: '8px 10px',
      fontSize: 12,
      '& span': {
        lineHeight: '14px',
      },
    },
    dialogTitle: {
      padding: 0,
      fontSize: 16,
      fontWeight: 600,
      color: Colors.secondaryLight1000,
    },
    dialogText: {
      fontSize: 14,
      color: Colors.secondaryLight1000,
    },
    dialogButton: {
      fontSize: 14,
      fontWeight: 600,
      color: Colors.blue,
    },
    dialogButtonCancel: {
      color: Colors.secondaryLight1000,
    },
    tableItemPlaceholder: {
      margin: 0,
      padding: 14,
      borderBottom: `1px solid ${Colors.brandSecondary200}`,
      fontSize: 12,
      lineHeight: 1,
      color: Colors.brandSecondary900,
      textAlign: 'center',
    },
    datePickerPopper: {
      '& .MuiPaper-root': {
        backgroundColor: Colors.white,
      },

      '& .MuiPickersCalendarHeader-monthTitleContainer': {
        cursor: 'auto',
      },

      '& .MuiPickersArrowSwitcher-iconButton': {
        backgroundColor: 'transparent',
      },

      '& .MuiPickersDay-root': {
        color: Colors.secondaryLight1000,
        backgroundColor: 'transparent',
        border: `1px solid ${Colors.white}`,
        transition: 'background-color 300ms linear, color 300ms linear, border-color 300ms linear',

        '&.MuiPickersDay-today': {
          border: `1px solid ${Colors.brandPrimary700}`,
        },

        '&.Mui-selected': {
          backgroundColor: Colors.brandPrimary700,
          border: `1px solid ${Colors.white}`,
          color: Colors.white,
        },

        '&.Mui-disabled': {
          color: Colors.brandSecondary600,
          backgroundColor: Colors.brandSecondary100,
        },

        '&:hover': {
          border: `1px solid ${Colors.brandPrimary700}`,
        },
      },
    },
    dateErorrMsg: {
      position: 'absolute',
      top: 'calc(100% + 5px)',
      right: 0,
      color: Colors.red,
      fontSize: 12,
    },
    bulletPoint: {
      margin: '0 15px',
    },
    orgIdHighlight: {
      fontWeight: 600,
    },
    tokenHelperTextWrapper: {
      margin: '5px 0 30px',
    },
    headerWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: '40px',
    },
    headerOrg: {
      display: 'flex',
      alignItems: 'center',
    },
    headerOrgText: {
      marginRight: '5px',
      fontFamily: 'Asap',
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontSize: '15px',
      lineHeight: '14px',
    },
    skeletonText: {
      height: '1.7rem',
    },
    skeletonBtn: {
      width: 70,
      height: '2rem',
      margin: 0,
      borderRadius: 4,
    },
  }),
);

interface INewAccessTokenPayload {
  tokenName: string;
  expiresAt?: number | null;
}

const CREATE_TOKEN_ERROR_MESSAGE = 'Token creation failed';
const PERMISSION_MESSAGE = 'You do not have permission to manage API tokens for this organization.';

function accessTokenLimitReached(n: number, tier: SubscriptionTier | null | undefined) {
  return n >= apiKeyLimit && tier !== SubscriptionTier.Paid;
}

interface CreateAccessTokenButtonProps {
  readonly generateLoading: boolean;
  readonly allAccessTokensLoading: boolean;
  readonly isDateWrong: boolean;
  readonly newAccessToken: INewAccessTokenPayload;
  readonly accesstokenCount: number;
  readonly tier?: SubscriptionTier | null;
  readonly userCanManageTokens?: boolean;
}
function CreateAccessTokenButton(props: CreateAccessTokenButtonProps) {
  const classes = useKeysPageContentStyles();
  const {
    generateLoading,
    allAccessTokensLoading,
    newAccessToken,
    isDateWrong,
    accesstokenCount,
    tier,
    userCanManageTokens,
  } = props;

  if (accessTokenLimitReached(accesstokenCount, tier)) {
    return (
      <Alert severity="info" className={classes.limitAlert}>
        <AlertTitle>Access token limit reached</AlertTitle>
        You need to remove an existing access token before you can create a new one. If you need more access tokens than
        currently supported, please <ExternalLink to="contactLink">contact us</ExternalLink> to discuss your needs.
      </Alert>
    );
  }

  return (
    <WhyLabsTooltip label={userCanManageTokens ? '' : PERMISSION_MESSAGE}>
      <Button
        className={classes.submitBtn}
        variant="outlined"
        color="primary"
        type="submit"
        disabled={
          !userCanManageTokens ||
          generateLoading ||
          allAccessTokensLoading ||
          newAccessToken.tokenName.length === 0 ||
          isDateWrong
        }
      >
        Create access token
        {generateLoading && <CircularProgress size={20} />}
      </Button>
    </WhyLabsTooltip>
  );
}

type SortColumn = 'none' | 'name' | 'created' | 'expires';
type Order = 'asc' | 'desc';

export default function AccessTokenPageContentArea(): JSX.Element {
  const [sortColumn, setSortColumn] = useState<SortColumn>('none');
  const [order, setOrder] = useState<Order>('asc');

  useSetHtmlTitle('Access tokens');

  const classes = useKeysPageContentStyles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tokenForRemoval, setTokenForRemoval] = useState<string>();
  const defaultTokenForRevoke: RevokeAccessTokenMutationVariables = {
    tokenId: '',
    userId: '',
  };
  const clickedTokenIdForRevokeRef = useRef<RevokeAccessTokenMutationVariables>(defaultTokenForRevoke);
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const {
    data: allAccessTokens,
    loading: allAccessTokensLoading,
    refetch: refetchAllAccessTokens,
    error: errorAllAccessTokens,
  } = useGetAllAccessTokensQuery();
  const [newAccessToken, setNewAccessToken] = useState<INewAccessTokenPayload>({
    tokenName: '',
    expiresAt: null,
  });
  const [createdAccessToken, setCreatedAccessToken] = useState<AccessTokenMetadata | null>(null);
  const [isDateWrong, setIsDateWrong] = useState<boolean>(false);
  const scopes = [RequestableTokenScope.User];
  const [generateNewAccessToken, { loading: generateLoading, data: generateData }] = useGenerateNewAccessTokenMutation({
    variables: {
      tokenName: '',
      expiresAt: null,
      scopes,
    },
  });
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const tier = user?.organization?.subscriptionTier;
  const userCanManageTokens = canManageTokens(user);

  if (errorAllAccessTokens) {
    console.error(errorAllAccessTokens);
  }
  const [revokeAccessToken, { data: revokeData }] = useRevokeAccessTokenMutation();

  function resetNewAccessToken() {
    setNewAccessToken({
      tokenName: '',
      expiresAt: null,
    });
  }

  function onSubmitNewToken({ tokenName, expiresAt }: INewAccessTokenPayload) {
    const endOfExpirationDay = expiresAt ? getUTCEndOfDay(expiresAt).getTime() : undefined;
    generateNewAccessToken({
      variables: {
        tokenName,
        expiresAt: endOfExpirationDay,
      },
    })
      .then(() => {
        refetchAllAccessTokens();
        resetNewAccessToken();
      })
      .catch((err) => {
        console.error(`Creating access token failed ${err}`);

        enqueueSnackbar({ title: CREATE_TOKEN_ERROR_MESSAGE, variant: 'error' });
      });
  }
  function onCopy() {
    navigator.clipboard.writeText(createdAccessToken?.secret || 'undefined').then(() =>
      enqueueSnackbar({
        title: 'Token copied to clipboard!',
      }),
    );
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    clickedTokenIdForRevokeRef.current = defaultTokenForRevoke;
    setTokenForRemoval(undefined);
  }

  function handleOpenDialog(tokenId: string, userId: string) {
    if (!tokenId) return;

    clickedTokenIdForRevokeRef.current = { tokenId, userId };
    setIsDialogOpen(true);
    setTokenForRemoval(tokenId);
  }

  function onRevokeToken(variables: RevokeAccessTokenMutationVariables) {
    revokeAccessToken({ variables }).then(() => {
      refetchAllAccessTokens();
      handleCloseDialog();
    });
  }

  useEffect(() => {
    if (generateData?.accessToken?.generate) setCreatedAccessToken(generateData.accessToken.generate);
  }, [generateData]);

  useEffect(() => {
    if (revokeData) {
      if (revokeData.accessToken.revoke) {
        enqueueSnackbar({
          title: 'Access token successfully revoked',
        });
      } else {
        enqueueSnackbar({
          title: 'Access token revoke failed.',
          variant: 'error',
        });
      }
    }
  }, [revokeData, enqueueSnackbar]);

  function getOrganizationId() {
    return user?.organization?.id;
  }

  function getOrganizationName() {
    return user?.organization?.name;
  }

  function handleSortUpdate(column: SortColumn) {
    if (column === 'none') {
      setSortColumn('none');
      setOrder('asc');
      return;
    }
    if (column === sortColumn) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setOrder('asc');
    }
  }

  const displayableTokens = allAccessTokens?.accessTokens ?? [];
  if (sortColumn !== 'none') {
    displayableTokens.sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'created':
          return order === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
        case 'expires':
          return order === 'asc'
            ? (a.expiresAt ?? Number.MAX_SAFE_INTEGER) - (b.expiresAt ?? Number.MAX_SAFE_INTEGER)
            : (b.expiresAt ?? Number.MAX_SAFE_INTEGER) - (a.expiresAt ?? Number.MAX_SAFE_INTEGER);
        default:
          return 0;
      }
    });
  }

  return (
    <div className={classes.pageRootWrap}>
      <div className={classes.keysPageRoot}>
        <div className={classes.contentSide}>
          <Typography component="h2" className={classes.title}>
            Add an access token
          </Typography>
          <Typography component="p" className={classes.blockText}>
            You can generate access tokens for each ML application you use that needs access to the WhyLabs API.
          </Typography>
          <br />
          <Typography component="p" className={classes.blockText}>
            Enter the name of your application below, and we will return a unique access token.
          </Typography>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitNewToken(newAccessToken);
            }}
          >
            <div className={classes.inputsWrapper}>
              <WhyLabsTooltip label={userCanManageTokens ? '' : PERMISSION_MESSAGE}>
                <CustomTextInput
                  disabled={
                    !userCanManageTokens || accessTokenLimitReached(allAccessTokens?.accessTokens.length ?? 0, tier)
                  }
                  className={classes.textInput}
                  id="inputTokenName"
                  value={newAccessToken.tokenName}
                  onChange={(e) =>
                    setNewAccessToken({ tokenName: e.target.value, expiresAt: newAccessToken.expiresAt })
                  }
                  label="Name"
                />
              </WhyLabsTooltip>

              <CustomDatePicker
                id="inputTokenExpire"
                disabled={
                  !userCanManageTokens || accessTokenLimitReached(allAccessTokens?.accessTokens.length ?? 0, tier)
                }
                minDate={addNDays(Date.now(), 1)}
                value={newAccessToken.expiresAt}
                onChange={(timestamp) => {
                  const expirationDate = Number(timestamp) === 0 ? null : Number(timestamp);
                  setIsDateWrong(timestamp?.toString() === 'Invalid Date');
                  setNewAccessToken({ tokenName: newAccessToken.tokenName, expiresAt: expirationDate });
                }}
                onError={(errMsg: string | null) => {
                  setIsDateWrong(!!errMsg);
                }}
                label={
                  <>
                    Expires&nbsp;
                    <span style={{ fontWeight: 300, fontSize: 12 }}>optional</span>
                  </>
                }
              />
              {isDateWrong && (
                <Typography className={classes.dateErorrMsg}>The expiry must be a valid date in the future</Typography>
              )}
            </div>
            <div>
              <Typography component="h2" className={classes.title}>
                Scopes
              </Typography>
              <Typography component="p" className={classes.blockText}>
                Access tokens enable all platform capabilities for this organization.
              </Typography>
            </div>
            <CreateAccessTokenButton
              allAccessTokensLoading={allAccessTokensLoading}
              generateLoading={generateLoading}
              isDateWrong={isDateWrong}
              newAccessToken={newAccessToken}
              accesstokenCount={allAccessTokens?.accessTokens.length ?? 0}
              tier={tier}
              userCanManageTokens={userCanManageTokens}
            />
          </form>
        </div>

        <div className={classes.contentSide}>
          {createdAccessToken?.secret && (
            <div>
              <FormControl className={classes.inputWrapper}>
                <Typography component="h2" className={classes.title}>
                  New access token
                </Typography>
                <div className={classes.relativeInputWrap}>
                  <input
                    readOnly
                    className={cx(classes.generateInput, classes.newAccessTokenInput)}
                    value={createdAccessToken.secret}
                    aria-describedby="createdTokenId-text"
                    required
                  />
                  <Button className={classes.copyBtn} onClick={onCopy}>
                    <FileCopy />
                    <Typography component="p" className={classes.blockText}>
                      COPY
                    </Typography>
                  </Button>
                </div>
              </FormControl>
              <div className={cx(classes.blockText, classes.tokenHelperTextWrapper)}>
                <Typography component="p" className={classes.blockText}>
                  <span className={classes.bulletPoint}>•</span> Make sure you save the token, as you won’t be able to
                  access it again after closing the page
                </Typography>
                <Typography component="p" className={classes.blockText}>
                  <span className={classes.bulletPoint}>•</span> You will need to reference the org ID{' '}
                  <span className={classes.orgIdHighlight}>&quot;{getOrganizationId()}&quot;</span> when using the token
                </Typography>
              </div>
            </div>
          )}
          <div className={classes.tableSide}>
            <div className={classes.headerWrapper}>
              <Typography component="h2" className={cx(classes.title, classes.tableTitle)}>
                Active access tokens for {getOrganizationName()} organization
              </Typography>
              <div className={classes.headerOrg}>
                <Typography component="h2" className={classes.headerOrgText}>
                  Organization ID:{' '}
                </Typography>
                <Chip label={getOrganizationId()} size="small" />
              </div>
            </div>
            <TableContainer className={classes.tableWrap}>
              <Table className={classes.table} aria-label="customized table">
                <TableHead>
                  <TableRow>
                    <TableCell
                      component="th"
                      scope="row"
                      className={cx(classes.tableItemText, classes.tableItemFirstColumHead)}
                    >
                      <TableSortLabel
                        active={sortColumn === 'name'}
                        direction={sortColumn === 'name' ? order : 'asc'}
                        onClick={() => handleSortUpdate('name')}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell className={classes.tableItemText}>ID</TableCell>
                    <TableCell className={classes.tableItemText}>
                      <TableSortLabel
                        active={sortColumn === 'created'}
                        direction={sortColumn === 'created' ? order : 'asc'}
                        onClick={() => handleSortUpdate('created')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell className={classes.tableItemText}>
                      <TableSortLabel
                        active={sortColumn === 'expires'}
                        direction={sortColumn === 'expires' ? order : 'asc'}
                        onClick={() => handleSortUpdate('expires')}
                      >
                        Expires
                      </TableSortLabel>
                    </TableCell>
                    <TableCell className={classes.tableItemText}>Scope</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!allAccessTokens?.accessTokens &&
                    allAccessTokensLoading &&
                    Array.from({ length: 12 }).map((_, skeletonIndex) => (
                      /* eslint-disable react/no-array-index-key */
                      <TableRow key={`skeleton-row-${skeletonIndex}`}>
                        <TableCell component="th" scope="row" className={classes.tableFirstColumn}>
                          <Skeleton variant="text" className={classes.skeletonText} />
                        </TableCell>
                        {Array.from({ length: 4 }).map((__, skeletonNestedIndex) => (
                          /* eslint-disable react/no-array-index-key */
                          <TableCell key={`skeleton-row-${skeletonIndex}-text-cell-${skeletonNestedIndex}`}>
                            <Skeleton variant="text" className={classes.skeletonText} />
                          </TableCell>
                        ))}
                        <TableCell align="right">
                          <Skeleton variant="rect" className={classes.skeletonBtn} />
                        </TableCell>
                      </TableRow>
                    ))}
                  {displayableTokens.map((token) => (
                    <TableRow key={`token-id-${token.id}`}>
                      <TableCell component="th" scope="row" className={classes.tableFirstColumn}>
                        {token.name}
                      </TableCell>
                      <TableCell>{token.id}</TableCell>
                      <TableCell>{dateOnly(token.createdAt)}</TableCell>
                      <TableCell>{token.expiresAt ? dateOnly(token.expiresAt) : 'Never'}</TableCell>
                      <TableCell>No restrictions</TableCell>
                      <TableCell align="right">
                        <WhyLabsTooltip label={userCanManageTokens ? '' : PERMISSION_MESSAGE}>
                          <Button
                            className={classes.revokeBtn}
                            variant="outlined"
                            onClick={() => handleOpenDialog(token.id, token.userId)}
                            disabled={!userCanManageTokens}
                          >
                            REVOKE
                          </Button>
                        </WhyLabsTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!displayableTokens.length && !allAccessTokensLoading && (
                <Typography component="div" className={classes.tableItemPlaceholder}>
                  There are no active tokens to show
                </Typography>
              )}
            </TableContainer>
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title" style={{ backgroundColor: Colors.white, padding: '20px 25px 10px' }}>
            <Typography component="p" className={classes.dialogTitle}>
              Revoke access token with ID {tokenForRemoval}?
            </Typography>
          </DialogTitle>
          <DialogContent style={{ backgroundColor: Colors.white, padding: '10px 25px' }}>
            <Typography id="alert-dialog-description" className={classes.dialogText}>
              This token will no longer be usable.
            </Typography>
          </DialogContent>
          <DialogActions style={{ backgroundColor: Colors.white, padding: '4px 25px 14px' }}>
            <Button onClick={handleCloseDialog} className={cx([classes.dialogButton, classes.dialogButtonCancel])}>
              CANCEL
            </Button>
            <Button onClick={() => onRevokeToken(clickedTokenIdForRevokeRef.current)} className={classes.dialogButton}>
              REVOKE TOKEN
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
