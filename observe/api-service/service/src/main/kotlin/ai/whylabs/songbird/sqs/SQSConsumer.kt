package ai.whylabs.songbird.sqs

import ai.whylabs.songbird.logging.loggerOf
import com.amazonaws.services.sqs.AmazonSQSAsync
import com.amazonaws.services.sqs.model.Message
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.yield
import java.lang.IllegalStateException
import java.lang.Thread.currentThread
import java.util.concurrent.Future
import kotlin.coroutines.CoroutineContext

sealed class SQSResult(val message: Message) {
    class Success(message: Message) : SQSResult(message)
    class Failure(message: Message) : SQSResult(message)
}

private val log = loggerOf(SQSConsumer::class.java)

typealias SQSMessageProcessor = (message: Message) -> SQSResult

open class SQSConsumer constructor(
    private val sqs: AmazonSQSAsync,
    private val queueUrl: String,
    private val workers: Int = 1,
    private val processor: SQSMessageProcessor,
) : CoroutineScope {

    init {
        Runtime.getRuntime().addShutdownHook(Thread { stop() })
    }

    private val supervisorJob = SupervisorJob()
    override val coroutineContext: CoroutineContext
        get() = Dispatchers.Default + supervisorJob

    private suspend fun receive(): List<Message> {
        return sqs.receiveMessageAsync(queueUrl).await().messages
    }

    private suspend fun delete(message: Message) {
        sqs.deleteMessageAsync(queueUrl, message.receiptHandle).await()
    }

    var started = false
    fun start() = launch {
        if (started) {
            throw IllegalStateException("SQS consumer already started")
        }
        val messageChannel = Channel<Message>()
        repeat(workers) {
            log.info("Launched worker for $queueUrl. 1 of $workers total.")
            launchWorker(messageChannel, processor)
        }
        launchMsgReceiver(messageChannel)
        started = true
    }

    fun stop() {
        supervisorJob.cancel()
    }

    private fun CoroutineScope.launchMsgReceiver(channel: SendChannel<Message>) = launch {
        repeatUntilCancelled {
            val messages = receive()
            if (messages.isNotEmpty()) {
                log.info("${currentThread().name} $queueUrl Retrieved ${messages.size} messages")
            }
            messages.forEach {
                channel.send(it)
            }
        }
    }

    private fun CoroutineScope.launchWorker(channel: ReceiveChannel<Message>, processor: SQSMessageProcessor) = launch {
        repeatUntilCancelled {
            for (msg in channel) {
                log.info("Starting to process msg ${msg.body}")
                try {
                    when (processor(msg)) {
                        is SQSResult.Success -> {
                            // log stuff
                            log.info("Handled message ${msg.messageId}")
                            delete(msg)
                        }
                        is SQSResult.Failure -> {
                            // log stuff
                            log.info("Failed to handle message ${msg.messageId}")
                        }
                    }
                } catch (ex: Exception) {
                    log.info("${currentThread().name} exception trying to process message ${msg.body}")
                    ex.printStackTrace()
                }
            }
        }
    }
}

suspend fun CoroutineScope.repeatUntilCancelled(block: suspend () -> Unit) {
    while (isActive) {
        try {
            block()
            yield()
        } catch (ex: CancellationException) {
            log.info("coroutine on ${currentThread().name} cancelled")
        } catch (ex: Throwable) {
            log.error("${currentThread().name} failed. Retrying...", ex)
        }
    }

    log.info("coroutine on ${currentThread().name} exiting")
}

suspend fun <T> Future<T>.await(): T {
    withTimeout(60_000) {
        while (!isDone)
            delay(1)
    }

    if (isCancelled) {
        throw CancellationException("Future was cancelled")
    }

    return get()
}
