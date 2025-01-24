package ai.whylabs.dataservice.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ValidateOrgDatasetStrings {
  private static Pattern valid = Pattern.compile("^[a-zA-Z0-9_-]*$");

  public static void test(String s) {
    Matcher matcher = valid.matcher(s);
    if (!matcher.matches()) {
      throw new IllegalArgumentException("String validation failed for " + s);
    }
  }
}
