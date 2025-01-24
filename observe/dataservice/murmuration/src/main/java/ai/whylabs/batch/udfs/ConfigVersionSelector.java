package ai.whylabs.batch.udfs;

import java.util.Collections;
import java.util.List;
import org.apache.spark.sql.api.java.UDF2;
import scala.collection.mutable.WrappedArray;
import scala.jdk.CollectionConverters;

/**
 * Configs get edited all the time. Each time we run the pipeline we take the latest edit for that
 * hour and round up to the hour calling that the "bin". If you want to use the latest config you'd
 * grab the latest bin.
 *
 * <p>When backfilling we typically want to use the config as it looked on the day that that data
 * represents. This class selects the most recently updated config prior to the dataset timestamp.
 */
public class ConfigVersionSelector implements UDF2<Long, WrappedArray<Long>, Long> {

  /** Ignore config versioning and only use the latest config */
  private boolean useLatestConfig;

  public ConfigVersionSelector(boolean useLatestConfig) {
    this.useLatestConfig = useLatestConfig;
  }

  @Override
  public Long call(Long datasetTs, WrappedArray<Long> longs) throws Exception {
    return getTargetConfigBin(datasetTs, CollectionConverters.bufferAsJavaList(longs.toBuffer()));
  }

  public Long getTargetConfigBin(Long datasetTs, List<Long> bins) {
    Collections.sort(bins);

    if (useLatestConfig) {
      return bins.get(bins.size() - 1);
    }

    Long targetBin = bins.get(0);
    for (int x = 0; x < bins.size(); x++) {
      if (datasetTs < bins.get(x)) {
        return targetBin;
      } else {
        targetBin = bins.get(x);
      }
    }
    return bins.get(bins.size() - 1);
  }
}
