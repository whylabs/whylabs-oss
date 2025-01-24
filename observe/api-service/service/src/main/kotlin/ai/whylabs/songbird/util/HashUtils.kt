package ai.whylabs.songbird.util

import java.math.BigInteger
import java.security.MessageDigest

private val sha = MessageDigest.getInstance("SHA-256")
fun String.sha256(salt: String? = ""): String {
    return BigInteger(1, sha.digest("$this$salt".toByteArray())).toString(16).padStart(32, '0')
}
