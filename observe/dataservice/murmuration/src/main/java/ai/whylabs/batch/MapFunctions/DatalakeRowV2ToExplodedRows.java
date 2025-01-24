package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.aggregation.ExplodedRowMerge;
import ai.whylabs.core.aggregation.V1ProfileFanoutImpl;
import ai.whylabs.core.collectors.MonitorConfigInMemoryRepo;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.BaselineTimerangePredicateExplodedRowV3;
import ai.whylabs.core.predicatesV3.inclusion.ActiveAnalyzerPredicate;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import java.io.File;
import java.nio.file.Files;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.spark.api.java.function.MapPartitionsFunction;

public class DatalakeRowV2ToExplodedRows
    implements MapPartitionsFunction<DatalakeRowV2, ExplodedRow> {
  private String configRepo;
  private ZonedDateTime currentTime;
  private long currentTimeMillis;

  public DatalakeRowV2ToExplodedRows(String configRepo, ZonedDateTime currentTime) {
    this.configRepo = configRepo;
    this.currentTime = currentTime;
    this.currentTimeMillis = currentTime.toInstant().toEpochMilli();
  }

  @Override
  public Iterator<ExplodedRow> call(Iterator<DatalakeRowV2> input) throws Exception {
    if (configRepo.startsWith("s3")) {
      val ob = new S3ContentFetcher().get(configRepo);
      byte[] byteArray = IOUtils.toByteArray(ob.getContentStream());
      val repo = new MonitorConfigInMemoryRepo(byteArray);
      return new FilterIterator(input, repo);
    } else {
      byte[] fileContent = Files.readAllBytes(new File(configRepo).toPath());
      val repo = new MonitorConfigInMemoryRepo(fileContent);
      return new FilterIterator(input, repo);
    }
  }

  private class FilterIterator implements Iterator<ExplodedRow> {
    private Iterator<DatalakeRowV2> input;
    private MonitorConfigInMemoryRepo repo;
    ActiveAnalyzerPredicate activeAnalyzerPredicate = new ActiveAnalyzerPredicate();
    private V1ProfileFanoutImpl fanout = new V1ProfileFanoutImpl();
    private LinkedList<ExplodedRow> queue = new LinkedList<>();
    private ExplodedRowMerge merge = new ExplodedRowMerge();
    FeaturePredicate featurePredicate = new FeaturePredicate();

    public FilterIterator(Iterator<DatalakeRowV2> input, MonitorConfigInMemoryRepo repo) {
      this.input = input;
      this.repo = repo;
    }

    @SneakyThrows
    @Override
    public boolean hasNext() {
      while (input.hasNext()) {
        val next = input.next();

        if (next.getOrgId() == null || next.getDatasetId() == null) {
          continue;
        }

        if (next.getMetrics() == null || next.getMetrics().size() == 0) {
          continue;
        }

        if (next.getType().equals(ProfileColumnType.RAW)) {
          continue;
        }

        val conf = repo.get(next.getOrgId(), next.getDatasetId());
        if (conf == null || conf.getAnalyzers() == null || conf.getAnalyzers().size() == 0) {
          continue;
        }
        if (!activeAnalyzerPredicate.test(conf)) {
          continue;
        }

        if (!testAnalyzers(conf, next.getColumnName(), next.getSegmentText())) {
          continue;
        }

        val i = fanout.call(next, conf, currentTime);
        while (i.hasNext()) {
          val exploded = i.next();
          // if (checkRelevancy(conf, exploded)) {
          queue.offer(exploded);
          // }
        }

        if (queue.size() > 1000) {
          return true;
        }
      }

      return queue.size() > 0;
    }

    /** Check if any analyzers care about this row. If not, we can avoid shuffling it around */
    private boolean testAnalyzers(MonitorConfigV3 config, String column, String segmentText) {
      if (config.getEntitySchema() == null || config.getEntitySchema().getColumns() == null) {
        return true;
      }
      val schema = config.getEntitySchema().getColumns().get(column);
      if (schema == null) {
        // If the inference hasn't happened yet and we have to infer, assume it can't be filtered
        // out as the inference needs to be performed in in a post-aggregated phase
        return true;
      }

      for (val analyzer : config.getAnalyzers()) {

        // check if any analyzers care about this feature
        if (featurePredicate.test(
            analyzer,
            config.getEntitySchema().getColumns().get(column),
            column,
            MatchingSegmentFactory.getFieldWeight(
                config,
                Segment.builder().tags(SegmentUtils.parseSegmentV3(segmentText)).build(),
                column))) {
          return true;
        }
      }
      return false;
    }

    /**
     * WIP: Data older than any target+baseline could be dropped and skip the shuffle. This needs to
     * be done very carefully, so I'm waiting til I can flesh it out + add some really detailed unit
     * tests.
     *
     * @param config
     * @param row
     * @return
     */
    private boolean checkRelevancy(MonitorConfigV3 config, ExplodedRow row) {
      if (!StringUtils.isEmpty(row.getProfileId())) {
        // Don't mess with ref profiles
        return true;
      }
      if (row.getTs() > currentTimeMillis - 7776000000l) {
        // Don't mess with most recent 90d. Like don't even bother with the baseline maths
        return true;
      }
      if (row.getLastUploadTs() > currentTimeMillis - 1209600000l) {
        // Don't mess with uploads in the last 14d
        return true;
      }
      /* TODO: You know if it was a recently updated analyzer thus potentially needing some backfill
      for(val a : config.getAnalyzers()) {
        if(a.getMetadata().getUpdatedTimestamp())
      }

       */

      // TODO: Backfill api check

      val lateWindowDays = ComputeJobGranularities.getLargestDuration(config);
      for (val a : config.getAnalyzers()) {
        val baselinePredicate =
            new BaselineTimerangePredicateExplodedRowV3(
                currentTimeMillis,
                config.getGranularity(),
                new Long(lateWindowDays.toDays()).intValue(),
                a.getBaseline(),
                a.getTargetSize());
        if (baselinePredicate.test(row)) {
          // It's older data uploaded recently and a baseline cares about it
          return true;
        }
      }

      return false;
    }

    @Override
    public ExplodedRow next() {
      return queue.poll();
    }
  }
}
