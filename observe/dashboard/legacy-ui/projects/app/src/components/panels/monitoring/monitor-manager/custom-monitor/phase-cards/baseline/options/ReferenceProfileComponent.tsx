import { useRef, useEffect, useCallback, useState } from 'react';
import { SelectAutoCompleteWithLabel } from 'components/select-autocomplete/SelectAutoCompleteWithLabel';
import { useRecoilState } from 'recoil';
import { customMonitorAtom } from 'atoms/customMonitorAtom';
import { ISelectItem } from 'components/select-autocomplete/SelectAutoComplete';
import useGetReferenceProfilesList from 'hooks/useGetReferenceProfilesList';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import refProfileIcon from 'ui/ref-profile-icon.svg';
import { WhyLabsText } from 'components/design-system';
import { Loader } from '@mantine/core';
import useCustomMonitorManagerCSS from '../../../useCustomMonitorManagerCSS';
import { ColumnCardContentProps } from '../../phaseCard';
import ReadModeMonitorManager from '../../ReadModeMonitorManager';

// Referene profile  component
const ReferenceProfileComponent = ({
  setContentHeight,
  isPhaseActive,
  setHasChanged,
  setWidthSpan,
}: ColumnCardContentProps): JSX.Element => {
  const { classes: styles } = useCustomMonitorManagerCSS();
  const { modelId } = usePageTypeWithParams();
  const { referenceProfiles, loading, error } = useGetReferenceProfilesList(modelId);
  const ref = useRef<HTMLDivElement>(null);
  const [{ baselineProfileId }, setRecoilState] = useRecoilState(customMonitorAtom);
  const [refProfilesOptions, setRefProfilesOptions] = useState<ISelectItem[]>([]);
  const [selectedReferenceProfile, setSelectedReferenceProfile] = useState<ISelectItem | undefined>();
  const firstLoad = useRef<boolean>(true);
  const profileIntroText =
    refProfilesOptions.length > 0
      ? 'Select a static profile that has been uploaded via API.'
      : 'No static profiles available. Upload a static profile via API to set as a baseline.';

  useEffect(() => {
    if (firstLoad.current && !selectedReferenceProfile && refProfilesOptions.length > 0 && !loading) {
      const selectedItem = baselineProfileId ? refProfilesOptions.find((o) => o.value === baselineProfileId) : null;
      if (selectedItem) {
        setSelectedReferenceProfile(selectedItem);
      } else {
        onChangeReferenceProfile(refProfilesOptions[0]);
      }
      firstLoad.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refProfilesOptions.length, baselineProfileId, loading]);

  useEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.clientHeight || 0);
      setWidthSpan(2);
    }
    if (!ref.current) setWidthSpan(1);
  }, [ref.current?.clientHeight, setContentHeight, isPhaseActive, setWidthSpan]);

  useEffect(() => {
    function formatReferenceProfileForSelect() {
      return (
        referenceProfiles?.model?.referenceProfiles?.map((profile, index) => {
          return {
            label: profile.alias ? profile.alias : profile.id,
            value: profile.id,
            disabled: false,
            autoSelect: false,
            groupBy: 'Static profiles',
          };
        }) || []
      );
    }
    setRefProfilesOptions(formatReferenceProfileForSelect());
  }, [referenceProfiles]);

  const setBaselineProfileId = useCallback(
    (newValue: string) => {
      setRecoilState((prevState) => ({
        ...prevState,
        baselineProfileId: newValue,
      }));
    },
    [setRecoilState],
  );
  const onChangeReferenceProfile = (item: ISelectItem | null) => {
    if (item) {
      setSelectedReferenceProfile(item);
      setBaselineProfileId(item.value.toString());
    }
    setHasChanged(true);
  };

  if (loading)
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  if (error) console.error(`Fetching reference profile options for MV3 customizer component: ${error}`);
  if (!isPhaseActive) {
    const refProfileAlias = selectedReferenceProfile?.label ?? '';
    return <ReadModeMonitorManager label="Reference profile" text={refProfileAlias} />;
  }
  return (
    <div ref={ref} className={styles.columnCardContentWrap}>
      <div className={styles.columnCardFlex}>
        <div className={styles.columnCardContent}>
          <WhyLabsText inherit className={styles.columnCardTitle}>
            Reference profile
          </WhyLabsText>
          <WhyLabsText inherit className={styles.columnCardText}>
            {profileIntroText}
          </WhyLabsText>
          <div style={{ height: 62 }}>
            {!loading && selectedReferenceProfile && (
              <SelectAutoCompleteWithLabel
                id="referenceProfile"
                label="Reference profile"
                value={selectedReferenceProfile ?? undefined}
                onChange={onChangeReferenceProfile}
                options={refProfilesOptions}
                disabled={refProfilesOptions.length === 0}
                required
              />
            )}
          </div>
        </div>
        <div className={styles.columnCardGraphWrap}>
          <img src={refProfileIcon} alt="reference profile icon" />
        </div>
      </div>
    </div>
  );
};

export default ReferenceProfileComponent;
