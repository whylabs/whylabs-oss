package ai.whylabs.dataservice.responses;

import ai.whylabs.core.configV3.structure.Tag;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.micronaut.core.annotation.Introspected;
import java.util.List;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import lombok.Builder;
import lombok.Data;

@Data
@Introspected
@Builder
public class MaxIORowSegmented {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @JsonIgnore
  private Integer id;

  private Long timestamp;
  private Boolean isOutput;
  private Long maxCount;
  private List<Tag> tags;
}
