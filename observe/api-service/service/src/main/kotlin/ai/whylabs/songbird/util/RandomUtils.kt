package ai.whylabs.songbird.util

import java.security.SecureRandom

object RandomUtils {

    private val charPool: List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')
    private val secureRandom = ThreadLocal.withInitial { SecureRandom() }

    fun newId(prefix: String = "", len: Int = 16): String {
        val random = secureRandom.get()
        val bytes = ByteArray(len)
        random.nextBytes(bytes)

        val result = (bytes.indices)
            .map {
                charPool[random.nextInt(charPool.size)]
            }
            .joinToString("")
        return listOf(prefix, result).filter { it.isNotEmpty() }.joinToString("-")
    }
}
