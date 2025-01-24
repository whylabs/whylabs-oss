package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.core.structures.Org;
import lombok.val;
import org.apache.spark.api.java.function.MapFunction;
import scala.Tuple2;

public class V0DatalakeRowTimestampTruncate
    implements MapFunction<Tuple2<DatalakeRow, Org>, DatalakeRow> {

  @Override
  public DatalakeRow call(Tuple2<DatalakeRow, Org> value) throws Exception {
    val org = value._2();
    val row = value._1();

    if (org != null
        && org.getIngestionGranularity() != null
        && (org.getEnableGranularDataStorage() == null || !org.getEnableGranularDataStorage())) {
      row.setTs(
          ComputeJobGranularities.truncateByIngestionGranularity(
              org.getIngestionGranularity(), row.getTs()));
    } else {
      row.setTs(
          ComputeJobGranularities.truncateByIngestionGranularity(
              IngestionRollupGranularity.hourly, row.getTs()));
    }

    return row;
  }
}
