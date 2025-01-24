package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.collectors.MonitorConfigInMemoryRepo;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.predicatesV3.segment.OverallSegmentPredicate;
import ai.whylabs.core.predicatesV3.segment.TargetSegmentPredicate;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.structures.IngestionMetric;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import java.io.File;
import java.nio.file.Files;
import java.util.*;
import lombok.EqualsAndHashCode;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.hadoop.util.StringUtils;
import org.apache.spark.api.java.function.MapPartitionsFunction;
import org.apache.spark.sql.Row;

public class IngestionMetricSegmenter implements MapPartitionsFunction<Row, IngestionMetric> {

  private String configRepo;
  private long targetTimestamp;
  private Cache<CacheKey, Long> TIMESTAMP_CACHE;

  @EqualsAndHashCode
  private class CacheKey {
    private String orgId;
    private String datasetId;
    private String segment;

    public CacheKey(String orgId, String datasetId, String segment) {
      this.orgId = orgId;
      this.datasetId = datasetId;
      this.segment = segment;
    }
  }

  public IngestionMetricSegmenter(String configRepo, long targetTimestamp) {
    this.configRepo = configRepo;
    this.targetTimestamp = targetTimestamp;
  }

  @Override
  public Iterator<IngestionMetric> call(Iterator<Row> input) throws Exception {
    TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
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

  private class FilterIterator implements Iterator<IngestionMetric> {
    private Iterator<Row> input;
    private MonitorConfigInMemoryRepo repo;
    private TargetSegmentPredicate segmentPredicate = new TargetSegmentPredicate();
    private OverallSegmentPredicate overallSegmentPredicate = new OverallSegmentPredicate();
    private LinkedList<IngestionMetric> queue = new LinkedList();

    public FilterIterator(Iterator<Row> input, MonitorConfigInMemoryRepo repo) {
      this.input = input;
      this.repo = repo;
    }

    @Override
    public boolean hasNext() {
      while (input.hasNext()) {
        val next = input.next();
        String orgId = next.getAs(DatalakeRowV1.Fields.orgId);
        String datasetId = next.getAs(DatalakeRowV1.Fields.datasetId);

        if (orgId == null || datasetId == null) {
          continue;
        }

        if (next.getAs(DatalakeRowV1.Fields.type).equals(ProfileColumnType.RAW.name())) {
          continue;
        }

        val conf = repo.get(orgId, datasetId);
        if (conf == null || conf.getAnalyzers() == null || conf.getAnalyzers().size() == 0) {
          continue;
        }

        fillQueue(next);
        if (queue.size() > 1000) {
          return true;
        }
      }

      return queue.size() > 0;
    }

    private void fillQueue(Row row) {
      val b =
          IngestionMetric.builder()
              .orgId(row.getAs(DatalakeRowV1.Fields.orgId))
              .datasetId(row.getAs(DatalakeRowV1.Fields.datasetId))
              .lastUploadTs(row.getAs(DatalakeRowV1.Fields.lastUploadTs));
      if (row.getAs(DatalakeRowV1.Fields.lastUploadTs) == null) {
        b.lastUploadTs(0l);
      }

      String segmentText = row.getAs(DatalakeRowV1.Fields.segmentText);
      if (segmentText != null) {
        b.tags(Arrays.asList(StringUtils.split(segmentText, '&')));
      }

      val lastUploadMetric = b.build();

      lastUploadMetric.setTargetTimestamp(targetTimestamp);
      List<String> tagList = lastUploadMetric.getTags();
      if (tagList == null) {
        tagList = new ArrayList<>();
      }

      val tags = SegmentUtils.parseTagsV3(tagList);

      Map<String, Segment> applicableSegments =
          MatchingSegmentFactory.getApplicableSegmentsForProfile(
              repo.get(lastUploadMetric.getOrgId(), lastUploadMetric.getDatasetId()).getAnalyzers(),
              tags);

      if (lastUploadMetric.getLastUploadTs() > 0) {
        // Old data doesn't have the upload ts populated, don't monitor those metrics
        for (val segment : applicableSegments.keySet()) {
          // We maintain a cache of the Max metric, so we don't have to shuffle output rows that we
          // know are not the latest
          val cacheKey =
              new CacheKey(
                  lastUploadMetric.getOrgId(),
                  lastUploadMetric.getDatasetId(),
                  lastUploadMetric.getSegment());
          val ts = TIMESTAMP_CACHE.getIfPresent(cacheKey);
          if (ts == null || ts < lastUploadMetric.getLastUploadTs()) {
            queue.add(lastUploadMetric.toBuilder().segment(segment).build());
            TIMESTAMP_CACHE.put(cacheKey, lastUploadMetric.getLastUploadTs());
          }
        }
      }
    }

    public IngestionMetric next() {
      return queue.poll();
    }
  }
}
