package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.dataservice.cache.CacheService;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.requests.GetSingleProfileInsights;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.insights.*;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.math.BigInteger;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.hibernate.query.Query;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
@JdbcRepository(dialect = Dialect.POSTGRES)
public abstract class ProfileInsightsService {

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager entityManager;

  @Inject EntitySchemaService entitySchemaService;
  @Inject private CacheService cache;

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public BigInteger countInsight(GetSingleProfileInsights rqst) {
    rqst.validate();
    GetEntitySchemaRequest entitySchemaRequest = new GetEntitySchemaRequest();
    entitySchemaRequest.setOrgId(rqst.getOrgId());
    entitySchemaRequest.setDatasetId(rqst.getDatasetId());
    entitySchemaRequest.setIncludeHidden(false);
    EntitySchema entitySchema = entitySchemaService.getWithCaching(entitySchemaRequest);

    String sql = InsightSqlQuery.standard(entitySchema).toCountSql(rqst.getType());
    Query<?> query = (NativeQueryImpl<?>) entityManager.createNativeQuery(sql);
    rqst.doUpdate(query);
    return ((BigInteger) query.uniqueResult());
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<InsightEntry> getSingleProfileInsights(GetSingleProfileInsights rqst) {
    rqst.validate();
    GetEntitySchemaRequest entitySchemaRequest = new GetEntitySchemaRequest();
    entitySchemaRequest.setOrgId(rqst.getOrgId());
    entitySchemaRequest.setDatasetId(rqst.getDatasetId());
    entitySchemaRequest.setIncludeHidden(false);
    EntitySchema entitySchema = entitySchemaService.getWithCaching(entitySchemaRequest);

    // note entitySchema might be null.  That's ok, some insights do not depend on entitySchema.
    val insights = InsightSqlQuery.standard(entitySchema);
    String sql = insights.toSql(rqst.getType());
    @SuppressWarnings("unchecked")
    Query<SingleInsightResult> query =
        (NativeQueryImpl<SingleInsightResult>)
            entityManager.createNativeQuery(sql, SingleInsightResult.class);
    rqst.doUpdate(query);
    val resultList = query.getResultList();
    return insights.processResult(resultList);
  }
}
