import { useEffect, useMemo, useRef } from 'react';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { useRecoilState } from 'recoil';
import { SafeLink } from '@whylabs/observatory-lib';
import { WhyLabsMultiSelect, WhyLabsText } from 'components/design-system';
import { GlobalAction } from 'generated/monitor-schema';
import { useGetGlobalActionsQuery } from 'generated/graphql';
import { ColumnCardContentProps } from '../phaseCard';
import useCustomMonitorManagerCSS from '../../useCustomMonitorManagerCSS';
import ReadModeMonitorManager from '../ReadModeMonitorManager';
import NotificationsMode from './NotificationsMode';
import { notificationsModeOptions } from '../../CustomMonitorTypes';

// phase IV card II
const GlobalActionsCard = ({ setContentHeight, isPhaseActive, setHasChanged }: ColumnCardContentProps): JSX.Element => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const { getNavUrl } = useNavLinkHandler();
  const [{ actions, notificationsMode }, setRecoilState] = useRecoilState(customMonitorAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
    }
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, actions]);
  const { data, loading, error } = useGetGlobalActionsQuery();
  if (error) {
    console.error('Error loading global actions', error);
  }
  const actionsList = useMemo(() => {
    return data?.globalActions?.listGlobalActions?.map(({ id }) => id) ?? [];
  }, [data?.globalActions?.listGlobalActions]);

  if (!isPhaseActive) {
    const completeActionsText = actions.length === 0 ? 'No notifications' : actions.map((a) => a.target).join(', ');
    const completeModeText =
      notificationsModeOptions.find((o) => o.value === notificationsMode)?.shortDescription ?? '-';
    return (
      <div className={styles.closedFlexCard}>
        <ReadModeMonitorManager label="Notifications" text={completeActionsText} />
        <ReadModeMonitorManager label="Message volume" text={completeModeText} />
      </div>
    );
  }

  return (
    <div className={styles.columnCardContentWrap}>
      <div ref={ref} className={styles.flexCard}>
        <div className={cx(styles.childFlexCard, styles.cardFlexColumn)}>
          <WhyLabsText className={styles.columnCardTitle}>Notifications</WhyLabsText>
          <WhyLabsText className={styles.columnCardText}>
            Select the notification actions to broadcast notifications from this monitor:
          </WhyLabsText>
          <div className={styles.multiSelectWrapper}>
            <WhyLabsMultiSelect
              label="Actions"
              maxInputHeight={116}
              data={actionsList}
              loading={loading}
              value={actions.map(({ target }) => target)}
              onChange={(actionIds) => {
                setHasChanged(true);
                const updatedActions: GlobalAction[] = actionIds.map((target) => ({ type: 'global', target }));
                setRecoilState((prevState) => ({ ...prevState, actions: updatedActions }));
              }}
            />
          </div>
          <WhyLabsText className={styles.columnCardText}>
            Edit notification actions settings{' '}
            <SafeLink sameTab={false} href={getNavUrl({ page: 'settings', settings: { path: 'notifications' } })}>
              here
            </SafeLink>
            .
          </WhyLabsText>
        </div>
        <div className={styles.childFlexCard}>
          <NotificationsMode />
        </div>
      </div>
    </div>
  );
};

export default GlobalActionsCard;
