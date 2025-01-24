package ai.whylabs.songbird.util

internal val alphaNumPool = listOf(
    '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
)

fun randomAlphaNumericId(size: Int = 6): String {
    return (1..size)
        .map { kotlin.random.Random.nextInt(0, alphaNumPool.size) }
        .map(alphaNumPool::get)
        .joinToString("")
}
