package ai.whylabs.dataservice.util;

import java.util.LinkedHashMap;
import lombok.Getter;
import lombok.val;

public class QueryCollector {

  @Getter private LinkedHashMap<String, String> beforeInitialLoadQueries = new LinkedHashMap<>();
  @Getter private LinkedHashMap<String, String> stagingTableSetup = new LinkedHashMap<>();
  @Getter private LinkedHashMap<String, String> queries = new LinkedHashMap<>();
  @Getter private LinkedHashMap<String, String> afterInitialLoadQueries = new LinkedHashMap<>();

  public void add(String query, String description) {
    queries.put(query, description);
  }

  public void addBeforeInitialLoad(String query, String description) {
    beforeInitialLoadQueries.put(query, description);
  }

  public void addStagingTableSetup(String query, String description) {
    stagingTableSetup.put(query, description);
  }

  public void addAfterInitialLoad(String query, String description) {
    afterInitialLoadQueries.put(query, description);
  }

  public String toBeforeInitialLoad() {
    return pretty(beforeInitialLoadQueries);
  }

  public String toStagingTableSetupScript() {
    return pretty(stagingTableSetup);
  }

  public String toScript() {
    return pretty(queries);
  }

  public String toAfterInitialLoad() {
    return pretty(afterInitialLoadQueries);
  }

  private String pretty(LinkedHashMap<String, String> queries) {
    StringBuilder sb = new StringBuilder();
    for (val e : queries.entrySet()) {
      sb.append("-- ").append(e.getValue()).append("\r\n");
      sb.append(e.getKey()).append(";\r\n\r\n");
    }
    return sb.toString();
  }
}
