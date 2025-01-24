package ai.whylabs.songbird.util

import io.micronaut.http.multipart.StreamingFileUpload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.single
import kotlinx.coroutines.reactive.asFlow
import kotlinx.coroutines.withContext
import java.io.Closeable
import java.io.File
import java.nio.file.Files
import java.nio.file.Path

object IOUtils {

    suspend fun createTempFile(prefix: String? = null, suffix: String? = null): Path {
        return withContext(Dispatchers.IO) {
            @Suppress("BlockingMethodInNonBlockingContext")
            Files.createTempFile(prefix ?: "prefix", suffix ?: ".unknown")
        }
    }
}

class DeleteOnCloseTempFile(prefix: String? = null, suffix: String? = null) : Closeable {
    private val path = Files.createTempFile(prefix ?: "prefix", suffix ?: ".unknown")

    fun get(): Path {
        return path
    }

    fun toFile(): File {
        return path.toFile()
    }

    override fun close() {
        path.toFile().delete()
    }

    companion object {
        suspend fun StreamingFileUpload.toTempFile(): DeleteOnCloseTempFile {
            val tmpFile = DeleteOnCloseTempFile(this.name)
            val success = this.transferTo(tmpFile.path.toFile()).asFlow().single()
            check(success) { "Failed to transfer data to local path: $tmpFile" }
            return tmpFile
        }
    }
}
