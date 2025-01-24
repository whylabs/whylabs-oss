package ai.whylabs.batch.utils;

import static org.apache.spark.sql.functions.lit;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

@Slf4j
public class FillMissingColumns {
  public static Dataset<Row> fillMissingColumnsWitNulls(Dataset<Row> df, Field[] declaredFields) {
    val schemaColumns =
        Arrays.asList(df.schema().fieldNames()).stream()
            .map(String::toLowerCase)
            .collect(Collectors.toList());

    for (val f : declaredFields) {
      if (!schemaColumns.contains(f.getName().toLowerCase())) {
        log.info(
            "Column {} not in datalake, adding a null value for schema evolution sake",
            f.getName());
        if (f.getType().isAssignableFrom(List.class)) {
          // TODO: May need to handle lists of numeric types if that ever becomes an issue
          df = df.withColumn(f.getName(), lit(new String[0]));
        } else {
          df = df.withColumn(f.getName(), lit(null));
        }
      }
    }
    return df;
  }
}
