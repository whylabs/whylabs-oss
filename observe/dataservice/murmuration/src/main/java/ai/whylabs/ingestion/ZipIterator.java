package ai.whylabs.ingestion;

import java.io.*;
import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import lombok.SneakyThrows;

public class ZipIterator implements Iterator<BufferedInputStream>, Closeable {

  private ZipInputStream zipInputStream;
  private BufferedInputStream currentStream;
  private ZipEntry currentEntry;

  public ZipIterator(BufferedInputStream zipInputStream) {
    this.zipInputStream = new ZipInputStream(zipInputStream);
  }

  @SneakyThrows
  @Override
  public boolean hasNext() {
    if (currentStream == null) {
      ZipEntry entry;
      while ((entry = zipInputStream.getNextEntry()) != null) {
        if (!entry.isDirectory()) {
          currentEntry = entry;
          currentStream = new BufferedInputStream(zipInputStream);
          break;
        }
        zipInputStream.closeEntry();
      }
    }
    return (currentStream != null);
  }

  @Override
  public BufferedInputStream next() {
    if (currentStream == null) {
      throw new NoSuchElementException();
    }
    BufferedInputStream result = currentStream;
    currentStream = null;
    return result;
  }

  @Override
  public void close() throws IOException {
    if (zipInputStream != null) {
      zipInputStream.close();
    }
  }

  public String entryName() {
    if (currentEntry == null) {
      throw new NoSuchElementException();
    }
    return currentEntry.getName();
  }

  public long entrySize() {
    if (currentEntry == null) {
      throw new NoSuchElementException();
    }
    return currentEntry.getSize();
  }
}
