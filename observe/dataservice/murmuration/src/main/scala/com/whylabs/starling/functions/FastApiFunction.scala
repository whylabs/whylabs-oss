package com.whylabs.starling.functions

import com.fasterxml.jackson.databind.ObjectMapper
import com.whylabs.py4j.FastAPIGateway
import org.apache.commons.io.IOUtils
import org.apache.http.client.methods.HttpPost
import org.apache.http.entity.StringEntity
import org.apache.http.impl.client.HttpClientBuilder
import org.slf4j.LoggerFactory

import java.nio.charset.StandardCharsets

class FastApiException(apiPath: String, status: Int, message: String)
    extends RuntimeException(
      s"API ${apiPath} returned status code: $status. Message: $message"
    )

/** A typesafe way to call the Python function.
  *
  * By default, py4j doesn't offer a lot of type safety. So we wrap around py4j
  * basic facilities and enable us to have a more descriptive APIs around inputs
  * and outputs (by expressing them as classes)
  *
  * @param outClazz
  *   the Java class for the output.
  * @tparam IN
  *   the input class.
  * @tparam OUT
  *   the output class
  */
abstract class FastApiFunction[IN, OUT](
    private val apiPath: String,
    private val outClazz: Class[OUT]
) {
  private val mapper = new ObjectMapper()
  private val logger = LoggerFactory.getLogger(this.getClass)
  def apply(input: IN): OUT = {
    this.doApply(input)
  }

  final protected def doApply(input: IN): OUT = {
    val request = mapper.writer().writeValueAsString(input)
    val req = new HttpPost(
      s"http://${FastAPIGateway.Host}:${FastAPIGateway.Port}/$apiPath"
    )
    req.setEntity(new StringEntity(request))
    req.setHeader("Content-Type", "application/json")
    req.setHeader("accept", "application/json")
    val client = HttpClientBuilder.create().build()
    try {
      val res = client.execute(req)
      val resContent =
        IOUtils.toString(res.getEntity.getContent, StandardCharsets.UTF_8)
      if (res.getStatusLine.getStatusCode / 100 != 2) {
        logger.error(
          "Failed to call ARIMA. Got status code: {}",
          res.getStatusLine.getStatusCode
        )

        // TODO: handle this somehow? Would this propagate upstream?
        throw new FastApiException(
          apiPath,
          status = res.getStatusLine.getStatusCode,
          message = resContent
        )
      }
      mapper.readValue(resContent, outClazz)
    } finally {
      client.close();
    }
  }
}
