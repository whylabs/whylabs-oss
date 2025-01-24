package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.udfs.AddYearMonthDay;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.DatalakeRowV2Metric;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import io.micrometer.common.util.StringUtils;
import java.util.*;
import lombok.val;
import org.apache.spark.api.java.function.MapPartitionsFunction;
import org.apache.spark.sql.*;

public class MigrateV2ProfileDatalake extends AbstractSparkJob {

  @Parameter(names = "-src", description = "Location of delta lake", required = true)
  private String src;

  @Parameter(names = "-dest", description = "Org Id to copy data from", required = true)
  private String dest;

  public Dataset<Row> calculate() {

    convert(
            FillMissingColumns.fillMissingColumnsWitNulls(
                    DeltaTable.forPath(spark, src).toDF(), DatalakeRowV1.class.getDeclaredFields())
                .na()
                .fill(
                    false,
                    Arrays.asList(DatalakeRowV1.Fields.enableGranularDataStorage)
                        .toArray(new String[] {}))
                .as(Encoders.bean(DatalakeRowV1.class)))
        .sort(col(DatalakeRowV2.Fields.yyyymmdd))
        .write()
        .format(DeltalakeWriter.DELTA)
        .mode(SaveMode.Overwrite)
        .option("overwriteSchema", "true")
        .partitionBy(DatalakeRowV2.Fields.yyyymmdd)
        .save(dest);
    return null;
  }

  public static Dataset<DatalakeRowV2> convert(Dataset<DatalakeRowV1> rows) {
    return rows.repartition(
            1000,
            functions.col(DatalakeRowV1.Fields.orgId),
            functions.col(DatalakeRowV1.Fields.datasetId),
            functions.col(DatalakeRowV1.Fields.segmentText),
            functions.col(DatalakeRowV1.Fields.columnName))
        .sortWithinPartitions(
            functions.col(DatalakeRowV1.Fields.datasetId),
            functions.col(DatalakeRowV1.Fields.type),
            functions.col(DatalakeRowV1.Fields.datasetType),
            functions.col(DatalakeRowV1.Fields.referenceProfileId),
            functions.col(DatalakeRowV1.Fields.segmentText),
            functions.col(DatalakeRowV1.Fields.columnName),
            functions.col(DatalakeRowV1.Fields.datasetTimestamp))
        .mapPartitions(
            new MapPartitionsFunction<DatalakeRowV1, DatalakeRowV2>() {

              class Merger implements Iterator<DatalakeRowV2> {

                private LinkedList<DatalakeRowV2> collapsedRows = new LinkedList<>();
                private Iterator<DatalakeRowV1> input;
                private DatalakeRowV2 buffer;
                private AddYearMonthDay addYearMonthDay = new AddYearMonthDay();

                public Merger(Iterator<DatalakeRowV1> input) {
                  this.input = input;
                }

                public void merge(DatalakeRowV1 a) {
                  if (buffer == null) {
                    buffer = new DatalakeRowV2();
                  }
                  buffer.setOrgId(a.getOrgId());
                  buffer.setDatasetId(a.getDatasetId());
                  buffer.setColumnName(a.getColumnName());
                  buffer.setType(a.getType());
                  buffer.setDatasetType(a.getDatasetType());
                  buffer.setOriginalFilename(a.getOriginalFilename());
                  buffer.setEnableGranularDataStorage(a.isEnableGranularDataStorage());
                  buffer.setDatalakeWriteTs(a.getDatalakeWriteTs());
                  buffer.setDatasetTimestamp(a.getDatasetTimestamp());
                  buffer.setDatasetTags(a.getDatasetTags());
                  buffer.setLastUploadTs(a.getLastUploadTs());
                  buffer.setMergeableSegment(a.getMergeableSegment());
                  buffer.setYyyymmdd(addYearMonthDay.call(a.getDatasetTimestamp()));
                  buffer.setTraceId(a.getTraceId());
                  buffer.setSegmentText(a.getSegmentText());
                  buffer.setReferenceProfileId(a.getReferenceProfileId());
                  buffer.setIngestionOrigin(a.getIngestionOrigin());
                  buffer.setMergedRecordWritten(a.getMergedRecordWritten());

                  if (buffer.getMetrics() == null) {
                    buffer.setMetrics(new ArrayList<>());
                  }

                  if (!StringUtils.isEmpty(a.getMetricPath())) {
                    buffer
                        .getMetrics()
                        .add(
                            DatalakeRowV2Metric.builder()
                                .metricPath(a.getMetricPath())
                                .classificationProfile(a.getClassificationProfile())
                                .regressionProfile(a.getRegressionProfile())
                                .variance(a.getVariance())
                                .dMax(a.getDMax())
                                .dMin(a.getDMin())
                                .dSum(a.getDSum())
                                .unmergeableD(a.getUnmergeableD())
                                .nMin(a.getNMin())
                                .nMax(a.getNMax())
                                .nSum(a.getNSum())
                                .frequentItems(a.getFrequentItems())
                                .kll(a.getKll())
                                .hll(a.getHll())
                                .build());
                  }
                }

                @Override
                public boolean hasNext() {
                  while (input.hasNext()) {
                    val n = input.next();
                    if (buffer != null
                        && (n.isEnableGranularDataStorage()
                            || !Objects.equals(n.getOrgId(), buffer.getOrgId())
                            || !Objects.equals(n.getDatasetId(), buffer.getDatasetId())
                            || !Objects.equals(n.getSegmentText(), buffer.getSegmentText())
                            || !Objects.equals(n.getColumnName(), buffer.getColumnName())
                            || !Objects.equals(n.getDatasetType(), buffer.getDatasetType())
                            || !Objects.equals(
                                n.getReferenceProfileId(), buffer.getReferenceProfileId())
                            || !Objects.equals(n.getType(), buffer.getType())
                            || !Objects.equals(
                                n.getOriginalFilename(), buffer.getOriginalFilename())
                            || !Objects.equals(
                                n.getDatasetTimestamp(), buffer.getDatasetTimestamp()))) {
                      collapsedRows.add(buffer);
                      buffer = new DatalakeRowV2();
                      merge(n);
                    } else {
                      merge(n);
                    }

                    if (collapsedRows.size() > 1000) {
                      return true;
                    }
                  }
                  if (buffer != null) {
                    collapsedRows.add(buffer);
                    buffer = null;
                  }
                  return collapsedRows.size() > 0;
                }

                @Override
                public DatalakeRowV2 next() {
                  return collapsedRows.poll();
                }
              }

              @Override
              public Iterator<DatalakeRowV2> call(Iterator<DatalakeRowV1> input) throws Exception {
                return new Merger(input);
              }
            },
            Encoders.bean(DatalakeRowV2.class));
  }

  public static void main(String[] args) {
    new MigrateV2ProfileDatalake().run(args);
  }
}
