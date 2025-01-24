package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.shaded.whylabs.com.google.protobuf.util.JsonFormat;
import com.whylogs.v0.core.message.HistogramSummary;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class ColumnMetricSerializer extends StdSerializer<ColumnMetric> {
  public ColumnMetricSerializer() {
    this(null);
  }

  public ColumnMetricSerializer(Class<ColumnMetric> t) {
    super(t);
  }

  @Override
  public void serialize(ColumnMetric v, JsonGenerator jgen, SerializerProvider provider)
      throws IOException, JsonProcessingException {
    switch (v.typeOf()) {
      case type_long:
        jgen.writeNumberField(v.getMetricPath(), v.getLongs());
        break;
      case type_double:
        jgen.writeNumberField(v.getMetricPath(), v.getDoubles());
        break;
      case type_string:
        jgen.writeStringField(v.getMetricPath(), v.getStrings());
        break;
      case type_boolean:
        jgen.writeBooleanField(v.getMetricPath(), v.getBooleans());
        break;
      case type_quantile:
        jgen.writeFieldName(v.getMetricPath());
        jgen.writeArray(v.getQuantiles(), 0, v.getQuantiles().length);
        break;
      case type_frequentstrings:
        jgen.writeFieldName(v.getMetricPath());
        jgen.writeObject(v.getFrequent_strings());
        break;
      case type_histogram:
        // NB the HistogramSummary is a protobuf message,
        // protobuf messages must be converted to json with Google's json generator (not Jackson).
        val summary = JsonFormat.printer().print((HistogramSummary) v.getHistogram());
        jgen.writeFieldName(v.getMetricPath());
        jgen.writeRawValue(summary);
        break;
      default:
        log.trace("unrecognized metric type: {} - {}", v.getColumnName(), v.getMetricPath());
    }
  }
}
