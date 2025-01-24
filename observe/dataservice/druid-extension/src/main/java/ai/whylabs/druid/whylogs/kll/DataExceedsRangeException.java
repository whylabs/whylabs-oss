package ai.whylabs.druid.whylogs.kll;

public class DataExceedsRangeException extends Exception {
  String msg;

  DataExceedsRangeException(String msg, Throwable e) {
    this.msg = msg;
    initCause(e);
  }

  public String toString() {
    return ("DataExceedsRangeException: " + msg);
  }
}
