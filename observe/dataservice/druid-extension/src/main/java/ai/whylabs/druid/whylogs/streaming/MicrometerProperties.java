package ai.whylabs.druid.whylogs.streaming;

import java.util.Properties;

public class MicrometerProperties {
  public Properties DEFAULT;

  public MicrometerProperties() {
    DEFAULT = new Properties();
    DEFAULT.setProperty("cloudwatch.enabled", "true");
    DEFAULT.setProperty("cloudwatch.batchSize", "1");
    // How frequently to report metrics. Default: PT1M (1 min).
    // See java.time.Duration#parse(CharSequence)
    DEFAULT.setProperty("cloudwatch.step", "PT0.100S");
  }
}
