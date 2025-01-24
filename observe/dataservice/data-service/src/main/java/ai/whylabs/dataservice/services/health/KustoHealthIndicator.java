package ai.whylabs.dataservice.services.health;

import com.microsoft.azure.kusto.data.Client;
import com.microsoft.azure.kusto.data.KustoOperationResult;
import com.microsoft.azure.kusto.data.KustoResultSetTable;
import io.micronaut.context.annotation.Requires;
import io.micronaut.health.HealthStatus;
import io.micronaut.management.endpoint.health.HealthEndpoint;
import io.micronaut.management.health.indicator.AbstractHealthIndicator;
import jakarta.inject.Singleton;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.logging.log4j.ThreadContext;

/**
 * Add a KustoHealthIndicator. This will force the health endpoint to call the cluster health
 * client, keeping the connection alive and warm. It appears that somehow the cluster client lazy
 * initialization (and possiblity not being used) is causing instability in the cluster. See: <a
 * href="https://app.clickup.com/t/86ayut5p8">clickup</a>
 */
@RequiredArgsConstructor
@Slf4j
@Singleton
@Requires(beans = HealthEndpoint.class)
@Requires(property = "whylabs.dataservice.azure.enabled", value = "true")
public class KustoHealthIndicator extends AbstractHealthIndicator<Map<String, Object>> {
  @Inject private final Client client;

  @Override
  protected Map<String, Object> getHealthInformation() {
    try {
      KustoOperationResult kustoOperationResult =
          client.executeMgmt(
              ".show cluster databases\n"
                  + " | extend PackedRecord = pack_all()\n"
                  + " | project Entry=PackedRecord");
      KustoResultSetTable res = kustoOperationResult.getPrimaryResults();
      int i = 0;
      val infoMap = new HashMap<String, Object>();
      while (res.next()) {
        val row = res.getString(0);
        infoMap.put("row" + (i++), row);
      }
      healthStatus = HealthStatus.UP;
      return infoMap;
    } catch (Exception e) {
      ThreadContext.put("AzureClusterHealthFailed", "true");
      log.warn("AzureClusterHealthcheckFailed - please check the Azure configuration", e);
      // we swallow exception and always return the status as healthy for now
      healthStatus = HealthStatus.UP;
      return Collections.emptyMap();
    }
  }

  @Override
  protected String getName() {
    return "azureKustoCluster";
  }
}
