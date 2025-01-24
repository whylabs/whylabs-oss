package ai.whylabs.dataservice.services;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;

import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MicronautUtil;
import ai.whylabs.ingestion.V1Metadata;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Named;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.hibernate.query.internal.NativeQueryImpl;

/**
 * Calling this legacy because in the old druid days we would take every tag kv pair and concatenate
 * them together to create what was called a "segment" which had to be a flattened String due to
 * limitations in druid. This table carries that concept forward, materialized such that you don't
 * have to query the entire table.
 *
 * <p>Druid could scan the whole table pretty quick, but in PG we need to materialize it.
 */
@Repository
@Slf4j
public abstract class LegacySegmentRepository {

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource readonlyDatasource;

  @PersistenceContext private EntityManager entityManager;
  private final String legacyUpdateSql;

  @Inject private final ObjectMapper mapper;

  public LegacySegmentRepository(
      @Value("${sql-files.legacy-segments-insert}") Readable legacyUpdateQuery, //
      ObjectMapper mapper //
      ) throws IOException {
    legacyUpdateSql = MicronautUtil.getStringFromReadable(legacyUpdateQuery);
    this.mapper = mapper;
  }

  @SuppressWarnings("JpaQueryApiInspection")
  @SneakyThrows
  @VisibleForTesting
  public long updateLegacySegments(V1Metadata metadata) {
    val props = metadata.getProperties();
    val tags = props.getTagsMap();
    long nRows = 0;
    for (val segment : metadata.getSegmentHeader().getSegmentsList()) {
      List<String> segments = metadata.extractSegments();

      val tagsUpdate = (NativeQueryImpl) entityManager.createNativeQuery(legacyUpdateSql);
      tagsUpdate.setParameter("orgId", tags.get(ORG_ID));
      tagsUpdate.setParameter("datasetId", tags.get(DATASET_ID));
      tagsUpdate.setParameter("segment_text", mapper.writeValueAsString(segments));
      tagsUpdate.setParameter(
          "datasetTimestamp",
          java.sql.Date.from(Instant.ofEpochMilli(props.getDatasetTimestamp())));
      tagsUpdate.setParameter("uploadTimestamp", new Timestamp(Instant.now().toEpochMilli()));

      nRows += tagsUpdate.executeUpdate();
    }

    return nRows;
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @SneakyThrows
  public void hideSegment(String orgId, String datasetId, String segment) {
    String sql =
        "update whylabs.legacy_segments set hidden = true where org_id = ? and dataset_id = ? and segment_text @> ?::jsonb and segment_text <@ ?::jsonb";

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement update = db.prepareStatement(sql);

    update.setString(1, orgId);
    update.setString(2, datasetId);

    String[] tagPairs = StringUtils.split(segment, "&");
    val s = mapper.writeValueAsString(tagPairs);

    update.setString(3, s);
    update.setString(4, s);
    update.executeUpdate();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @SneakyThrows
  public List<Pair<String, String>> getHighlySegmented() {
    String sql =
        "with segment_counts as (select count(segment_text) as c, org_id, dataset_id from whylabs.legacy_segments group by org_id, dataset_id) select * from segment_counts where c > 200";

    @Cleanup Connection db = readonlyDatasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(sql);
    pst.execute();
    val results = pst.getResultSet();
    List<Pair<String, String>> response = new ArrayList<>();
    while (results.next()) {
      response.add(Pair.of(results.getString(2), results.getString(3)));
    }
    return response;
  }
}
