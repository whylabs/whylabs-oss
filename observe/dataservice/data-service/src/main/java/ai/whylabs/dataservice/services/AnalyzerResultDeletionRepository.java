package ai.whylabs.dataservice.services;

import ai.whylabs.core.structures.DataDeletionRequest;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.enums.DeletionStatus;
import ai.whylabs.dataservice.structures.DeleteAnalyzerResult;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.amazonaws.services.s3.AmazonS3;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Property;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.sql.*;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import javax.inject.Named;
import javax.persistence.*;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.val;
import org.hibernate.query.internal.NativeQueryImpl;

/** Tracking table for analysis deletion requests */
@Repository
public abstract class AnalyzerResultDeletionRepository {

  @Property(name = "whylabs.dataservice.songbirdBucket")
  private String songbirdBucket;

  @Inject private ObjectMapper objectMapper;
  @Inject private DataSvcConfig config;

  @PersistenceContext(name = DatasourceConstants.BULK)
  private EntityManager entityManager;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private AmazonS3 s3;

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteAnalyzerResult> getRecentRequests(String orgId) {
    val pst =
        entityManager.createNativeQuery(
            "select * from whylabs.analyzer_result_deletions d where d.org_id = :orgId order by creation_timestamp desc limit 50",
            DeleteAnalyzerResult.class);
    pst.setParameter("orgId", orgId);
    return pst.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteAnalyzerResult> getRecentRequests(String orgId, String datasetId) {
    val pst =
        entityManager.createNativeQuery(
            "select * from whylabs.analyzer_result_deletions d where d.org_id = :orgId and d.dataset_id = :datasetId  order by creation_timestamp desc limit 50",
            DeleteAnalyzerResult.class);
    pst.setParameter("orgId", orgId);
    pst.setParameter("datasetId", datasetId);
    return pst.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Optional<DeleteAnalyzerResult> findById(Integer id) {
    val pst =
        (NativeQueryImpl)
            entityManager.createNativeQuery(
                "select * from whylabs.analyzer_result_deletions d where d.id = :id",
                DeleteAnalyzerResult.class);
    pst.setParameter("id", id);
    for (val r : pst.getResultList()) {
      return Optional.of((DeleteAnalyzerResult) r);
    }
    return Optional.empty();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public int persistToPostgres(DeleteAnalyzerResult r) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "insert into whylabs.analyzer_result_deletions (org_id, dataset_id, delete_gte, delete_lt, status, creation_timestamp, updated_timestamp, analyzer_id) values (?, ?, ?, ?, ?::deletion_status_enum, now(), now(), ?) returning id");
    pst.setString(1, r.getRequest().getOrgId());
    pst.setString(2, r.getRequest().getDatasetId());

    if (r.getRequest().getDelete_gte() != null) {
      pst.setObject(3, new Timestamp(r.getRequest().getDelete_gte()));
    } else {
      pst.setObject(3, null);
    }

    if (r.getRequest().getDelete_lt() != null) {
      pst.setObject(4, new Timestamp(r.getRequest().getDelete_lt()));
    } else {
      pst.setObject(4, null);
    }

    if (r.getStatus() != null) {
      pst.setObject(5, r.getStatus(), Types.VARCHAR);
    } else {
      pst.setObject(5, DeletionStatus.PENDING, Types.VARCHAR);
    }

    pst.setObject(6, r.getRequest().getAnalyzerId(), Types.VARCHAR);

    pst.execute();
    val ids = pst.getResultSet();
    ids.next();
    return ids.getInt(1);
  }

  /**
   * WhylogDeltalakeWriterJob takes in a parameter "dataDeletionRequestsPath" where requests to
   * delete data get dropped into S3 for async execution
   */
  @SneakyThrows
  public void persistToS3(DeleteAnalyzerResult r) {
    if (config.isDeployed()) {
      val request =
          DataDeletionRequest.builder()
              .datasetId(r.getRequest().getDatasetId())
              .deleteAnalyzerResults(true)
              .orgId(r.getRequest().getOrgId())
              .analyzerResultsStart(r.getRequest().getDelete_gte())
              .analyzerResultsEnd(r.getRequest().getDelete_lt())
              .analyzerId(r.getRequest().getAnalyzerId())
              .build();
      val json = objectMapper.writeValueAsString(request);

      s3.putObject(songbirdBucket, getS3Key(r), json);
    }
  }

  private String getS3Key(DeleteAnalyzerResult r) {
    return new StringBuilder()
        .append("actions/delete/")
        .append(r.getRequest().getOrgId())
        .append("_")
        .append(r.getRequest().getDatasetId())
        .append("_")
        .append("analyzer_results")
        .append("_")
        .append(r.getId())
        .append(".json")
        .toString();
  }

  public void clearRequestFromS3(DeleteAnalyzerResult r) {
    if (config.isDeployed()) {
      s3.deleteObject(songbirdBucket, getS3Key(r));
    }
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void cancelRequest(Integer id) {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.analyzer_result_deletions set status = 'CANCELED' where status = 'PENDING' and id = :id");
    q.setParameter("id", id);
    q.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markPendingRequestsAsProcessing() {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.analyzer_result_deletions set status = 'PROCESSING' where status = 'PENDING'");
    q.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteAnalyzerResult> getInProgressRequests() {
    val q =
        entityManager.createNativeQuery(
            "select * from whylabs.analyzer_result_deletions d where status = 'PROCESSING' order by creation_timestamp asc limit 1000",
            DeleteAnalyzerResult.class);
    return q.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markProcessingRequestsAsCompleted(Integer id) {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.analyzer_result_deletions set status = 'COMPLETED' where status = 'PROCESSING' and id = :id");
    q.setParameter("id", id);
    q.executeUpdate();
  }
}
