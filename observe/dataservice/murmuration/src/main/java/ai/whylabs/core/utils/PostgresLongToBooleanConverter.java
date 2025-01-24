package ai.whylabs.core.utils;

import javax.persistence.AttributeConverter;

public class PostgresLongToBooleanConverter implements AttributeConverter<Long, Boolean> {

  @Override
  public Boolean convertToDatabaseColumn(Long attribute) {
    if (attribute != null && attribute > 0) {
      return true;
    }

    return false;
  }

  @Override
  public Long convertToEntityAttribute(Boolean dbData) {
    if (dbData != null && dbData) {
      return 1l;
    }
    return 0l;
  }
}
