package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.enums.BulkLoadStatus;
import ai.whylabs.dataservice.structures.BulkLoadAuditEntry;
import ai.whylabs.dataservice.util.DatasourceConstants;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.sql.*;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.*;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

@Repository
@Slf4j
@Singleton
@RequiredArgsConstructor
public abstract class BulkLoadAuditRepository {

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @PersistenceContext(name = DatasourceConstants.BULK)
  private EntityManager entityManager;

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markFailed(String id) {
    Query q =
        entityManager.createNativeQuery(
            "update whylabs.bulk_load_audit set status = 'failed', load_end = now() where id = :id");
    q.setParameter(1, id);
    q.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void markSuccess(String id) {
    Query q =
        entityManager.createNativeQuery(
            "update whylabs.bulk_load_audit set status = 'finished',  load_end = now() where id = :id");
    q.setParameter(1, id);
    q.executeUpdate();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void save(BulkLoadAuditEntry e) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "insert into whylabs.bulk_load_audit (load_start, load_end, status, load_table, load_mode, id) values (?, ?, ?::bulk_load_status_enum, ?, ?::bulk_load_mode_enum, ?::uuid)");
    if (e.getStart() != null) {
      pst.setObject(1, new Timestamp(e.getStart()));
    } else {
      pst.setObject(1, new Timestamp(System.currentTimeMillis()));
    }

    if (e.getEnd() != null) {
      pst.setObject(2, new Timestamp(e.getEnd()));
    } else {
      pst.setObject(2, null);
    }

    if (e.getStatus() != null) {
      pst.setString(3, e.getStatus().name());
    } else {
      pst.setString(3, BulkLoadStatus.started.name());
    }
    pst.setObject(4, e.getTable(), Types.VARCHAR);
    pst.setObject(5, e.getMode().name(), Types.VARCHAR);
    pst.setObject(6, e.getId(), Types.VARCHAR);

    pst.executeUpdate();
  }
}
