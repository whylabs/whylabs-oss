package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.requests.SegmentTag;
import io.micronaut.core.annotation.Introspected;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;
import lombok.val;
import org.hibernate.annotations.Type;

@Data
@Introspected
@Entity
public class SegmentsRow {
  @Id private Integer id;

  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> segment;

  private SegmentTag asSegment(String s) {
    val a = s.split("=", 2);
    if (a.length == 2 && a[1] != null) {
      return new SegmentTag(a[0], a[1]);
    }
    return null;
  }

  public List<SegmentTag> asList() {
    return segment.stream().map(s -> asSegment(s)).collect(Collectors.toList());
  }
}
