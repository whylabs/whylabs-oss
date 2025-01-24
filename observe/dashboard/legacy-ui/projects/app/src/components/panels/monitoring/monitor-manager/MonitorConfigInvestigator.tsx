import { useState } from 'react';
import { useGetMonitorConfigQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { Analyzer, Monitor } from 'generated/monitor-schema';
import WhyLabsCodeEditor from 'components/whylabs-code-block/WhyLabsCodeEditor';
import { getDashbirdErrors } from 'utils/error-utils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import useMonitorSchema from './hooks/useMonitorSchema';

export interface MonitorConfigInvestigatorProps {
  userCanEdit: boolean;
}

export default function MonitorConfigInvestigator({ userCanEdit }: MonitorConfigInvestigatorProps): JSX.Element {
  useSetHtmlTitle('Monitor configuration');

  const { modelId, monitorId } = usePageTypeWithParams();
  const { data, refetch } = useGetMonitorConfigQuery({ variables: { modelId } });
  const [isLoading, setIsLoading] = useState(false);
  const { updateMonitorAndAnalyzer } = useMonitorSchema({ modelId });
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const config = JSON.parse(data?.monitorConfig ?? '{}');
  const isWholeConfig = monitorId === '';

  const returnConfig = () => {
    if (monitorId) {
      const monitors: Monitor[] = config.monitors?.filter((mon: Monitor) => mon.id === monitorId) ?? undefined;
      const analyzerId = monitors?.[0].analyzerIds[0];
      const analyzers: Analyzer[] = config.analyzers?.filter((an: Analyzer) => an.id === analyzerId) ?? undefined;
      return { monitors, analyzers };
    }
    return config;
  };

  const updateConfig = async (
    newCode: string | undefined,
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    const code = JSON.stringify(returnConfig(), null, 4);

    const handleConfigUpdateErr = (err: unknown): void => {
      // attempt to grab the first known error for now (there could be more than one though)
      const dashbirdError = getDashbirdErrors(err)?.[0];
      if (dashbirdError) {
        // likely a schema validation error
        enqueueSnackbar({
          title: dashbirdError.extensions.safeErrorMsg,
          variant: 'error',
        });
        setIsEdit(false);
      } else if (err instanceof SyntaxError) {
        // failed to parse JSON
        enqueueSnackbar({
          variant: 'error',
          title: err.message,
        });
      } else {
        // unknown issue
        enqueueSnackbar({
          title: 'Error. Please refresh and try again.',
          variant: 'error',
        });
        setIsEdit(false);
      }
      setIsLoading(false);
    };

    if (newCode !== code && config.datasetId && newCode) {
      setIsLoading(true);
      if (monitorId !== '' && monitorId) {
        try {
          const jsonCode = JSON.parse(newCode);
          const analyzer = jsonCode.analyzers[0] ?? null;
          const monitor = jsonCode.monitors[0] ?? null;
          await updateMonitorAndAnalyzer({
            analyzer,
            monitor,
          });
          enqueueSnackbar({
            title: 'Analyzer and Monitor Updated Successfully',
          });
          await refetch();
          setIsLoading(false);
          setIsEdit(false);
        } catch (err) {
          handleConfigUpdateErr(err);
        }
      }
      // updating the whole config is no longer supported
    }
  };
  return (
    <>
      <WhyLabsCodeEditor
        code={JSON.stringify(returnConfig(), null, 4)}
        isLoading={isLoading}
        updateConfig={updateConfig}
        showEdit={!isWholeConfig}
        userCanEdit={userCanEdit}
        disabledMessage={'Select "View JSON" in the Monitors table to view and edit the config'}
      />
    </>
  );
}
