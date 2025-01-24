package ai.whylabs.songbird.logging

import org.apache.logging.log4j.Level
import org.apache.logging.log4j.kotlin.asLog4jSupplier
import org.apache.logging.log4j.kotlin.loggerDelegateOf
import org.apache.logging.log4j.spi.ExtendedLogger

/**
 * A class that implements a partial Log4j interface for Kotlin
 *
 * Unfortunately due to the limitation of how JVM type erasure works, the interface isn't as nice
 * as I wish it could be.
 */
class SongbirdLogger(private val delegate: ExtendedLogger) {
    companion object {
        val FQCN: String = SongbirdLogger::class.java.name
    }

    fun debug(message: String, vararg args: Any?) {
        delegate.logIfEnabled(FQCN, Level.DEBUG, null, message, *args)
    }

    fun debug(message: String, exception: Throwable? = null) {
        delegate.logIfEnabled(FQCN, Level.DEBUG, null, message, exception)
    }

    fun debugMsg(message: () -> String) {
        delegate.logIfEnabled(FQCN, Level.DEBUG, null, message.asLog4jSupplier(), null)
    }

    fun debug(block: LogEventProps.() -> Unit) {
        val props = LogEventProps()
        block.invoke(props)
        delegate.logIfEnabled(FQCN, Level.DEBUG, props.marker, props.toMessage(), props.e)
    }

    fun info(message: String, vararg args: Any?) {
        delegate.logIfEnabled(FQCN, Level.INFO, null, message, *args)
    }

    fun info(message: String, exception: Throwable? = null) {
        delegate.logIfEnabled(FQCN, Level.INFO, null, message, exception, null)
    }

    fun infoMsg(message: () -> String) {
        delegate.logIfEnabled(FQCN, Level.INFO, null, message.asLog4jSupplier(), null)
    }

    fun info(block: LogEventProps.() -> Unit) {
        val props = LogEventProps()
        block.invoke(props)
        delegate.logIfEnabled(FQCN, Level.INFO, props.marker, props.toMessage(), props.e)
    }

    fun warn(message: String, vararg args: Any?) {
        delegate.logIfEnabled(FQCN, Level.WARN, null, message, *args)
    }

    fun warn(message: String, exception: Throwable? = null) {
        delegate.logIfEnabled(FQCN, Level.WARN, null, message, exception)
    }

    fun warnMsg(message: () -> String) {
        delegate.logIfEnabled(FQCN, Level.WARN, null, message.asLog4jSupplier(), null)
    }

    fun warn(block: LogEventProps.() -> Unit) {
        val props = LogEventProps()
        block.invoke(props)
        delegate.logIfEnabled(FQCN, Level.WARN, props.marker, props.toMessage(), props.e)
    }

    fun error(message: String, vararg args: Any?) {
        delegate.logIfEnabled(FQCN, Level.ERROR, null, message, *args)
    }

    fun error(message: String, exception: Throwable? = null) {
        delegate.logIfEnabled(FQCN, Level.ERROR, null, message, exception)
    }

    fun errorMsg(message: () -> String) {
        delegate.logIfEnabled(FQCN, Level.ERROR, null, message.asLog4jSupplier(), null)
    }

    fun error(block: LogEventProps.() -> Unit) {
        val props = LogEventProps()
        block.invoke(props)
        delegate.logIfEnabled(FQCN, Level.ERROR, props.marker, props.toMessage(), props.e)
    }
}

fun loggerOf(ofClass: Class<*>): SongbirdLogger {
    return SongbirdLogger(loggerDelegateOf(ofClass))
}
