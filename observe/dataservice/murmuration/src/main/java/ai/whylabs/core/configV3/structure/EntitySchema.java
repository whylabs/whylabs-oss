package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.enums.ModelType;
import io.micronaut.core.annotation.Nullable;
import java.util.Map;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntitySchema {
  private Integer id;
  private Metadata metadata;
  private Map<String, ColumnSchema> columns;
  private ModelType modelType;
  @Nullable private Map<String, CustomMetricSchema> customMetrics;
  private String orgId;
  private String datasetId;

  public static boolean majorUpdate(EntitySchema updated, EntitySchema old) {
    if (old == null) {
      return true;
    }

    if (!Objects.equals(updated.getModelType(), old.getModelType())
        || Metadata.majorUpdate(updated, old)) {

      return true;
    }
    return false;
  }
}
