package ai.whylabs.batch.sinks;

import ai.whylabs.batch.utils.SerializableHadoopConfiguration;
import java.net.URI;
import java.util.Iterator;
import java.util.UUID;
import org.apache.hadoop.fs.FSDataOutputStream;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.spark.api.java.function.ForeachPartitionFunction;

/**
 * Take an iterator of and sink all the contents to file in a blob store
 *
 * <p>Tip: If you have any AWS credential issues using S3, try auth without SSO:
 *
 * <p>brew install npm; npm install -g aws-sso-creds-helper; aws sso login ssocreds -p default
 */
public abstract class BaseDruidSink<T> implements ForeachPartitionFunction<T> {
  protected String stagingArea;
  protected SerializableHadoopConfiguration serializableHadoopConfiguration;

  public BaseDruidSink(
      String stagingArea, SerializableHadoopConfiguration serializableHadoopConfiguration) {
    this.stagingArea = stagingArea;
    this.serializableHadoopConfiguration = serializableHadoopConfiguration;
  }

  @Override
  public void call(Iterator<T> t) throws Exception {
    String file = stagingArea + UUID.randomUUID().toString() + getFileExtension();

    /**
     * Using te hadoop API gives us automagic multi-filesystem support without any conditionals but
     * we can swap this out for Fileoutput Streams and aws s3 sdk stuff if we want to.
     */
    FileSystem fs = FileSystem.get(new URI(file), serializableHadoopConfiguration.get());
    try (FSDataOutputStream outputStream = fs.create(new Path(file))) {
      while (t.hasNext()) {
        byte[] data = toBytes(t.next());
        outputStream.write(data);
      }
    }
  }

  /** Convert a record to bytes (profile, events, whatever) */
  protected abstract byte[] toBytes(T row);

  /**
   * Filenames are randomly generated, but you can control the file extension
   *
   * @return
   */
  protected abstract String getFileExtension();
}
