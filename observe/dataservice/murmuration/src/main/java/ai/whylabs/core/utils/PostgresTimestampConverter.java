package ai.whylabs.core.utils;

import java.sql.Date;
import javax.persistence.AttributeConverter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PostgresTimestampConverter implements AttributeConverter<Long, Date> {

  @Override
  public Date convertToDatabaseColumn(Long attribute) {
    if (attribute == null) {
      return null;
    }

    return new Date(attribute);
  }

  @Override
  public Long convertToEntityAttribute(Date dbData) {
    if (dbData == null) {
      return null;
    }

    return dbData.getTime();
  }
}
