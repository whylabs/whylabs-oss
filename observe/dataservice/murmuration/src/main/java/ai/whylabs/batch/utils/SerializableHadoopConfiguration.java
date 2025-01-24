package ai.whylabs.batch.utils;

import java.io.IOException;
import java.io.Serializable;
import org.apache.hadoop.conf.Configuration;

public class SerializableHadoopConfiguration implements Serializable {
  Configuration conf;

  public SerializableHadoopConfiguration(Configuration hadoopConf) {
    this.conf = hadoopConf;

    if (this.conf == null) {
      this.conf = new Configuration();
    }
  }

  public SerializableHadoopConfiguration() {
    this.conf = new Configuration();
  }

  public Configuration get() {
    return this.conf;
  }

  private void writeObject(java.io.ObjectOutputStream out) throws IOException {
    this.conf.write(out);
  }

  private void readObject(java.io.ObjectInputStream in) throws IOException {
    this.conf = new Configuration();
    this.conf.readFields(in);
  }
}
