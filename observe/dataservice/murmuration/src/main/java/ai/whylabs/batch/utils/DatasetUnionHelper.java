package ai.whylabs.batch.utils;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import lombok.val;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.DataType;
import scala.collection.JavaConverters;

/**
 * Helper class to union spark datasets with different schemas and align them. Fill missing columns
 * with nulls.
 */
public class DatasetUnionHelper {
  private List<Dataset<Row>> datasets;
  private Map<String, DataType> allFields = new HashMap();
  private List<Column> allColumns = new ArrayList<>();

  public DatasetUnionHelper(List<Dataset<Row>> datasets) {
    this.datasets = datasets;
    for (Dataset<Row> dataset : datasets) {
      for (val field : dataset.schema().fields()) {
        if (!allFields.containsKey(field.name())) {
          allColumns.add(col(field.name()));
        }

        allFields.put(field.name(), field.dataType());
      }
    }
  }

  public Dataset<Row> getUnion() {
    // Align the schemas across all the datasets, create null entries for missing columns
    List<Dataset<Row>> datasetsWithNullColumns = new ArrayList();
    for (Dataset<Row> dataset : datasets) {
      List<String> datasetFieldNames = Arrays.asList(dataset.schema().fieldNames());

      for (Entry<String, DataType> entry : allFields.entrySet()) {
        if (!datasetFieldNames.contains(entry.getKey())) {
          dataset = dataset.withColumn(entry.getKey(), lit(null).cast(entry.getValue()));
        }
      }

      // Re-order each column so they line up across dataframes
      dataset = dataset.select(JavaConverters.asScalaBuffer(allColumns).toSeq());
      datasetsWithNullColumns.add(dataset);
    }

    // Union all the results together
    Dataset<Row> union = datasetsWithNullColumns.get(0);
    for (int x = 1; x < datasetsWithNullColumns.size(); x++) {
      union = union.union(datasetsWithNullColumns.get(x));
    }
    return union;
  }
}
