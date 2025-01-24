package com.whylabs.starling.feature

import ai.whylabs.py.{PyArimaFunctionV2, PyArimaInput}
import org.apache.commons.lang3.SystemUtils
import org.apache.spark.whylogs.SharedSparkContext
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

case class BadInputData(input: Double)

case class InputData(input: String)

class WhyLogsProcessingDemoSuite
    extends AnyFlatSpec
    with SharedSparkContext
    with Matchers {

  ignore should "read data" in {
    // TODO: fix me
    if (SystemUtils.OS_NAME.toLowerCase().contains("mac")) {
      val range = (1 to 100).toSeq
      val res = spark.sparkContext
        .parallelize(range)
        .map(i => {
          val build = PyArimaInput
            .builder()
            .alpha(0.5)
            .build
          PyArimaFunctionV2.INSTANCE.apply(build)
        })
        .collect()
      res.foreach(e => println(s" RES $e"))
    } else {
      println(
        "Skip non-local test since it requires Python (needs the right Docker container)"
      )
    }
  }
}
