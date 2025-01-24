package ai.whylabs.songbird.util

import java.io.BufferedInputStream
import java.io.InputStream
import java.util.zip.GZIPInputStream

object GzipUtils {
    /**
     * Safe deflation method. This method deflate the stream if it can detect that the stream's
     * magic matches a Gzip stream. Otherwise, it assumes that the stream is uncompressed.
     */
    fun deflate(inputStream: InputStream): InputStream {
        val bis = BufferedInputStream(inputStream, 1024 * 8)
        bis.mark(2)
        val byte1 = bis.read()
        val byte2 = bis.read()
        bis.reset()
        val magic: Int = byte1 and 0xff or ((byte2 shl 8) and 0xff00)
        return if (magic == GZIPInputStream.GZIP_MAGIC) {
            GZIPInputStream(bis)
        } else {
            bis
        }
    }
}
