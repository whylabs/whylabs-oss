package ai.whylabs.dataservice;

import ai.whylabs.adhoc.AdHocAnalyzerRunnerV3;
import ai.whylabs.adhoc.BackfillExplanationRunner;
import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.sqs.AmazonSQSAsync;
import com.amazonaws.services.sqs.AmazonSQSAsyncClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microsoft.azure.kusto.data.Client;
import com.microsoft.azure.kusto.data.ClientFactory;
import com.microsoft.azure.kusto.data.HttpClientProperties;
import com.microsoft.azure.kusto.data.auth.ConnectionStringBuilder;
import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Property;
import io.micronaut.context.annotation.Replaces;
import io.micronaut.context.annotation.Requires;
import io.micronaut.core.util.StringUtils;
import io.micronaut.jdbc.DataSourceResolver;
import io.micronaut.management.endpoint.health.HealthEndpoint;
import io.micronaut.management.health.aggregator.HealthAggregator;
import io.micronaut.management.health.indicator.jdbc.JdbcIndicator;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.transaction.jdbc.DelegatingDataSourceResolver;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

@Factory
@Slf4j
public class BeansFactory {

  @Singleton
  public AdHocAnalyzerRunnerV3 adHocAnalyzerRunnerV3() {
    return new AdHocAnalyzerRunnerV3();
  }

  @Singleton
  public BackfillExplanationRunner backfillExplanationRunner() {
    return new BackfillExplanationRunner();
  }

  @Singleton
  public ObjectMapper objectMapper() {
    ObjectMapper mapper = new ObjectMapper();
    MonitorConfigV3JsonSerde.configureMapper(mapper);
    return mapper;
  }

  @Singleton
  public AmazonSQSAsync sqsAsyncClient() {
    return AmazonSQSAsyncClient.asyncBuilder()
        .withCredentials(WhyLabsCredentialsProviderChain.getInstance())
        .withRegion(Regions.US_WEST_2)
        .build();
  }

  @Singleton
  @Requires(beans = HealthEndpoint.class)
  @Requires(property = HealthEndpoint.PREFIX + ".postgres.enabled", notEquals = StringUtils.FALSE)
  @Requires(classes = DataSourceResolver.class)
  @Requires(beans = DataSource.class)
  @Replaces(JdbcIndicator.class)
  public JdbcIndicator jdbcIndicator(
      @Named(TaskExecutors.IO) ExecutorService executorService,
      @Named(DatasourceConstants.HEALTHCHECK) DataSource datasource,
      HealthAggregator<?> healthAggregator,
      DelegatingDataSourceResolver resolver) {
    return new JdbcIndicator(
        executorService,
        Arrays.asList(datasource).toArray(new DataSource[0]),
        resolver,
        healthAggregator);
  }

  @Singleton
  public Client azureKustoClient(
      SecretsManagerClient secretsManagerClient,
      ObjectMapper mapper,
      @Property(name = "whylabs.dataservice.azure.clusterPath") String clusterPath,
      @Property(name = "whylabs.dataservice.azure.appId") String appId,
      @Property(name = "whylabs.dataservice.azure.appTenant") String appTenant,
      @Property(name = "whylabs.dataservice.azure.secret") String secretId)
      throws JsonProcessingException, URISyntaxException {
    val getSecretReq = GetSecretValueRequest.builder().secretId(secretId).build();
    val secretValueResponse = secretsManagerClient.getSecretValue(getSecretReq);
    log.info("Using secret version: {}/{}", secretId, secretValueResponse.versionId());
    String appKey = mapper.readTree(secretValueResponse.secretString()).get("appKey").asText();

    val csb =
        ConnectionStringBuilder.createWithAadApplicationCredentials(
            clusterPath, appId, appKey, appTenant);

    val properties =
        HttpClientProperties.builder()
            .keepAlive(true)
            .maxKeepAliveTime(120)
            .maxConnectionsPerRoute(40)
            .maxConnectionsTotal(40)
            .build();

    return ClientFactory.createClient(csb, properties);
  }
}
