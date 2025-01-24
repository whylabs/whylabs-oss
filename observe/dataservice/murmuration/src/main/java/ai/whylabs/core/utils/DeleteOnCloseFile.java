package ai.whylabs.core.utils;

import com.clearspring.analytics.util.Lists;
import java.io.Closeable;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.OpenOption;
import java.nio.file.StandardOpenOption;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class DeleteOnCloseFile implements AutoCloseable {

  @Getter private final File file;
  private final List<Closeable> closeables = Lists.newArrayList();

  public OutputStream toOutputStream(OpenOption... options) throws IOException {
    if (options.length == 0) {
      options = new OpenOption[] {StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING};
    }
    val os = Files.newOutputStream(file.toPath(), options);
    closeables.add(os);
    return os;
  }

  public InputStream toInputStream(OpenOption... options) throws IOException {
    if (options.length == 0) {
      options = new OpenOption[] {StandardOpenOption.READ};
    }
    val is = Files.newInputStream(file.toPath(), options);
    closeables.add(is);
    return is;
  }

  public static DeleteOnCloseFile wrap(File file) {
    file.deleteOnExit();
    return new DeleteOnCloseFile(file);
  }

  @SneakyThrows
  public static DeleteOnCloseFile of(String prefix, String suffix) {
    return new DeleteOnCloseFile(Files.createTempFile(prefix, suffix).toFile());
  }

  @SneakyThrows
  public static DeleteOnCloseFile of(String prefix) {
    return of(prefix, "unknown");
  }

  @SneakyThrows
  @Override
  public void close() {
    for (Closeable c : closeables) {
      //noinspection deprecation
      IOUtils.closeQuietly(c);
    }
    FileUtils.deleteQuietly(file);
  }
}
