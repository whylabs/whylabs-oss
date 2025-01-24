package ai.whylabs.songbird.logging

interface JsonLogging {
    val log
        get() = loggerOf(this.javaClass)
}
