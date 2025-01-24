package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldNameConstants;

@Data
@Builder
@FieldNameConstants
@Schema(
    example =
        "  {\n"
            + "    \"timestamp\": 1671466890007,\n"
            + "    \"features\": {\n"
            + "      \"alldiffstr\": {\n"
            + "        \"type_boolean\": { \"distribution/isdiscrete\": true },\n"
            + "        \"type_double\": {\n"
            + "          \"distribution/stddev\": 0,\n"
            + "          \"cardinality/hll/upper_1\": 988.8752774524854,\n"
            + "          \"distribution/mean\": 0,\n"
            + "          \"cardinality/hll/est\": 1001.6676182270559,\n"
            + "          \"inferredtype/ratio\": 1,\n"
            + "          \"cardinality/hll/lower_1\": 1014.7788985022999\n"
            + "        },\n"
            + "        \"type_frequentstrings\": {\n"
            + "          \"frequent_items/frequent_strings\": {\n"
            + "            \"numActive\": 37,\n"
            + "            \"mapCapacity\": 96,\n"
            + "            \"maxError\": 3,\n"
            + "            \"items\": { \"770\": { \"lb\": 1, \"est\": 4, \"ub\": 4 }, \"771\": { \"lb\": 1, \"est\": 4, \"ub\": 4 } }\n"
            + "          }\n"
            + "        },\n"
            + "        \"type_long\": {\n"
            + "          \"distribution/kll/n\": 0,\n"
            + "          \"types/integral\": 0,\n"
            + "          \"counts/n\": 1000,\n"
            + "          \"types/object\": 0,\n"
            + "          \"counts/inf\": 0,\n"
            + "          \"types/fractional\": 0,\n"
            + "          \"counts/nan\": 0,\n"
            + "          \"counts/null\": 0,\n"
            + "          \"types/boolean\": 0,\n"
            + "          \"types/string\": 1000\n"
            + "        },\n"
            + "        \"type_string\": { \"inferredtype/type\": \"STRING\" }\n"
            + "      },\n"
            + "      \"alldiffint\": {\n"
            + "        \"type_boolean\": { \"distribution/isdiscrete\": true },\n"
            + "        \"type_double\": { \"distribution/stddev\": 288.8194360957494, \"distribution/kll/max\": 0 },\n"
            + "        \"type_frequentstrings\": {\n"
            + "          \"frequent_items/frequent_strings\": {\n"
            + "            \"numActive\": 37,\n"
            + "            \"mapCapacity\": 96,\n"
            + "            \"maxError\": 3,\n"
            + "            \"items\": { \"770\": { \"lb\": 1, \"est\": 4, \"ub\": 4 }, \"771\": { \"lb\": 1, \"est\": 4, \"ub\": 4 } }\n"
            + "          }\n"
            + "        },\n"
            + "        \"type_histogram\": {\n"
            + "          \"distribution/kll/histogram\": {\n"
            + "            \"width\": 83.25,\n"
            + "            \"counts\": [\"84\", \"84\", \"80\", \"84\", \"84\", \"84\", \"84\", \"80\", \"84\", \"84\", \"84\", \"84\"],\n"
            + "            \"max\": 999,\n"
            + "            \"bins\": [0, 83.25, 166.5, 249.75, 333, 416.25, 499.5, 582.75, 666, 749.25, 832.5, 915.75, 999],\n"
            + "            \"n\": \"1000\"\n"
            + "          }\n"
            + "        },\n"
            + "        \"type_quantile\": { \"distribution/kll/quantiles\": [0, 10, 50] },\n"
            + "        \"type_long\": { \"ints/min\": 0, \"distribution/kll/n\": 1000, \"types/integral\": 1000 },\n"
            + "        \"type_string\": { \"inferredtype/type\": \"UNKNOWN\" }\n"
            + "      }\n"
            + "    }\n"
            + "  }\n")
public class ModelRollup {
  @JsonPropertyDescription("model shared by all feature/metrics found within this object.")
  String datasetId;

  @JsonPropertyDescription("timestamp shared by all feature/metrics found within this object.")
  Long timestamp;

  @JsonPropertyDescription("reference profile ID if this is part of  reference profile result")
  String referenceId;

  @JsonPropertyDescription("map from feature name to collection of metrics")
  Map<String, FeatureRollup> features;
}
