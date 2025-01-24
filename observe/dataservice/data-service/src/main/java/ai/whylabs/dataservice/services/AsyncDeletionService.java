package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.requests.DeleteAnalysisRequest;
import ai.whylabs.dataservice.requests.DeleteProfileRequest;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.SongbirdDynamoDumpReader;
import ai.whylabs.ingestion.S3ClientFactory;
import com.amazonaws.services.s3.AmazonS3URI;
import com.amazonaws.services.s3.model.ObjectListing;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import io.micronaut.context.annotation.Executable;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPInputStream;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class AsyncDeletionService {
  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource dataSource;

  @Inject private final ProfileService profileService;

  @Inject private AnalysisService analysisService;

  /**
   * How to create the dump location. Open AWS console
   *
   * <p>DynamoDB>Tables>development-songbird-MetadataTable-df098b7>Exports And Streams Hit [Export
   * To S3] and pick the deltalake bucket. It'll create a unique key prefix. The path to the dump is
   * passed in here.
   *
   * <p>At first I tried using athena to access this, but it just turned into an IAM nightmare. Its
   * something we may only bother doing a couple times a year so its not bad as a playbook.
   *
   * @param dryrun
   * @param dumpLocation
   */
  @SneakyThrows
  @Async
  public void purgingDeletedDatasets(boolean dryrun, String dumpLocation) {
    if (dumpLocation.endsWith(".json.gz")) {
      purgeSingleFile(dryrun, dumpLocation);
    } else {
      // Its a dir, list all the files and work from there
      AmazonS3URI s3URI = new AmazonS3URI(dumpLocation);
      val client = S3ClientFactory.getS3Client();
      ObjectListing listing = client.listObjects(s3URI.getBucket(), s3URI.getKey());
      List<S3ObjectSummary> summaries = listing.getObjectSummaries();
      while (listing.isTruncated()) {
        listing = client.listNextBatchOfObjects(listing);
        summaries.addAll(listing.getObjectSummaries());
      }

      for (val o : summaries) {
        String path = "s3://" + o.getBucketName() + "/" + o.getKey();
        purgeSingleFile(dryrun, path);
      }
    }
    log.info("Purge complete");
  }

  @SneakyThrows
  public void purgeSingleFile(boolean dryrun, String dumpLocation) {
    log.info("Scanning {} for deleted datasets", dumpLocation);
    val s3c = new S3ClientFactory(null);
    GZIPInputStream gzip = new GZIPInputStream(s3c.get(dumpLocation).getContentStream());
    BufferedReader br = new BufferedReader(new InputStreamReader(gzip));
    val i = new SongbirdDynamoDumpReader(br);
    List<Pair<String, String>> deletedDatasets = new ArrayList<>();
    while (i.hasNext()) {
      deletedDatasets.add(i.next());
    }

    for (val p : deletedDatasets) {
      String orgId = p.getLeft();
      String datasetId = p.getRight();
      if (!hasRecentUploads(orgId, datasetId)) {
        log.info(
            "{} {} has no recent data uploaded and was requested to be deleted, let the purge begin",
            orgId,
            datasetId);
        if (!dryrun) {
          try {
            purgeDataset(orgId, datasetId);
          } catch (Exception e) {
            log.error(
                "Error trying to purge {} {}, pausing temporarily before moving onto the next",
                orgId,
                datasetId);
            Thread.sleep(5 * 60 * 1000);
          }
        }
      }
    }
  }

  public void purgeDataset(String orgId, String datasetId) {
    /**
     * At some point we'll wanna purge the deltalake as well, but keeping that as a TODO for now
     * because that's our backup if we need to revive a dataset after the fact.
     */
    val r = new DeleteAnalysisRequest();
    r.setOrgId(orgId);
    r.setDatasetId(datasetId);
    analysisService.delete(r);

    val deleteProfileRequest = new DeleteProfileRequest();
    deleteProfileRequest.setOrgId(orgId);
    deleteProfileRequest.setDatasetId(datasetId);
    profileService.delete(deleteProfileRequest);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public boolean hasRecentUploads(String orgId, String datasetId) {
    @Cleanup Connection db = dataSource.getConnection();

    String sql =
        "select max(ingest_timestamp) from whylabs.profile_upload_audit where  org_id = ? and dataset_id = ? and ingest_timestamp > NOW() - INTERVAL '14 DAY' and dataset_timestamp > NOW() - INTERVAL '90 DAY'";

    @Cleanup val query = db.prepareStatement(sql);
    query.setString(1, orgId);
    query.setString(2, datasetId);
    query.execute();
    val i = query.getResultSet();
    while (i.next()) {
      if (i.getTimestamp(1) == null) {
        return false;
      }
    }
    return true;
  }
}
