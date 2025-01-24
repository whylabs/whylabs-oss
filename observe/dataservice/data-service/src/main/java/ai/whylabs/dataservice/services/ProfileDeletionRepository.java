package ai.whylabs.dataservice.services;

import ai.whylabs.core.structures.DataDeletionRequest;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.enums.DeletionStatus;
import ai.whylabs.dataservice.structures.DeleteProfile;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.AmazonS3Exception;
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
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.val;
import org.hibernate.query.internal.NativeQueryImpl;

/** Tracking table for profile deletion requests */
@Repository
public abstract class ProfileDeletionRepository {

  @Property(name = "whylabs.dataservice.songbirdBucket")
  private String songbirdBucket;

  @Inject private ObjectMapper objectMapper;
  @Inject private DataSvcConfig config;
  @Inject private AmazonS3 s3;

  @PersistenceContext(name = DatasourceConstants.BULK)
  private EntityManager entityManager;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteProfile> getRecentRequests(String orgId) {
    val pst =
        entityManager.createNativeQuery(
            "select * from whylabs.profile_deletions d where d.org_id = :orgId order by creation_timestamp desc limit 50",
            DeleteProfile.class);
    pst.setParameter("orgId", orgId);
    return pst.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteProfile> getRecentRequests(String orgId, String datasetId) {
    val pst =
        entityManager.createNativeQuery(
            "select * from whylabs.profile_deletions d where d.org_id = :orgId and d.dataset_id = :datasetId  order by creation_timestamp desc limit 50",
            DeleteProfile.class);
    pst.setParameter("orgId", orgId);
    pst.setParameter("datasetId", datasetId);
    return pst.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Optional<DeleteProfile> findById(Integer id) {
    val pst =
        (NativeQueryImpl)
            entityManager.createNativeQuery(
                "select * from whylabs.profile_deletions d where d.id = :id", DeleteProfile.class);
    pst.setParameter("id", id);
    for (val r : pst.getResultList()) {
      return Optional.of((DeleteProfile) r);
    }
    return Optional.empty();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public int persistToPostgres(DeleteProfile r) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "insert into whylabs.profile_deletions (org_id, dataset_id, delete_gte, delete_lt, status, creation_timestamp, updated_timestamp, column_name, reingest_after_deletion, before_upload_ts) values (?, ?, ?, ?, ?::deletion_status_enum, now(), now(), ?, ?, ?) returning id");
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
      pst.setObject(5, DeletionStatus.PENDING, Types.VARCHAR);
    } else {
      pst.setObject(5, DeletionStatus.PENDING, Types.VARCHAR);
    }
    if (r.getRequest().getColumnName() != null) {
      pst.setString(6, r.getRequest().getColumnName());
    } else {
      pst.setObject(6, null);
    }
    if (r.getRequest().getReingestAfterDeletion() != null
        && r.getRequest().getReingestAfterDeletion()) {
      pst.setBoolean(7, true);
    } else {
      pst.setBoolean(7, false);
    }
    if (r.getRequest().getBeforeUploadTs() != null) {
      pst.setTimestamp(8, new Timestamp(r.getRequest().getBeforeUploadTs()));
    } else {
      pst.setObject(8, null);
    }

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
  public void persistToS3(DeleteProfile r) {
    if (config.isDeployed()) {
      val request =
          DataDeletionRequest.builder()
              .datasetId(r.getRequest().getDatasetId())
              .deleteProfiles(true)
              .orgId(r.getRequest().getOrgId())
              .profileStart(r.getRequest().getDelete_gte())
              .profileEnd(r.getRequest().getDelete_lt())
              .beforeUploadTs(r.getRequest().getBeforeUploadTs())
              .columnName(r.getRequest().getColumnName())
              .build();
      val json = objectMapper.writeValueAsString(request);

      s3.putObject(songbirdBucket, getS3Key(r), json);
    }
  }

  private String getS3Key(DeleteProfile r) {
    val sb =
        new StringBuilder()
            .append("actions/delete/")
            .append(r.getRequest().getOrgId())
            .append("_")
            .append(r.getRequest().getDatasetId())
            .append("_")
            .append("profile")
            .append("_")
            .append(r.getId());
    if (r.getRequest().getColumnName() != null) {
      sb.append("-").append(r.getRequest().getColumnName().replaceAll("/[^A-Za-z0-9 ]/", ""));
    }
    return sb.append(".json").toString();
  }

  public void clearRequestFromS3(DeleteProfile r) {
    if (config.isDeployed()) {
      try {
        s3.deleteObject(songbirdBucket, getS3Key(r));
      } catch (AmazonS3Exception e) {
        // no file expected if reingest was requested
        if (e.getStatusCode() != 404) {
          throw e;
        }
      }
    }
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void cancelRequest(Integer id) {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.profile_deletions set status = 'CANCELED' where status = 'PENDING' and id = :id");
    q.setParameter("id", id);
    q.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markPendingRequestsAsProcessing() {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.profile_deletions set status = 'PROCESSING' where status = 'PENDING'");
    q.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<DeleteProfile> getInProgressRequests() {
    val q =
        (NativeQueryImpl)
            entityManager.createNativeQuery(
                "select * from whylabs.profile_deletions d where status = 'PROCESSING' order by creation_timestamp asc limit 1000",
                DeleteProfile.class);
    return q.getResultList();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markProcessingRequestsAsCompleted(Integer id) {
    val q =
        entityManager.createNativeQuery(
            "update whylabs.profile_deletions set status = 'COMPLETED' where status = 'PROCESSING' and id = :id");
    q.setParameter("id", id);
    q.executeUpdate();
  }
}
