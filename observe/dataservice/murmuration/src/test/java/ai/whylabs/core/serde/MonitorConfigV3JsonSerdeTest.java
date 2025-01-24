package ai.whylabs.core.serde;

import static org.testng.Assert.*;

import lombok.val;
import org.testng.annotations.Test;

public class MonitorConfigV3JsonSerdeTest {

  @Test
  public void testEntitySchemaparsing() {
    // verifies that we accept both "bool" or "boolean" as boolean types in the entity schema.
    val json =
        "{\n"
            + "  \"id\": \"1f8f2d63-c3cc-4021-849d-bd1f910649c9\",\n"
            + "  \"schemaVersion\": 1,\n"
            + "  \"orgId\": \"org-4817\",\n"
            + "  \"datasetId\": \"model-1\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"metadata\": {\n"
            + "    \"schemaVersion\": 1,\n"
            + "    \"author\": \"system\",\n"
            + "    \"updatedTimestamp\": 1664311983860,\n"
            + "    \"version\": 98\n"
            + "  },\n"
            + "  \"analyzers\": [],\n"
            + "  \"monitors\": [],\n"
            + "  \"entitySchema\": {\n"
            + "    \"metadata\": {\n"
            + "      \"author\": \"system\",\n"
            + "      \"version\": 2,\n"
            + "      \"updatedTimestamp\": 1660239376297\n"
            + "    },\n"
            + "    \"columns\": {\n"
            + "      \"bool_feature\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"bool\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      },\n"
            + "      \"boolean_feature\": {\n"
            + "        \"discreteness\": \"continuous\",\n"
            + "        \"dataType\": \"boolean\",\n"
            + "        \"classifier\": \"input\"\n"
            + "      }\n"
            + "    }\n"
            + "  },\n"
            + "  \"weightConfig\": {\n"
            + "    \"metadata\": {\n"
            + "      \"author\": \"system\",\n"
            + "      \"version\": 0,\n"
            + "      \"updatedTimestamp\": 1664311983978\n"
            + "    },\n"
            + "    \"segmentWeights\": []\n"
            + "  }\n"
            + "}\n";

    val config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    // if parsing fails, this will throw InvalidFormatException.
    assertNotNull(config);
  }
}
