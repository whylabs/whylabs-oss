package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.services.AnalysisService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;
import org.testcontainers.images.builder.Transferable;

@MicronautTest
@Slf4j
public class BulkLoadTest extends BasePostgresTest {
  @Inject private AnalysisService analysisService;

  @SneakyThrows
  @Test
  public void bulkLoadAnalyzerResults() {
    try (val is = getClass().getResourceAsStream("/dumps/analyzer_result_json.txt")) {
      val content = Transferable.of(IOUtils.toByteArray(is));
      String tmpPath = "/tmp/analyzer_results.txt";
      POSTGRES_CONTAINER.copyFileToContainer(content, tmpPath);

      runDirectQuery(
          "COPY whylabs.bulk_proxy_analysis (json_blob) FROM PROGRAM 'cat \"" + tmpPath + "\"'");

      val written = analysisService.findByAnalysisId("70a501b5-64aa-3053-842d-3f09393cd2e1").get();
      assertTrue(written.getTraceIds().size() > 0);
      assertTrue(written.getAnalyzerTags().size() > 0);
      assertTrue(written.getDisableTargetRollup());
    }
  }
}
