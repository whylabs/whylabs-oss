package ai.whylabs.dataservice.util;

import ai.whylabs.dataservice.requests.SegmentTag;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import javax.persistence.AttributeConverter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

// import com.vladmihalcea.hibernate.type.array.internal.ArrayUtil;
// import org.postgresql.core.BaseConnection;
// import org.postgresql.jdbc.PgArray;

@Slf4j
public class PostgresSegmentTextConverter implements AttributeConverter<List<SegmentTag>, String> {
  static final Comparator<SegmentTag> TAG_ORDER_V3 =
      Comparator.comparing(SegmentTag::getKey).thenComparing(SegmentTag::getValue);
  private static final ObjectMapper mapper = new ObjectMapper();

  @Override
  public String convertToDatabaseColumn(List<SegmentTag> tags) {
    if (tags == null) {
      return null;
    }
    val node = mapper.createArrayNode();
    tags.stream()
        .filter(Objects::nonNull) //
        .forEach(t -> node.add(t.getKey() + "=" + t.getValue()));
    return node.toString();
  }

  @SneakyThrows
  @Override
  public List<SegmentTag> convertToEntityAttribute(String attribute) {
    if (attribute == null) {
      return null;
    }

    // expects Json array e.g.
    val tagStrs = mapper.readValue(attribute, String[].class);
    val tags =
        Arrays.stream(tagStrs)
            .filter(i -> i.contains("="))
            .map(it -> StringUtils.split(it, "=", 2))
            .map(it -> new SegmentTag(it[0], it.length > 1 ? it[1] : ""))
            .collect(Collectors.toList());

    return tags;
  }
}
