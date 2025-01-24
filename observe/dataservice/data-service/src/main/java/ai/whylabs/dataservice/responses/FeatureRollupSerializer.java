package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.responses.ColumnMetric.Type;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import java.io.IOException;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class FeatureRollupSerializer extends StdSerializer<FeatureRollup> {
  public FeatureRollupSerializer() {
    this(null);
  }

  public FeatureRollupSerializer(Class<FeatureRollup> t) {
    super(t);
  }

  @Override
  public void serialize(FeatureRollup value, JsonGenerator jgen, SerializerProvider provider)
      throws IOException, JsonProcessingException {

    // Helper routine for serializing list metrics of a particular type.
    // List of metrics is for a single org/model/feature and all will be the same type, e.g. ints,
    // longs, histograms, etc.
    final BiConsumer<Type, List<ColumnMetric>> serializeMetricList =
        (type, l) -> {
          if (l.size() == 0) return;
          try {
            // output the name of the metric types, e.g. "type_strings" {}:, "type_double": {}
            // followed by array of metric objects
            jgen.writeObjectFieldStart(type.name());
            for (val m : l) {
              jgen.writeObject(m);
            }
            jgen.writeEndObject();
          } catch (IOException ex) {
            log.error("serialization error : {}", type);
          }
        };

    // group columMetrics by the type of result they hold.
    val byType =
        value.getMetrics().values().stream()
            .collect(Collectors.groupingBy(ColumnMetric::typeOf, Collectors.toList()));

    jgen.writeStartObject();

    byType.forEach(serializeMetricList);

    jgen.writeEndObject();
  }
}
