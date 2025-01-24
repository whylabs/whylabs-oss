package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.controllers.BulkLoadController;
import ai.whylabs.dataservice.services.OrgIdCountResponse.OrgIdCountRow;
import ai.whylabs.dataservice.structures.ColumnSchema;
import com.amazonaws.services.s3.AmazonS3;
import io.micronaut.context.annotation.Executable;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class AdminService {
  @Inject private final DataSource dataSource;
  @PersistenceContext private EntityManager entityManager;

  public AdminService(DataSource dataSource, AmazonS3 s3) throws IOException {
    this.dataSource = dataSource;
  }

  @Transactional
  public OrgIdCountResponse getOrgIdCounts() throws SQLException {
    val sql =
        "WITH c AS (\n"
            + "  SELECT\n"
            + "    org_id,\n"
            + "    count(*) AS cnt\n"
            + "  FROM whylabs.profiles\n"
            + "  GROUP BY org_id\n"
            + ")\n"
            + "SELECT\n"
            + "    *,\n"
            + "    trunc(((cnt / (SELECT count(*) FROM whylabs.profiles_overall)::float) * 100)::numeric, 3) AS percent\n"
            + "FROM c\n"
            + "order by percent desc;";

    @Cleanup Connection db = dataSource.getConnection();
    @Cleanup PreparedStatement preparedStatement = db.prepareStatement(sql);

    List<OrgIdCountRow> rows = new ArrayList<>();

    if (preparedStatement.execute()) {
      val resultSet = preparedStatement.getResultSet();

      while (resultSet.next()) {
        val row =
            OrgIdCountRow.builder()
                .orgId(resultSet.getString("org_id"))
                .count(resultSet.getInt("cnt"))
                .percent(resultSet.getFloat("percent"))
                .build();
        rows.add(row);
      }
    }

    return OrgIdCountResponse.builder().orgIdAndCount(rows).build();
  }

  /**
   * It'd be nice if we could roll out new columns in PG prior to data being generated for that new
   * column. To fascilitate that we need a list of columns in the target table that are also
   * available on the source table we're ingesting from.
   */
  public List<ColumnSchema> getSharedColumnSchema(String targetTable, String sourceTable) {
    Map<String, ColumnSchema> targetSchema = new HashMap();
    for (val t : getTableSchema(targetTable)) {
      targetSchema.put(t.getColumn_name(), t);
    }
    Map<String, ColumnSchema> sourceSchema = new HashMap();
    for (val s : getTableSchema(sourceTable)) {
      sourceSchema.put(s.getColumn_name(), s);
    }

    List<ColumnSchema> sharedColumns = new ArrayList<>();
    for (val t : targetSchema.entrySet()) {
      if (sourceSchema.containsKey(t.getKey())) {
        sharedColumns.add(t.getValue());
      }
    }
    return sharedColumns;
  }

  // TODO: Caching?
  @Transactional
  @Executable
  public List<ColumnSchema> getTableSchema(String tableName) {
    String q =
        "select column_name, udt_name FROM information_schema.columns WHERE table_schema = 'whylabs' AND table_name = :tableName and column_default is null";

    val query = (NativeQueryImpl) entityManager.createNativeQuery(q);
    query.setParameter("tableName", tableName);
    val r = query.getResultList();
    List<ColumnSchema> responses = new ArrayList<>();
    for (val row : r) {
      responses.add(
          ColumnSchema.builder()
              .column_name((String) ((Object[]) row)[0])
              .udt_name((String) ((Object[]) row)[1])
              .build());
    }

    return responses;
  }

  /**
   * When doing the initial load we want a list of all the index DDLs so we can drop them and re-add
   * the index after the bulk load.
   *
   * @param tableName
   * @return
   */
  @Transactional
  @Executable
  public Map<String, String> getIndexDDLs(String tableName) {
    String q =
        "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = :tableName and schemaname = 'whylabs'";
    val query = (NativeQueryImpl) entityManager.createNativeQuery(q);
    query.setParameter("tableName", tableName);
    val r = query.getResultList();
    Map<String, String> indexDDLs = new HashMap<>();
    for (val row : r) {
      val oArray = (Object[]) row;
      indexDDLs.put((String) oArray[0], (String) oArray[1]);
    }

    return indexDDLs;
  }

  @SneakyThrows
  @Transactional
  @Executable
  public void purgeOldMaterializedTables() {
    String q =
        "select tablename FROM pg_catalog.pg_tables WHERE schemaname = 'whylabs' AND tablename  like 'materialized_%'";

    val query = (NativeQueryImpl) entityManager.createNativeQuery(q);
    val r = query.getResultList();

    try (val con = dataSource.getConnection()) {
      try (val stmt = con.createStatement()) {
        for (val row : r) {
          String table = (String) row;
          val split = StringUtils.split(table, BulkLoadController.DELIMITER);
          String last = split[split.length - 1];
          if (!StringUtils.isNumeric(last)) {
            log.info(
                "Table {} doesn't follow the convention of having a unix timestamp at the end. Skipping",
                table);
            continue;
          }
          Long age = System.currentTimeMillis() - new Long(last);
          if (age > 1000 * 60 * 60 * 24) {
            log.info("Dropping old materialized table {} because its over a day old", table);
            stmt.execute("drop table if exists whylabs." + table + " cascade");
          } else {
            log.info(
                "Materialized table still around, but created recently. Purge process skipping {}",
                table);
          }
        }
      }
    }
  }
}
