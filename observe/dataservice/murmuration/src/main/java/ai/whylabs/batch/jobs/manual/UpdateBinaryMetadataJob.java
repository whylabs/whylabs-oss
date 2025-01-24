package ai.whylabs.batch.jobs.manual;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import ai.whylabs.core.structures.BinaryProfileRow;
import ai.whylabs.druid.whylogs.column.WhyLogsRow;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.AmazonS3URI;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.beust.jcommander.Parameter;
import com.google.common.collect.Iterators;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.ByteArrayInputStream;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.MapPartitionsFunction;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;

/**
 * A job to update binary metadata for whylogs binary. For context, Chris remapped a bunch of
 * binaries files from Songbird to S3 for org-0/model-0 However he also remapped the orgId to
 * `org-11`. This breaks the backfill to the main deltalake so I'm updating the S3 binaries with the
 * correct data.
 *
 * <p>I thought this is a handy job to update S3 files in general.
 */
@Slf4j
public class UpdateBinaryMetadataJob extends AbstractSparkJob {
  @Parameter(names = "-path", description = "Path of the deltalake table", required = true)
  private String path; // example: "s3://development-songbird-20201028054020481800000001/whylogs/"

  public static void main(String[] args) {
    new UpdateBinaryMetadataJob().run(args);
  }

  @Override
  public Dataset<Row> calculate() {
    Dataset<Row> df =
        spark
            .read() //
            .format("binaryFile") //
            .option("pathGlobFilter", "*.bin") //
            .load(path);
    df.printSchema();

    df.as(Encoders.bean(BinaryProfileRow.class))
        .mapPartitions(
            (MapPartitionsFunction<BinaryProfileRow, Integer>)
                input -> {
                  AmazonS3 s3 =
                      AmazonS3Client.builder()
                          .withCredentials(WhyLabsCredentialsProviderChain.getInstance())
                          .withRegion(Regions.US_WEST_2)
                          .build();
                  final Iterable<BinaryProfileRow> it = () -> input;
                  for (BinaryProfileRow row : it) {
                    val prof =
                        DatasetProfileMessage.parseDelimitedFrom(
                            new ByteArrayInputStream(row.getContent()));
                    val orgId = prof.getProperties().getTagsMap().get(WhyLogsRow.ORG_ID);
                    if ("org-11".equals(orgId)) {
                      val output = updateWhyLogsTab(prof);
                      val uri = new AmazonS3URI(row.getPath());
                      val metadata = new ObjectMetadata();
                      metadata.setContentLength(output.length);
                      val is = new ByteArrayInputStream(output);

                      // rewrite the path here
                      final String newPath = uri.getKey().replace("whylogs/", "whylogs-v2/");
                      s3.putObject(new PutObjectRequest(uri.getBucket(), newPath, is, metadata));
                    }
                  }
                  return Iterators.forArray(1);
                },
            Encoders.INT())
        .count();
    return df;
  }

  private byte[] updateWhyLogsTab(DatasetProfileMessage prof) {
    val builder = prof.toBuilder();
    // update to org-0
    val props = prof.getProperties().toBuilder().putTags(WhyLogsRow.ORG_ID, "org-0");
    builder.setProperties(props);
    return builder.build().toByteArray();
  }
}
