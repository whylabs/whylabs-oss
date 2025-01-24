package ai.whylabs.batch.sinks;

import ai.whylabs.batch.utils.SerializableHadoopConfiguration;

public abstract class BaseDruidProfileSink<T> extends BaseDruidSink<T> {
  public static final String EXTENSION = ".bin";

  public BaseDruidProfileSink(
      String stagingArea, SerializableHadoopConfiguration serializableHadoopConfiguration) {
    super(stagingArea, serializableHadoopConfiguration);
  }

  @Override
  protected String getFileExtension() {
    return EXTENSION;
  }
}
