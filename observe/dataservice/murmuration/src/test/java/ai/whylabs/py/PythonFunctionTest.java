package ai.whylabs.py;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.testng.SkipException;
import org.testng.annotations.BeforeMethod;

@Slf4j
public class PythonFunctionTest {
  @BeforeMethod
  public void checkForPython() {
    /*
    GUNICORN_EXEC=/Users/chris/miniconda3/envs/whylogs-processing-core/bin/gunicorn;
    PYSPARK_PYTHON=/Users/chris/miniconda3/envs/whylogs-processing-core/bin/python;
    STARLING_DEBUG=true;
    STARLING_PATH=/Volumes/Workspace/whylabs-processing-core/python/starling;
    WHYLABS_PYSPARK=YES
     */
    if (StringUtils.isEmpty(System.getenv("PYSPARK_PYTHON"))) {
      throw new SkipException("PYSPARK_PYTHON environment variable is not set");
    }
    if (StringUtils.isEmpty(System.getenv("GUNICORN_EXEC"))) {
      throw new SkipException("GUNICORN_EXEC environment variable is not set");
    }
    if (StringUtils.isEmpty(System.getenv("WHYLABS_PYSPARK"))) {
      throw new SkipException("WHYLABS_PYSPARK environment variable is not set");
    }
    if (StringUtils.isEmpty(System.getenv("STARLING_PATH"))) {
      throw new SkipException("STARLING_PATH environment variable is not set");
    }
  }
}
