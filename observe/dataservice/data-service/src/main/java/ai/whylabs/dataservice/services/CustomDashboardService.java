package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.requests.CloneCustomDashboardRequest;
import ai.whylabs.dataservice.requests.CustomDashboardUpsertRequest;
import ai.whylabs.dataservice.structures.CustomDashboard;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.PostgresUtil;
import io.micronaut.data.annotation.Repository;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.exceptions.HttpStatusException;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import javax.validation.constraints.NotNull;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public abstract class CustomDashboardService {

  @PersistenceContext private EntityManager entityManager;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  @Inject private DataSource dataSource;

  private static final String dashboardInsertSql;
  private static final String dashboardMarkAsDeletedSql;
  private static final String dashboardCloneSql;
  private static final String dashboardUpdateSql;

  static {
    try {
      dashboardInsertSql =
          IOUtils.resourceToString("/sql/custom-dashboard-insert.sql", StandardCharsets.UTF_8);
      dashboardUpdateSql =
          IOUtils.resourceToString("/sql/custom-dashboard-update.sql", StandardCharsets.UTF_8);
      dashboardMarkAsDeletedSql =
          IOUtils.resourceToString(
              "/sql/custom-dashboard-mark-as-deleted.sql", StandardCharsets.UTF_8);
      dashboardCloneSql =
          IOUtils.resourceToString("/sql/custom-dashboard-duplicate.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private void handleInsertQueryBind(
      String orgId,
      String dashboardId,
      CustomDashboardUpsertRequest payload,
      PreparedStatement statement)
      throws SQLException {
    statement.setString(1, dashboardId);
    statement.setString(2, payload.getDisplayName());
    statement.setString(3, payload.getAuthor());
    statement.setString(4, payload.getSchema());
    statement.setString(5, orgId);
    statement.setString(6, orgId);
  }

  private void handleUpdateQueryBind(
      String orgId,
      String dashboardId,
      CustomDashboardUpsertRequest payload,
      PreparedStatement statement)
      throws SQLException {
    statement.setObject(1, payload.getDisplayName(), Types.VARCHAR);
    statement.setObject(2, payload.getSchema(), Types.VARCHAR);
    statement.setObject(3, payload.getIsFavorite(), Types.BOOLEAN);
    statement.setString(4, orgId);
    statement.setString(5, dashboardId);
  }

  private CustomDashboard buildNewDashboard(ResultSet dashboardRow) throws SQLException {
    val dashboard = new CustomDashboard();
    dashboard.setId(dashboardRow.getString("id"));
    dashboard.setOrgId(dashboardRow.getString("org_id"));
    dashboard.setAuthor(dashboardRow.getString("author"));
    dashboard.setDisplayName(dashboardRow.getString("display_name"));
    dashboard.setSchema(dashboardRow.getString("schema"));
    dashboard.setIsFavorite(dashboardRow.getBoolean("is_favorite"));
    if (dashboardRow.getTimestamp("creation_timestamp") != null) {
      dashboard.setCreationTimestamp(
          dashboardRow.getTimestamp("creation_timestamp").toInstant().toEpochMilli());
    }
    if (dashboardRow.getTimestamp("last_updated_timestamp") != null) {
      dashboard.setLastUpdatedTimestamp(
          dashboardRow.getTimestamp("last_updated_timestamp").toInstant().toEpochMilli());
    }
    if (dashboardRow.getTimestamp("deleted_timestamp") != null) {
      dashboard.setDeletedTimestamp(
          dashboardRow.getTimestamp("deleted_timestamp").toInstant().toEpochMilli());
    }
    return dashboard;
  }

  @SneakyThrows
  @Transactional
  public CustomDashboard persist(@NotNull String orgId, CustomDashboardUpsertRequest dashboard) {
    try {
      String lockQuery =
          "select pg_advisory_xact_lock(hashtext(concat(?,'-save-custom-dashboard')))";
      @Cleanup Connection db = dataSource.getConnection();
      @Cleanup PreparedStatement lockStatement = db.prepareStatement(lockQuery);
      lockStatement.setString(1, orgId);
      lockStatement.executeQuery();
      @Cleanup PreparedStatement saveStatement = db.prepareStatement(dashboardInsertSql);
      var usedId = dashboard.getId();
      val isUpdate = usedId != null && !usedId.isBlank();
      if (isUpdate) {
        saveStatement = db.prepareStatement(dashboardUpdateSql);
        handleUpdateQueryBind(orgId, usedId, dashboard, saveStatement);
      } else {
        String nextIdQuery =
            "select concat('dashboard-', coalesce(sum(next_available_index), 1)) as next_id from whylabs.custom_dashboards_index_track where org_id = ?";
        @Cleanup PreparedStatement nextIdStatement = db.prepareStatement(nextIdQuery);
        nextIdStatement.setString(1, orgId);
        val result = nextIdStatement.executeQuery();
        result.next();
        usedId = result.getString("next_id");
        handleInsertQueryBind(orgId, usedId, dashboard, saveStatement);
      }
      saveStatement.executeUpdate();
      db.commit();
      String findByIdQuery =
          "select * from whylabs.custom_dashboards where id = ? and org_id = ? and deleted_timestamp is null";
      @Cleanup PreparedStatement findStatement = db.prepareStatement(findByIdQuery);
      findStatement.setString(1, usedId);
      findStatement.setString(2, orgId);
      val savedDashboard = findStatement.executeQuery();
      savedDashboard.next();
      if (savedDashboard.getRow() == 1) {
        return buildNewDashboard(savedDashboard);
      }
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Could not save dashboard");
    } catch (HttpStatusException e) {
      log.error("Error saving dashboard info: {} for org {}", dashboard.toString(), orgId, e);
      throw new HttpStatusException(e.getStatus(), e.getMessage());
    } catch (Exception e) {
      log.error("Error saving dashboard info: {} for org {}", dashboard.toString(), orgId, e);
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public Optional<CustomDashboard> findById(@NotNull String orgId, @NotNull String dashboardId) {
    try {
      String q =
          "select * from whylabs.custom_dashboards where id = :dashboardId and org_id = :orgId and deleted_timestamp is null";
      val query =
          (NativeQueryImpl<CustomDashboard>)
              roEntityManager.createNativeQuery(q, CustomDashboard.class);
      PostgresUtil.setStandardTimeout(query);
      query.setParameter("dashboardId", dashboardId);
      query.setParameter("orgId", orgId);
      val l = query.getResultList();
      if (l.size() < 1) {
        return Optional.empty();
      }
      return Optional.of(l.get(0));
    } catch (Exception e) {
      log.error("Error retrieving dashboard info: {} for org {}", dashboardId, orgId, e);
      return Optional.empty();
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<CustomDashboard> list(@NotNull String orgId) {
    try {
      String q =
          "select * from whylabs.custom_dashboards where org_id = :orgId and deleted_timestamp is null";
      val query =
          (NativeQueryImpl<CustomDashboard>)
              roEntityManager.createNativeQuery(q, CustomDashboard.class);
      PostgresUtil.setStandardTimeout(query);
      query.setParameter("orgId", orgId);
      return query.getResultList();
    } catch (Exception e) {
      log.error("Error retrieving dashboards list for org {}", orgId, e);
      return new ArrayList<>();
    }
  }

  @SneakyThrows
  @Transactional
  public void markAsDeleted(@NotNull String orgId, @NotNull String dashboardId) {
    val query = (NativeQueryImpl) entityManager.createNativeQuery(dashboardMarkAsDeletedSql);
    query.setParameter("id", dashboardId);
    query.setParameter("orgId", orgId);
    query.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  public void clone(@NotNull String orgId, CloneCustomDashboardRequest req) {
    val query = (NativeQueryImpl) entityManager.createNativeQuery(dashboardCloneSql);
    query.setParameter("id", req.getId());
    query.setParameter("orgId", orgId);
    query.setParameter("author", req.getAuthor());
    query.executeUpdate();
  }
}
