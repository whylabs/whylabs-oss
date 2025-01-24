/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package ai.whylabs.druid.whylogs.column;

import com.google.common.collect.ImmutableList;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import org.apache.druid.data.input.InputRow;
import org.apache.druid.data.input.Row;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

public class WhyLogsRow implements InputRow {
  public static final String COLUMN_NAME = "columnName";
  public static final String ORG_ID = "orgId";
  public static final String DATASET_ID = "datasetId";
  public static final String REFERENCE_PROFILE_ID = "referenceProfileId";
  public static final String TRACE_ID = "whylabs.traceId";
  public static final String TAGS = "tags";

  /**
   * When ingesting reference profiles, they don't have any contract with time. In fact the dataset
   * timestamp could legitimately be zero. To fit them into a timeseries database we do 2 things
   *
   * <p>1) Override the dataset timestamp based off a desired anchor time thats based on when
   * they're being ingested (realtime) or the right side of the historical rebuild interval
   * (historical). That way the druid rebuild job can still re-index data.
   *
   * <p>2) Rather than relying on druid's top level time partitioning for partition pruning we rely
   * on multidimensional partitioning to prune unneeded segments.
   */
  private Long overrideDatasetTimestamps;

  private final WhyLogsMetrics metrics;

  public WhyLogsRow(WhyLogsMetrics metrics, Long overrideDatasetTimestamps) {
    this.metrics = metrics;
    this.overrideDatasetTimestamps = overrideDatasetTimestamps;
  }

  /**
   * Returns the dimensions that exist in this row.
   *
   * @return the dimensions that exist in this row.
   */
  @Override
  public List<String> getDimensions() {
    return ImmutableList.of(COLUMN_NAME, ORG_ID, DATASET_ID, TAGS, REFERENCE_PROFILE_ID);
  }

  /**
   * Returns the timestamp from the epoch in milliseconds. If the event happened _right now_, this
   * would return the same thing as System.currentTimeMillis();
   *
   * @return the timestamp from the epoch in milliseconds.
   */
  @Override
  public long getTimestampFromEpoch() {
    if (overrideDatasetTimestamps != null) {
      return overrideDatasetTimestamps;
    } else {
      return metrics.getTimestampFromEpoch();
    }
  }

  /**
   * Returns the timestamp from the epoch as an org.joda.time.DateTime. If the event happened _right
   * now_, this would return the same thing as new DateTime();
   *
   * @return the timestamp from the epoch as an org.joda.time.DateTime object.
   */
  @Override
  public DateTime getTimestamp() {
    if (overrideDatasetTimestamps != null) {
      return new DateTime(overrideDatasetTimestamps, DateTimeZone.UTC);
    } else {
      return new DateTime(metrics.getTimestampFromEpoch(), DateTimeZone.UTC);
    }
  }

  /**
   * Returns the list of dimension values for the given column name.
   *
   * <p>
   *
   * @param dimension the column name of the dimension requested
   * @return the list of values for the provided column name
   */
  @Override
  public List<String> getDimension(String dimension) {
    switch (dimension) {
      case COLUMN_NAME:
        return Collections.singletonList(metrics.getName());
      case ORG_ID:
        return Collections.singletonList(metrics.getOrgId());
      case DATASET_ID:
        return Collections.singletonList(metrics.getDatasetId());
      case REFERENCE_PROFILE_ID:
        return Collections.singletonList(metrics.getReferenceProfileId());
      case TAGS:
        return metrics.getTags();
      default:
        throw new IllegalArgumentException("Unknown dimension: " + dimension);
    }
  }

  /**
   * Returns the raw dimension value for the given column name. This is different from {@link
   * #getDimension} which converts all values to strings before returning them.
   *
   * @param dimension the column name of the dimension requested
   * @return the value of the provided column name
   */
  @Nullable
  @Override
  public Object getRaw(String dimension) {
    switch (dimension) {
      case COLUMN_NAME:
        return metrics.getName();
      case ORG_ID:
        return metrics.getOrgId();
      case DATASET_ID:
        return metrics.getDatasetId();
      case TAGS:
        return metrics.getTags();
      case REFERENCE_PROFILE_ID:
        return metrics.getReferenceProfileId();
      default:
        return metrics.getRaw(dimension);
    }
  }

  /**
   * Returns the metric column value for the given column name. This method is different from {@link
   * #getRaw} in two aspects: 1. If the column is absent in the row, either numeric zero or null
   * will be returned, depending on the value of druid.generic.useDefaultValueForNull. 2. If the
   * column has string value, an attempt is made to parse this value as a number.
   *
   * @param metric
   */
  @Nullable
  @Override
  public Number getMetric(String metric) {
    throw new RuntimeException("unexpected call to getMetric");
  }

  /**
   * Compares this object with the specified object for order. Returns a negative integer, zero, or
   * a positive integer as this object is less than, equal to, or greater than the specified object.
   *
   * <p>The implementor must ensure <tt>sgn(x.compareTo(y)) == -sgn(y.compareTo(x))</tt> for all
   * <tt>x</tt> and <tt>y</tt>. (This implies that <tt>x.compareTo(y)</tt> must throw an exception
   * iff <tt>y.compareTo(x)</tt> throws an exception.)
   *
   * <p>The implementor must also ensure that the relation is transitive: <tt>(x.compareTo(y)&gt;0
   * &amp;&amp; y.compareTo(z)&gt;0)</tt> implies <tt>x.compareTo(z)&gt;0</tt>.
   *
   * <p>Finally, the implementor must ensure that <tt>x.compareTo(y)==0</tt> implies that
   * <tt>sgn(x.compareTo(z)) == sgn(y.compareTo(z))</tt>, for all <tt>z</tt>.
   *
   * <p>It is strongly recommended, but <i>not</i> strictly required that <tt>(x.compareTo(y)==0) ==
   * (x.equals(y))</tt>. Generally speaking, any class that implements the <tt>Comparable</tt>
   * interface and violates this condition should clearly indicate this fact. The recommended
   * language is "Note: this class has a natural ordering that is inconsistent with equals."
   *
   * <p>In the foregoing description, the notation <tt>sgn(</tt><i>expression</i><tt>)</tt>
   * designates the mathematical <i>signum</i> function, which is defined to return one of
   * <tt>-1</tt>, <tt>0</tt>, or <tt>1</tt> according to whether the value of <i>expression</i> is
   * negative, zero or positive.
   *
   * @param o the object to be compared.
   * @return a negative integer, zero, or a positive integer as this object is less than, equal to,
   *     or greater than the specified object.
   * @throws NullPointerException if the specified object is null
   * @throws ClassCastException if the specified object's type prevents it from being compared to
   *     this object.
   */
  @Override
  public int compareTo(@Nonnull Row o) {
    return 0;
  }

  @Override
  public String toString() {
    return "WhyLogsRow{" + "metrics=" + metrics + '}';
  }
}
