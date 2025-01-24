package ai.whylabs.dataservice.streaming;

import lombok.extern.slf4j.Slf4j;
import software.amazon.kinesis.exceptions.InvalidStateException;
import software.amazon.kinesis.exceptions.ShutdownException;
import software.amazon.kinesis.lifecycle.events.*;
import software.amazon.kinesis.processor.ShardRecordProcessor;

@Slf4j
public abstract class BaseKinesisRecordProcessor implements ShardRecordProcessor {

  /**
   * Invoked by the KCL before data records are delivered to the ShardRecordProcessor instance (via
   * processRecords). In this example we do nothing except some logging.
   *
   * @param initializationInput Provides information related to initialization.
   */
  public void initialize(InitializationInput initializationInput) {
    log.info("Initializing @ Sequence: {}", initializationInput.extendedSequenceNumber());
  }

  /**
   * Called when the lease tied to this record processor has been lost. Once the lease has been
   * lost, the record processor can no longer checkpoint.
   *
   * @param leaseLostInput Provides access to functions and data related to the loss of the lease.
   */
  public void leaseLost(LeaseLostInput leaseLostInput) {
    log.info("Lost lease, so terminating.");
  }

  /**
   * Called when all data on this shard has been processed. Checkpointing must occur in the method
   * for record processing to be considered complete; an exception will be thrown otherwise.
   *
   * @param shardEndedInput Provides access to a checkpointer method for completing processing of
   *     the shard.
   */
  public void shardEnded(ShardEndedInput shardEndedInput) {
    try {
      log.info("Reached shard end checkpointing.");
      shardEndedInput.checkpointer().checkpoint();
    } catch (ShutdownException | InvalidStateException e) {
      log.error("Exception while checkpointing at shard end. Giving up.", e);
    }
  }

  /**
   * Invoked when Scheduler has been requested to shut down (i.e. we decide to stop running the app
   * by pressing Enter). Checkpoints and logs the data a final time.
   *
   * @param shutdownRequestedInput Provides access to a checkpointer, allowing a record processor to
   *     checkpoint before the shutdown is completed.
   */
  public void shutdownRequested(ShutdownRequestedInput shutdownRequestedInput) {
    try {
      log.info("Scheduler is shutting down, checkpointing.");
      shutdownRequestedInput.checkpointer().checkpoint();
    } catch (ShutdownException | InvalidStateException e) {
      log.error("Exception while checkpointing at requested shutdown. Giving up.", e);
    }
  }
}
