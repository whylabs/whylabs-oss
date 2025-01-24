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

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.shaded.whylabs.com.google.protobuf.util.JsonFormat;
import com.whylogs.core.ColumnProfile;
import com.whylogs.v0.core.message.ColumnSummary;
import java.io.IOException;
import java.util.Comparator;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

public class ColumnProfileToStringPostAggregator implements PostAggregator {

  private static final JsonFormat.Printer PRINTER =
      JsonFormat.printer().omittingInsignificantWhitespace();

  private final String name;
  private final PostAggregator field;

  @JsonCreator
  public ColumnProfileToStringPostAggregator(
      @JsonProperty("name") final String name, @JsonProperty("field") final PostAggregator field) {
    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  @Override
  public ValueType getType() {
    return ValueType.STRING;
  }

  @JsonProperty
  public PostAggregator getField() {
    return field;
  }

  @Override
  public Object compute(final Map<String, Object> combinedAggregators) {
    final ColumnProfile column = (ColumnProfile) field.compute(combinedAggregators);
    final ColumnSummary summary = column.toColumnSummary();
    try {
      return PRINTER.print(summary);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public Comparator<String> getComparator() {
    throw new IAE("Comparing sketch summaries is not supported");
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(CacheIdConstants.COLUMN_PROFILE_TO_STRING_POST_AGGREGATOR_CACHE_ID)
            .appendCacheable(field);
    return builder.build();
  }

  @Override
  public PostAggregator decorate(final Map<String, AggregatorFactory> map) {
    return this;
  }

  @Override
  public Set<String> getDependentFields() {
    return field.getDependentFields();
  }

  @Override
  public String toString() {
    return this.getClass().getSimpleName()
        + "{"
        + "name='"
        + name
        + '\''
        + ", field="
        + field
        + "}";
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    ColumnProfileToStringPostAggregator that = (ColumnProfileToStringPostAggregator) o;
    return name.equals(that.name) && field.equals(that.field);
  }

  @Override
  public int hashCode() {
    return Objects.hash(name, field);
  }
}
