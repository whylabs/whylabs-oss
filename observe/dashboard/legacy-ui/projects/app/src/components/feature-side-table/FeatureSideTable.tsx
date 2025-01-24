import { usePagingInfo } from 'hooks/usePagingInfo';
import SkinnyTableRenderer, { FeatureData } from 'components/controls/SkinnyTableRenderer';
import SkinnyTableBottomPagination from 'components/controls/table/SkinnyTableBottomPagination';

interface FeatureSideTableProps {
  loading: boolean;
  features: FeatureData[];
  totalCount: number;
  onFeatureClick: (feature: string) => void;
}

function FeatureSideTable({ features, loading, totalCount, onFeatureClick }: FeatureSideTableProps): JSX.Element {
  const { setPage, pagingInfo, page } = usePagingInfo();

  return (
    <>
      <SkinnyTableRenderer visibleData={features} loading={loading} onFeatureClick={onFeatureClick} />
      <SkinnyTableBottomPagination
        loading={loading}
        page={page}
        onChangePage={setPage}
        rowCount={totalCount}
        rowsPerPage={pagingInfo.limit}
      />
    </>
  );
}

export default FeatureSideTable;
