package ai.whylabs.dataservice.operationalMetrics;

import com.whylogs.core.message.ColumnMessage;

public interface EntitySchemaInstrumentation {

  void accummulateSchema(String columnName, ColumnMessage metrics);

  void publish();
}
