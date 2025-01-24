package ai.whylabs.whylogsv1;

import java.io.IOException;

/** Thrown if we can't find the WHY1 header for any reason */
public class BadHeaderException extends IOException {

  public BadHeaderException(String s, IOException ioe) {
    super(s, ioe);
  }

  public BadHeaderException(String s) {
    super(s);
  }
}
