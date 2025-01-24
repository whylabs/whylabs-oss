package ai.whylabs.core.utils;

public class CamelSnakeConversion {
  public static final String CAMEL_CASE_REGEX = "([a-z]+)([A-Z]+)";
  public static final String SNAKE_CASE_PATTERN = "$1\\_$2";

  public static String toSnake(String camel) {
    return camel.replaceAll(CAMEL_CASE_REGEX, SNAKE_CASE_PATTERN).toLowerCase();
  }
}
