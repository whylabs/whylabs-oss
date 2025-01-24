package ai.whylabs.core.utils;

public class ConfigAwsSdk {

  public static void defaults() {
    System.setProperty(
        "software.amazon.awssdk.http.async.service.impl",
        "software.amazon.awssdk.http.nio.netty.NettySdkAsyncHttpService");
    System.setProperty(
        "software.amazon.awssdk.http.service.impl",
        "software.amazon.awssdk.http.apache.ApacheSdkHttpService");
  }
}
