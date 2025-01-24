import { AnalysisDataFragment, useSetFalseAlarmMutation } from 'generated/graphql';

type HookReturn = [(alerts: AnalysisDataFragment[]) => Promise<void>];
export const useMarkAlertUnhelpful = (): HookReturn => {
  const [setFalseAlarmMutation] = useSetFalseAlarmMutation();
  return [
    async (alerts: AnalysisDataFragment[]) => {
      const hasFalseAlarms = alerts.find((al) => al.isFalseAlarm);
      await Promise.all(
        alerts.map((al) => {
          const alert = al;
          const id = alert.analysisId;

          if (id) {
            alert.isFalseAlarm = !hasFalseAlarms;
            return setFalseAlarmMutation({
              variables: {
                alertId: id,
                isFalseAlarm: !hasFalseAlarms,
              },
            });
          }
          return undefined;
        }),
      );
    },
  ];
};
