package ai.whylabs.batch.jobs.copy;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;

import ai.whylabs.batch.udfs.ScrubUnusedProfileElements;
import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator;
import com.google.common.hash.Hashing;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.Serializable;
import java.util.Iterator;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.parquet.Preconditions;
import org.sparkproject.guava.collect.Iterators;

/**
 * Used only by ExternalS3ToDeltalakeJob to read profiles from customers who maintain their own
 * buckets. ExternalS3ToDeltalakeJob is forked by WhylogDeltalakeWriterJob.
 *
 * <p>It'd be nice to merge the logic of this with {@link S3UriToRow} class. However, this class has
 * some extra logic that it's unclear to me how to reconcile (and maybe we should get rid of them
 * long term): <br>
 * * The other class uses the hash of the file content + bucket name as an approximation of S3 path
 * (i.e. we need an unique path per file). <br>
 * See the other class' documentation for its context
 */
@Slf4j
public class ByteArrayToRow implements Serializable {
  private final long datalakeWriteTs;
  private final String orgId;
  private final String sourcePath;

  public ByteArrayToRow(
      String orgId, String sourceBucket, String sourcePrefix, long datalakeWriteTs) {
    this.orgId = orgId;
    this.datalakeWriteTs = datalakeWriteTs;
    this.sourcePath = "s3://" + sourceBucket + "/" + sourcePrefix;
  }

  @SneakyThrows
  public Iterator<DatalakeRow> process(byte[] data) {
    try {
      val bis = new BufferedInputStream(new ByteArrayInputStream(data));
      DatasetProfileMessage msg;
      try {
        val v1Reader =
            new WhyLogsV1toV0Iterator(bis, new BinMetadata(orgId, null, null, null, null));
        msg = v1Reader.toV0DatasetProfileMessage();
      } catch (IOException e) {
        msg = DatasetProfileMessage.parseDelimitedFrom(bis);
      }

      if (msg == null) {
        log.warn("Empty profile from Parquet");
        return Iterators.emptyIterator();
      }

      long datasetTimestamp = msg.getProperties().getDataTimestamp();
      if (datasetTimestamp < 0L) {
        // if dataset timestamp is missing, we fall back to session timestamp
        final long sessionTimestamp = msg.getProperties().getSessionTimestamp();
        if (sessionTimestamp >= 0) {
          datasetTimestamp = sessionTimestamp;
        } else {
          // this is weird
          datasetTimestamp = 0L;
        }
      }

      val datasetId = validateDatasetId(msg);
      val updatedMsg =
          ScrubUnusedProfileElements.scrub(
              BinMetadataEnforcer.INSTANCE.enforce(
                  msg, orgId, datasetId, datasetTimestamp, null, null));
      val bos = new ByteArrayOutputStream(updatedMsg.getSerializedSize() + 1);
      try {
        updatedMsg.writeDelimitedTo(bos);
      } finally {
        bos.close();
      }

      val content = bos.toByteArray();

      // we want some fast hashing function that is stable and doesn't produce a lot of collisions
      // IMPORTANT: use the source data as the source for the hash
      @SuppressWarnings("UnstableApiUsage")
      val hashValue = Hashing.farmHashFingerprint64().hashBytes(data).toString();

      // we create a "fake" file name here to dedupe the content since we can't use
      // S3 path to do this
      val originalFilename = sourcePath + "#" + datasetTimestamp + "#" + hashValue;

      val row =
          DatalakeRow.builder()
              .orgId(orgId)
              .datasetId(datasetId)
              .ts(datasetTimestamp)
              .numColumns(updatedMsg.getColumnsCount())
              /*
               * Folks with S3 integrations are typically doing so because their firewalls are too
               * strict to talk to external systems, so we assume their env is strict enough that
               * their data needs to be partitioned separately from the general population (Free
               * tier).
               */
              .partition(orgId)
              .length((long) content.length)
              .type(ProfileColumnType.RAW)
              .mergedRecordWritten(false)
              .datalakeWriteTs(datalakeWriteTs)
              .ingestionOrigin(IngestionOrigin.ExternalS3ToDeltalakeJob)
              .originalFilename(originalFilename)
              .content(content)
              .tags(
                  DatasetProfileMessageWrapper.extractTags(
                      updatedMsg
                          .getProperties() //
                          .getTagsMap()))
              .build();

      return Iterators.forArray(row);
    } catch (Exception e) {
      log.error("Failed to process data", e);
      throw e;
    }
  }

  private static String validateDatasetId(DatasetProfileMessage msg) {
    // verify
    val datasetId = msg.getProperties().getTagsOrDefault(DATASET_ID, null);
    Preconditions.checkNotNull(datasetId, "Dataset ID is not set");
    return datasetId;
  }
}
