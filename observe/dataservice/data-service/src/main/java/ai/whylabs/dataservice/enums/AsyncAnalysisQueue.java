package ai.whylabs.dataservice.enums;

public enum AsyncAnalysisQueue {
  on_demand() {
    @Override
    public String toTable() {
      return "adhoc_async_analysis_queue";
    }
  },
  scheduled {
    @Override
    public String toTable() {
      return "adhoc_async_analysis_queue_scheduled";
    }
  },
  backfill {
    @Override
    public String toTable() {
      return "adhoc_async_analysis_queue_backfill";
    }
  };

  public abstract String toTable();
}
