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

package ai.whylabs.druid.whylogs.variance;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.base.Joiner;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import com.whylogs.v0.core.message.VarianceMessage;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.druid.query.aggregation.AggregateCombiner;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.AggregatorFactoryNotMergeableException;
import org.apache.druid.query.aggregation.AggregatorUtil;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.aggregation.ObjectAggregateCombiner;
import org.apache.druid.segment.ColumnSelectorFactory;
import org.apache.druid.segment.ColumnValueSelector;
import org.apache.druid.segment.column.ValueType;

/**
 * This aggregator factory is for merging existing sketches. The input column must contain {@link
 * VarianceTracker}
 */
public class MergeAggregatorFactory extends AggregatorFactory {
  public static final Comparator<VarianceTracker> COMPARATOR =
      Comparator.nullsFirst(Comparator.comparingLong(VarianceTracker::getCount));

  // maximum size that this aggregator will require in bytes for intermediate storage of results.
  public static final int maxIntermediateSize =
      VarianceMessage.newBuilder()
          .setCount(Long.MAX_VALUE)
          .setMean(Double.MAX_VALUE)
          .setSum(Double.MAX_VALUE)
          .build()
          .getSerializedSize();

  private final String name;
  private final String fieldName;

  @JsonCreator
  public MergeAggregatorFactory(
      @JsonProperty("name") final String name, @JsonProperty("fieldName") final String fieldName) {
    this.name = Objects.requireNonNull(name);
    this.fieldName = Objects.requireNonNull(fieldName);
  }

  @Override
  @JsonProperty
  @NonNull
  public String getName() {
    return name;
  }

  @JsonProperty
  public String getFieldName() {
    return fieldName;
  }

  /**
   * Returns an AggregatorFactory that can be used to combine the output of aggregators from this
   * factory and another factory. It is used when we have some values produced by this aggregator
   * factory, and some values produced by the "other" aggregator factory, and we want to do some
   * additional combining of them. This happens, for example, when compacting two segments together
   * that both have a metric column with the same name. (Even though the name of the column is the
   * same, the aggregator factory used to create it may be different from segment to segment.)
   *
   * @param other
   * @return
   * @throws AggregatorFactoryNotMergeableException
   */
  @Override
  @NonNull
  public AggregatorFactory getMergingFactory(AggregatorFactory other)
      throws AggregatorFactoryNotMergeableException {
    if (other.getName().equals(this.getName()) && this.getClass() == other.getClass()) {
      return getCombiningFactory();
    } else {
      throw new AggregatorFactoryNotMergeableException(this, other);
    }
  }

  @Override
  @NonNull
  public String getComplexTypeName() {
    return VarianceModule.TYPE_NAME;
  }

  @Override
  @NonNull
  public Aggregator factorize(final ColumnSelectorFactory columnSelectorFactory) {
    final ColumnValueSelector<VarianceTracker> selector =
        columnSelectorFactory.makeColumnValueSelector(getFieldName());
    return new MergeAggregator(selector);
  }

  @Override
  @NonNull
  public BufferAggregator factorizeBuffered(final ColumnSelectorFactory columnSelectorFactory) {
    final ColumnValueSelector<VarianceTracker> selector =
        columnSelectorFactory.makeColumnValueSelector(getFieldName());
    return new MergeBufferAggregator(selector, getMaxIntermediateSize());
  }

  /**
   * Returns the maximum size that this aggregator will require in bytes for intermediate storage of
   * results.
   */
  @Override
  public int getMaxIntermediateSize() {
    return maxIntermediateSize;
  }

  @Override
  @NonNull
  public Comparator<VarianceTracker> getComparator() {
    return COMPARATOR;
  }

  /**
   * Combine the outputs of {@link Aggregator#get} produced via {@link #factorize} or {@link
   * BufferAggregator#get} produced via {@link #factorizeBuffered}.
   */
  @Override
  public Object combine(final Object lhs, final Object rhs) {
    final VarianceTracker left = (VarianceTracker) lhs;
    final VarianceTracker right = (VarianceTracker) rhs;
    return left.merge(right);
  }

  @Override
  @NonNull
  public AggregatorFactory getCombiningFactory() {
    return new MergeAggregatorFactory(name, name);
  }

  /**
   * This is a convoluted way to return a list of input field names this aggregator needs. Currently
   * the returned factories are only used to obtain a field name by calling getName() method.
   */
  @Override
  @NonNull
  public List<AggregatorFactory> getRequiredColumns() {
    return Collections.singletonList(new MergeAggregatorFactory(getName(), getFieldName()));
  }

  @Override
  @NonNull
  public Object deserialize(@Nullable final Object object) {
    return VarianceOperations.deserialize(object);
  }

  @SneakyThrows
  @Nullable
  @Override
  public Object finalizeComputation(@Nullable final Object object) {
    val tracker = (VarianceTracker) object;
    if (tracker == null || Double.isNaN(tracker.stddev())) {
      return null;
    }
    ObjectMapper mapper = new ObjectMapper();
    ObjectNode node = mapper.createObjectNode();
    node.put("stddev", tracker.stddev());
    node.put("mean", tracker.getMean());
    return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(node);
  }

  // Get a list of fields that aggregators built by this factory will need to read.
  @Override
  @NonNull
  public List<String> requiredFields() {
    return Collections.singletonList(getFieldName());
  }

  /**
   * Get the "intermediate" ValueType for this aggregator. This is the same as the type returned by
   * deserialize and the type accepted by combine. However, it is *not* necessarily the same type
   * returned by finalizeComputation. actual type is {@link VarianceTracker}
   */
  @Override
  @NonNull
  public ValueType getType() {
    return ValueType.COMPLEX;
  }

  @Override
  @NonNull
  public ValueType getFinalizedType() {
    return ValueType.STRING;
  }

  @Override
  public byte[] getCacheKey() {
    val fieldNames = Collections.singletonList(getFieldName());
    byte[] fieldNameBytes = DruidStringUtils.toUtf8(Joiner.on(",").join(fieldNames));

    return ByteBuffer.allocate(1 + fieldNameBytes.length)
        .put(AggregatorUtil.JS_CACHE_TYPE_ID)
        .put(fieldNameBytes)
        .array();
  }

  @Override
  @NonNull
  public AggregateCombiner<VarianceTracker> makeAggregateCombiner() {
    return new ObjectAggregateCombiner<VarianceTracker>() {
      private VarianceTracker union = new VarianceTracker();

      @Override
      public void reset(@NonNull final ColumnValueSelector selector) {
        union = null;
        fold(selector);
      }

      @Override
      @SneakyThrows
      public void fold(final ColumnValueSelector selector) {
        final VarianceTracker sketch = (VarianceTracker) selector.getObject();
        if (union == null) {
          union = sketch;
        } else if (sketch != null) {
          union = union.merge(sketch);
        }
      }

      @Nullable
      @Override
      public VarianceTracker getObject() {
        return union;
      }

      @Override
      @NonNull
      public Class<VarianceTracker> classOfObject() {
        return VarianceTracker.class;
      }
    };
  }
}
