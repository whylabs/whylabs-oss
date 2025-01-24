package ai.whylabs.core.utils;

import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import com.google.common.collect.Lists;
import java.util.List;
import javax.persistence.AttributeConverter;
import javax.persistence.Converter;

@Converter(autoApply = true)
public class ColumnListChangeModeConverter
    implements AttributeConverter<ColumnListChangeMode, Integer> {

  public static final List<ColumnListChangeMode> ALL_VALUES =
      Lists.newArrayList(ColumnListChangeMode.values());

  @Override
  public Integer convertToDatabaseColumn(ColumnListChangeMode value) {
    if (value == null) {
      return null;
    }
    return ALL_VALUES.indexOf(value);
  }

  @Override
  public ColumnListChangeMode convertToEntityAttribute(Integer idx) {
    if (idx == null) {
      return null;
    }

    return ALL_VALUES.get(idx);
  }
}
