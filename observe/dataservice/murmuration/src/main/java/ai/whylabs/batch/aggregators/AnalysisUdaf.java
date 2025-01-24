package ai.whylabs.batch.aggregators;

import ai.whylabs.core.aggregation.ExplodedRowsToAnalyzerResultsV3;
import ai.whylabs.core.aggregation.IngestionMetricToExplodedRow;
import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.collectors.ExplodedRowCollectorV3;
import ai.whylabs.core.collectors.MonitorConfigInMemoryRepo;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import com.amazonaws.SdkClientException;
import com.google.common.base.Objects;
import java.io.File;
import java.nio.file.Files;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

@Getter
@Slf4j
public class AnalysisUdaf extends Aggregator<ExplodedRow, AnalysisBuffer, AnalysisOutputBuffer> {

  protected ZonedDateTime currentTime;
  protected String runId;
  protected boolean overwriteEvents;
  protected ExplodedRowsToAnalyzerResultsV3 explodedRowsToMonitorMetrics;
  protected String embedableImageBasePath;
  protected transient MonitorConfigInMemoryRepo repo;
  protected String configRepo;
  protected long currentTimeMillis;

  public AnalysisUdaf(
      ZonedDateTime currentTime,
      String runId,
      boolean overwriteEvents,
      String embedableImageBasePath,
      String configRepo) {
    this.currentTime = currentTime;
    this.runId = runId;
    this.overwriteEvents = overwriteEvents;
    this.embedableImageBasePath = embedableImageBasePath;
    this.configRepo = configRepo;
    this.currentTimeMillis = currentTime.toInstant().toEpochMilli();
  }

  @SneakyThrows
  protected MonitorConfigInMemoryRepo getRepo() {
    if (repo != null) {
      return repo;
    }
    if (configRepo.startsWith("s3")) {
      for (int tries = 1; tries < 5; tries++) {
        try {
          val ob = new S3ContentFetcher().get(configRepo);
          byte[] byteArray = IOUtils.toByteArray(ob.getContentStream());
          repo = new MonitorConfigInMemoryRepo(byteArray);
          return repo;
        } catch (SdkClientException e) {
          log.error("Trouble talking to S3, will retry", e);
          Thread.sleep(tries * 100);
        }
      }
    } else {
      byte[] fileContent = Files.readAllBytes(new File(configRepo).toPath());
      repo = new MonitorConfigInMemoryRepo(fileContent);
    }
    return repo;
  }

  @Override
  public AnalysisBuffer zero() {
    return new AnalysisBuffer();
  }

  private List<ExplodedRowCollectorV3> initCollectors(ExplodedRow a) {
    val conf = getRepo().get(a.getOrgId(), a.getDatasetId());

    if (conf == null) {
      return new ArrayList<>();
    }

    val e =
        new ExplodedRowsToAnalyzerResultsV3(
            currentTime,
            runId,
            overwriteEvents,
            embedableImageBasePath,
            new CalculationFactory(),
            0l);
    e.setMonitorConfigV3(conf);
    e.initCollectors(a, false);
    return e.getCollectors();
  }

  @SneakyThrows
  @Override
  public AnalysisBuffer reduce(AnalysisBuffer b, ExplodedRow a) {
    if (!b.isInitialized()) {
      b.setCollectors(initCollectors(a));
      b.setInitialized(true);
    }

    for (val c : b.getCollectors()) {
      c.collect(a);
    }

    return b;
  }

  @Override
  public AnalysisBuffer merge(AnalysisBuffer a1, AnalysisBuffer b1) {
    if (!a1.isInitialized()) {
      return b1;
    }
    if (!b1.isInitialized()) {
      return a1;
    }

    for (val collectorA : a1.getCollectors()) {
      for (val collectorB : b1.getCollectors()) {
        if (Objects.equal(collectorA.getBaseline(), collectorB.getBaseline())
            && collectorA.getTargetLevel().equals(collectorB.getTargetLevel())
            && collectorA.getModelGranularity().equals(collectorB.getModelGranularity())
            && collectorA.isDisableTargetRollup() == collectorB.isDisableTargetRollup()) {
          collectorA.merge(collectorB);
        }
      }
    }

    return a1;
  }

  protected List<AnalyzerResult> runAnalysis(AnalysisBuffer buffer) {
    if (buffer.getCollectors().size() == 0) {
      return new ArrayList<>();
    }

    val conf =
        getRepo()
            .get(
                buffer.getCollectors().get(0).getOrgId(),
                buffer.getCollectors().get(0).getDatasetId());

    if (conf == null) {
      return new ArrayList<>();
    }
    val a =
        new ExplodedRowsToAnalyzerResultsV3(
            currentTime,
            runId,
            overwriteEvents,
            embedableImageBasePath,
            new CalculationFactory(),
            0l);
    a.setMonitorConfigV3(conf);
    a.setCollectors(buffer.getCollectors());
    a.init();

    List<AnalyzerResult> results = new ArrayList<>();

    for (val c : buffer.getCollectors()) {
      if (c.getRowsSeen() == 0) {
        continue;
      }
      if (c.getColumnName() != null
          && c.getColumnName().equals(BaseCalculationV3.DATASET_METRIC_ROW)) {
        val i =
            IngestionMetricToExplodedRow.get(
                IngestionMetric.builder()
                    .orgId(c.getOrgId())
                    .datasetId(c.getDatasetId())
                    .segment(c.getSegmentText())
                    .targetTimestamp(currentTimeMillis)
                    .lastUploadTs(c.getLastUploadTimestamp())
                    .build());
        c.collect(i);
      }

      results.addAll(a.after(c));
    }

    return results;
  }

  @Override
  public AnalysisOutputBuffer finish(AnalysisBuffer buffer) {
    return new AnalysisOutputBuffer(runAnalysis(buffer));
  }

  @Override
  public Encoder<AnalysisBuffer> bufferEncoder() {
    return Encoders.kryo(AnalysisBuffer.class);
  }

  @Override
  public Encoder<AnalysisOutputBuffer> outputEncoder() {
    return Encoders.bean(AnalysisOutputBuffer.class);
  }
}
