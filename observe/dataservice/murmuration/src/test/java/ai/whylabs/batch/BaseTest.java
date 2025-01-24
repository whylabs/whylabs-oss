package ai.whylabs.batch;

import ai.whylabs.batch.session.SparkSessionFactory;
import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import java.util.HashMap;
import java.util.Map;
import org.apache.spark.sql.SparkSession;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeClass;

public class BaseTest {

  protected SparkSession spark;

  protected String sparkMaster = "local[2]";
  protected Map<String, String> extraConfigs = new HashMap<>();

  private SparkSession getSpark() {
    if (spark == null) {
      init();
    }
    return spark;
  }

  @BeforeClass
  public void init() {
    /* Not really suitable for a prod context, but these make the unit tests 20x faster */
    extraConfigs.put("spark.default.parallelism", "1");
    extraConfigs.put("spark.sql.shuffle.partitions", "1");
    extraConfigs.put("spark.sql.sources.parallelPartitionDiscovery.parallelism", "20");
    extraConfigs.put(
        "spark.hadoop.fs.s3a.aws.credentials.provider",
        WhyLabsCredentialsProviderChain.class.getName());
    // fail fast locally
    extraConfigs.put("spark.yarn.maxAppAttempts", "1");
    extraConfigs.put("spark.yarn.maxAppAttempts", "1");
    extraConfigs.put("spark.driver.host", "127.0.0.1");
    extraConfigs.put("spark.driver.memory", "1G");

    extraConfigs.put("spark.ui.enabled", "false");
    extraConfigs.put("spark.eventLog.enabled", "false");
    extraConfigs.put("spark.hadoop.fs.s3.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem");

    //    extraConfigs.put("spark.executor.memory", "2G");
    //    extraConfigs.put("spark.driver.memory", "2G");

    spark =
        SparkSessionFactory.getSparkSession(
            sparkMaster, extraConfigs, this.getClass().getSimpleName());
    // Too chatty for gitlab
    spark.sparkContext().setLogLevel("error");
  }

  @AfterSuite
  public void cleanup() {
    if (spark != null) {
      spark.stop();
    }
  }

  @AfterTest
  public void clearCache() {
    if (spark != null) {
      spark.catalog().clearCache();
    }
  }
}
