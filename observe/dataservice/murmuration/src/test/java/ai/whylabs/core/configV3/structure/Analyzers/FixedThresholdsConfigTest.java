package ai.whylabs.core.configV3.structure.Analyzers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.instanceOf;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;

import ai.whylabs.core.calculationsV3.FixedThresholdCalculationDouble;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import lombok.val;
import org.testng.annotations.Test;

public class FixedThresholdsConfigTest {

  @Test()
  public void testHappyPath() {
    val json =
        "{"
            + "  \"id\": \"06aad013-e16e-476b-a155-b5c80f49f1d3\","
            + "  \"schemaVersion\": 1,"
            + "  \"orgId\": \"org-97ykEm\","
            + "  \"datasetId\": \"model-3\","
            + "  \"granularity\": \"daily\","
            + "  \"metadata\": {"
            + "    \"schemaVersion\": 1,"
            + "    \"author\": \"api\","
            + "    \"updatedTimestamp\": 1667712304480,"
            + "    \"version\": 0"
            + "  },"
            + "  \"analyzers\": ["
            + "    {"
            + "      \"id\": \"fixed-analyzer\","
            + "      \"schedule\": {"
            + "        \"type\": \"fixed\","
            + "        \"cadence\": \"daily\""
            + "      },"
            + "      \"disabled\": false,"
            + "      \"targetMatrix\": {"
            + "        \"segments\": ["
            + "          {"
            + "            \"tags\": []"
            + "          }"
            + "        ],"
            + "        \"type\": \"column\","
            + "        \"include\": ["
            + "          \"*\""
            + "        ]"
            + "      },"
            + "      \"config\": {"
            + "        \"type\": \"fixed\","
            + "        \"metric\": \"median\","
            + "        \"upper\": 70000,"
            + "        \"lower\": 4500,"
            + "        \"nConsecutive\": 3"
            + "      },"
            + "      \"metadata\": {"
            + "        \"schemaVersion\": 1,"
            + "        \"author\": \"api\","
            + "        \"updatedTimestamp\": 1667603617649,"
            + "        \"version\": 5"
            + "      }"
            + "    }"
            + "  ],"
            + "  \"monitors\": [ ]"
            + "}";
    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      // check `nConsecutive`, mixed-case properties can cause deserialization indigestion
      assertThat(analyzer.getConfig(), instanceOf(FixedThresholdsConfig.class));
      FixedThresholdsConfig config = (FixedThresholdsConfig) analyzer.getConfig();
      assertThat(config.getNConsecutive(), is(3L));
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(FixedThresholdCalculationDouble.class));
    }
  }

  @Test()
  public void testBadMetricType() {
    val json =
        "{\n"
            + "  \"id\": \"06aad013-e16e-476b-a155-b5c80f49f1d3\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-97ykEm\",\n"
            + "  \"datasetId\": \"model-3\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"metadata\": {\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"author\": \"api\",\n"
            + "    \"updatedTimestamp\": 1667712304480,\n"
            + "    \"version\": 0\n"
            + "  },\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"fixed-analyzer\",\n"
            + "      \"schedule\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"cadence\": \"daily\"\n"
            + "      },\n"
            + "      \"disabled\": false,\n"
            + "      \"targetMatrix\": {\n"
            + "        \"segments\": [\n"
            + "          {\n"
            + "            \"tags\": []\n"
            + "          }\n"
            + "        ],\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"type\": \"fixed\",\n"
            + "        \"metric\": \"histogram\",\n"
            + "        \"upper\": 70000,\n"
            + "        \"lower\": 4500\n"
            + "      },\n"
            + "      \"metadata\": {\n"
            + "        \"schemaVersion\": 1,\n"
            + "        \"author\": \"api\",\n"
            + "        \"updatedTimestamp\": 1667603617649,\n"
            + "        \"version\": 5\n"
            + "      }\n"
            + "    }\n"
            + "  ],\n"
            + "  \"monitors\": [ ]\n"
            + "}\n";
    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      // mismatched metric type should result in null calculation.
      assertNull(calculation);
    }
  }
}
