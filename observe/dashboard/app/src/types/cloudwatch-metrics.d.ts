declare module 'cloudwatch-metrics' {
  // from cloudwatch SDK code
  export type StandardUnit =
    | 'Seconds'
    | 'Microseconds'
    | 'Milliseconds'
    | 'Bytes'
    | 'Kilobytes'
    | 'Megabytes'
    | 'Gigabytes'
    | 'Terabytes'
    | 'Bits'
    | 'Kilobits'
    | 'Megabits'
    | 'Gigabits'
    | 'Terabits'
    | 'Percent'
    | 'Count'
    | 'Bytes/Second'
    | 'Kilobytes/Second'
    | 'Megabytes/Second'
    | 'Gigabytes/Second'
    | 'Terabytes/Second'
    | 'Bits/Second'
    | 'Kilobits/Second'
    | 'Megabits/Second'
    | 'Gigabits/Second'
    | 'Terabits/Second'
    | 'Count/Second';

  /**
   * config sets the default configuration to use when creating AWS
   * metrics. It defaults to simply setting the AWS region to `us-east-1`, i.e.:
   *
   * {
   * 	region: 'us-east-1'
   * }
   * @param {Object} config The AWS SDK configuration options one would like to set.
   */
  function initialize(config: { [key: string]: unknown }): void;

  type Dimension = {
    Name: string;
    Value: string;
  };

  class Metric {
    /**
     * Create a custom CloudWatch Metric object that sets pre-configured dimensions and allows for
     * customized metricName and units. Each CloudWatchMetric object has it's own internal
     * AWS.CloudWatch object to prevent errors due to overlapping callings to
     * AWS.CloudWatch#putMetricData.
     *
     * @param {String} namespace         CloudWatch namespace
     * @param {String} unit             CloudWatch units
     * @param {Dimension[]} defaultDimensions (optional) Any default dimensions we'd
     *    like the metric to have.
     * @param {Object} options           (optional) Options used to control metric
     *    behavior.
     *   @param {Boolean} options.enabled   Defaults to true, controls whether we
     *      publish the metric when `Metric#put()` is called - this is useful for
     *      turning off metrics in specific environments.
     */
    constructor(namespace: string, unit: StandardUnit, defaultDimensions?: Dimension[], options?: { enabled: boolean });

    /**
     * Publish this data to Cloudwatch
     * @param {Number} value          Data point to submit
     * @param {String} namespace            Name of the metric
     * @param {Dimension[]} additionalDimensions  Array of additional CloudWatch metric dimensions. See
     * http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Dimension.html for details.
     */
    put: (value: number, namespace: string, additionalDimensions?: Dimension[] | null) => void;

    /**
     * Summarize the data using a statistic set and put it on the configured summary interval. This will
     * cause Cloudwatch to be unable to track the value distribution, so it'll only show summation and
     * bounds. The order of additionalDimensions is important, and rearranging the order will cause the
     * Metric instance to track those two summary sets independently!
     * @param {Number} value The value to include in the summary.
     * @param {String} metricName The name of the metric we're summarizing.
     * @param {Dimension[]} additionalDimensions The extra dimensions we're tracking.
     */
    summaryPut: (value: number, namespace: string, additionalDimensions?: Dimension[] | null) => void;

    /**
     * Samples a metric so that we send the metric to Cloudwatch at the given
     * sampleRate.
     * @param {Number} value          Data point to submit
     * @param {String} namespace            Name of the metric
     * @param {Dimension[]} additionalDimensions  Array of additional CloudWatch metric dimensions. See
     * http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Dimension.html for details.
     * @param  {Float} sampleRate           The rate at which to sample the metric at.
     *    The sample rate must be between 0.0 an 1.0. As an example, if you provide
     *    a sampleRate of 0.1, then we will send the metric to Cloudwatch 10% of the
     *    time.
     */
    sample: (value: number, namespace: string, additionalDimensions?: Dimension[] | null, sampleRate?: number) => void;

    /**
     * Shuts down metric service by clearing any outstanding timer and sending any existing metrics
     */
    shutdown: () => void;
  }

  export { initialize, Metric };
}
