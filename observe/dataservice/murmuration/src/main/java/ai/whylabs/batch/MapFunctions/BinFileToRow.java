package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.BinaryProfileRow;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator;
import com.google.common.collect.Iterators;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Iterator;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.apache.spark.api.java.function.FlatMapFunction;

/** Convert bin files (protobuff) into the deltalake table structure */
@Slf4j
public class BinFileToRow implements FlatMapFunction<BinaryProfileRow, DatalakeRow> {

  private static final String DEMO_DATA_PREFIX = "demo-data";
  private long datalakeWriteTs;

  public BinFileToRow(long datalakeWriteTs) {
    this.datalakeWriteTs = datalakeWriteTs;
  }

  @Override
  public Iterator<DatalakeRow> call(BinaryProfileRow row) throws Exception {
    val content = row.getContent();
    try {
      DatasetProfileMessage profileMessage;

      try {
        val v1Reader =
            new WhyLogsV1toV0Iterator(new BufferedInputStream(new ByteArrayInputStream(content)));
        profileMessage = v1Reader.toV0DatasetProfileMessage();
      } catch (IOException e) {
        profileMessage =
            DatasetProfileMessage.parseDelimitedFrom(new ByteArrayInputStream(content));
      }

      val wrapper = new DatasetProfileMessageWrapper(profileMessage);

      final String orgId;
      final String datasetId;
      val path = row.getPath();
      try {
        orgId = wrapper.getDatasetMetrics().getOrgId();
        datasetId = wrapper.getDatasetMetrics().getDatasetId();
      } catch (NullPointerException e) {
        log.warn("OrgId / datasetId missing. Ignoring the profile. Path: {}", path);
        return Collections.emptyIterator();
      }

      long ts = wrapper.getDatasetMetrics().getTimestamp();
      if (ts == 0) {
        log.warn("Missing timestamp. Fall back to current time");
        ts = row.getModificationTime().getTime();
      }
      IngestionOrigin origin = IngestionOrigin.WhylogDeltalakeWriterJob;
      if (path.contains(DEMO_DATA_PREFIX)) {
        origin = IngestionOrigin.DemoData;
      }

      /*
       * Lump all the free tier orgs into a single partition so we don't blow up our partition count
       * on trials. If you want a private datalake partition, then you gotta pay us money :)
       */
      String partition = orgId;

      ProfileColumnType type = ProfileColumnType.RAW;
      String profileId = null;
      if (row.getProfileId() != null && !StringUtils.isEmpty(row.getProfileId())) {
        /**
         * This is a single reference profile, we partition these separately as they are neither
         * mergable nor is the dataset timestamp relevant
         */
        type = ProfileColumnType.REFERENCE;
        profileId = row.getProfileId();
      }

      // Order here must match the schema in DatalakeStructure
      val builder =
          DatalakeRow.builder()
              .orgId(orgId)
              .datasetId(datasetId)
              .partition(partition)
              .ts(ts)
              .originalFilename(path)
              .length(row.getLength())
              .content(content)
              .numColumns(wrapper.getColumnCount())
              .tags(wrapper.getTags())
              .profileId(profileId)
              .ingestionOrigin(origin)
              .datalakeWriteTs(datalakeWriteTs)
              .type(type)
              .mergedRecordWritten(false)
              .lastUploadTs(row.getModificationTime().getTime());

      return Iterators.forArray(builder.build());
    } catch (Throwable e) {
      log.warn("Something went wrong", e);
      return Collections.emptyIterator();
    }
  }
}
