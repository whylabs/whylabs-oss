package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.responses.GetFeatureWeightsResponse;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import io.swagger.v3.oas.annotations.Operation;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;

@Slf4j
@Singleton
@Repository
public class FeatureWeightsService {

  private final String featureWeightsUpsert;
  private final String featureWeightsDetailsUpsert;

  private Cache<String, GetFeatureWeightsResponse> CACHE =
      CacheBuilder.newBuilder().expireAfterWrite(1, TimeUnit.MINUTES).maximumSize(1000).build();

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private ObjectMapper mapper;

  @Inject private final DataSvcConfig config;

  public FeatureWeightsService(DataSvcConfig config) throws IOException {
    this.config = config;
    this.featureWeightsUpsert =
        IOUtils.resourceToString("/sql/feature-weights-upsert.sql", StandardCharsets.UTF_8);
    this.featureWeightsDetailsUpsert =
        IOUtils.resourceToString("/sql/feature-weights-details-upsert.sql", StandardCharsets.UTF_8);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  @Operation(operationId = "SaveFeatureWeights")
  public int save(String orgId, String datasetId, WeightConfig featureWeights) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    return upsertWeights(db, orgId, datasetId, featureWeights);
  }

  @SneakyThrows
  private int upsertWeights(
      Connection db, String orgId, String datasetId, WeightConfig featureWeights) {

    @Cleanup PreparedStatement pst = db.prepareStatement(featureWeightsUpsert);
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    if (featureWeights.getMetadata() != null) {
      pst.setObject(3, featureWeights.getMetadata().getVersion(), Types.NUMERIC);
      pst.setObject(4, featureWeights.getMetadata().getAuthor(), Types.VARCHAR);
      pst.setTimestamp(5, new Timestamp(featureWeights.getMetadata().getUpdatedTimestamp()));
    } else {
      pst.setObject(3, null, Types.NUMERIC);
      pst.setObject(4, "system", Types.VARCHAR);
      pst.setTimestamp(5, new Timestamp(System.currentTimeMillis()));
    }

    try {
      val response = pst.executeQuery();
      response.next();
      val id = response.getInt(1);

      for (val segmentWeight : featureWeights.getSegmentWeights()) {
        @Cleanup PreparedStatement pstDetails = db.prepareStatement(featureWeightsDetailsUpsert);
        pstDetails.setInt(1, id);
        pstDetails.setString(2, mapper.writeValueAsString(segmentWeight.getSegment()));
        pstDetails.setString(3, mapper.writeValueAsString(segmentWeight.getWeights()));
        pstDetails.executeQuery();
      }

      return id;

    } catch (SQLException e) {
      log.error("Failed to upsert feature weights", e);
      throw e;
    }
  }

  public GetFeatureWeightsResponse loadCached(String orgId, String datasetId) {
    String cacheKey = orgId + datasetId;
    GetFeatureWeightsResponse r = CACHE.getIfPresent(cacheKey);
    if (r != null) {
      return r;
    }

    r = load(orgId, datasetId);
    if (r != null) {
      CACHE.put(cacheKey, r);
    }
    return r;
  }

  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  public GetFeatureWeightsResponse load(String orgId, String datasetId) {
    @Cleanup Connection db = bulkDatasource.getConnection();

    val metadataQuery =
        db.prepareStatement(
            "SELECT version, author, updated_timestamp FROM whylabs.feature_weights WHERE org_id = ? AND dataset_id = ?;");
    metadataQuery.setString(1, orgId);
    metadataQuery.setString(2, datasetId);
    val metadataRs = metadataQuery.executeQuery();

    if (!metadataRs.next()) {
      return null;
    }

    Metadata metadata =
        Metadata.builder()
            .version(metadataRs.getInt("version"))
            .author(metadataRs.getString("author"))
            .updatedTimestamp(metadataRs.getTimestamp("updated_timestamp").getTime())
            .build();

    val segmentWeightQuery =
        db.prepareStatement(
            "SELECT weights, segment FROM whylabs.feature_weight_details fwd "
                + "JOIN whylabs.feature_weights fw ON fw.id = fwd.feature_weight_id "
                + "WHERE fw.org_id = ? AND fw.dataset_id = ?;");
    segmentWeightQuery.setString(1, orgId);
    segmentWeightQuery.setString(2, datasetId);
    val segmentWeightRs = segmentWeightQuery.executeQuery();

    List<SegmentWeightConfig> segmentWeights = new ArrayList<>();
    while (segmentWeightRs.next()) {
      val segmentWeight =
          SegmentWeightConfig.builder()
              .segment(
                  mapper.readValue(
                      segmentWeightRs.getString("segment"), new TypeReference<List<Tag>>() {}))
              .weights(
                  mapper.readValue(
                      segmentWeightRs.getString("weights"),
                      new TypeReference<Map<String, Double>>() {}))
              .build();
      segmentWeights.add(segmentWeight);
    }

    return GetFeatureWeightsResponse.builder()
        .metadata(metadata)
        .segmentWeights(segmentWeights)
        .build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  @Operation(operationId = "DeleteFeatureWeights")
  public void delete(String orgId, String datasetId) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "DELETE FROM whylabs.feature_weights WHERE org_id = ? AND dataset_id = ?;");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    pst.execute();
  }
}
