package com.whylabs.py4j

import io.micronaut.context.annotation.Property
import lombok.`val`
import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.SystemUtils
import org.slf4j.LoggerFactory

import java.io.{File, IOException, InputStream, OutputStream}
import java.net.{HttpURLConnection, InetSocketAddress, Socket, URL}
import java.nio.charset.Charset

object FastAPIGateway {
  val Port = 8099
  val Host: String = System.getenv.getOrDefault("FASTAPI_HOST", "localhost")
  val NumberOfWorkers = 4

  private val logger = LoggerFactory.getLogger(this.getClass)

  private def checkSocket() = {
    val serverURL =
      new URL("http://${Host}:${Port}") // Replace with your server's URL

    // wait for socket
    val timeoutMillis = 10000 // 10 seconds

    try {
      val startMillis = System.currentTimeMillis()
      var connected = false

      while (
        !connected && (System.currentTimeMillis() - startMillis) < timeoutMillis
      ) {
        val connection =
          serverURL.openConnection().asInstanceOf[HttpURLConnection]
        try {
          connection.setRequestMethod("GET")
          val responseCode = connection.getResponseCode

          if (responseCode == 200) {
            connected = true;
          } else {
            logger.warn(
              "Not available yet. Sleeping 100ms. Response code: {}",
              responseCode
            )
            Thread.sleep(100)
          }
        } catch {
          case e: Exception =>
            // Sleep for a short duration before retrying
            logger.warn("Not available yet. Sleeping 100ms. {}", e.getMessage)
            Thread.sleep(100)
        } finally {
          connection.disconnect()
        }
      }

      connected
    } catch {
      case e: Exception =>
        logger.error(s"Unexpected Error", e)
        false
    }
  }
}

private class RedirectThread(
    in: InputStream,
    out: OutputStream,
    name: String,
    propagateEof: Boolean = false
) extends Thread(name) {

  setDaemon(true)

  override def run(): Unit = {
    scala.util.control.Exception.ignoring(classOf[IOException]) {
      // FIXME: We copy the stream on the level of bytes to avoid encoding problems.
      Utils.tryWithSafeFinally {
        val buf = new Array[Byte](1024)
        var len = in.read(buf)
        while (len != -1) {
          out.write(buf, 0, len)
          out.flush()
          len = in.read(buf)
        }
      } {
        if (propagateEof) {
          out.close()
        }
      }
    }
  }
}

private object Utils {
  private val logger = LoggerFactory.getLogger(this.getClass)

  def tryWithSafeFinally[T](block: => T)(finallyBlock: => Unit): T = {
    var originalThrowable: Throwable = null
    try {
      block
    } catch {
      case t: Throwable =>
        // Purposefully not using NonFatal, because even fatal exceptions
        // we don't want to have our finallyBlock suppress
        originalThrowable = t
        throw originalThrowable
    } finally {
      try {
        finallyBlock
      } catch {
        case t: Throwable
            if originalThrowable != null && originalThrowable != t =>
          originalThrowable.addSuppressed(t)
          logger.warn(s"Suppressing exception in finally: ${t.getMessage}", t)
          throw originalThrowable
      }
    }
  }
}
