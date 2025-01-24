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

import ai.whylabs.druid.whylogs.WhylogsExtensionsModule;
import com.whylogs.core.ColumnProfile;
import java.nio.ByteBuffer;
import lombok.val;
import org.apache.druid.data.input.InputRow;
import org.apache.druid.segment.GenericColumnSerializer;
import org.apache.druid.segment.column.ColumnBuilder;
import org.apache.druid.segment.data.GenericIndexed;
import org.apache.druid.segment.data.ObjectStrategy;
import org.apache.druid.segment.serde.ComplexColumnPartSupplier;
import org.apache.druid.segment.serde.ComplexMetricExtractor;
import org.apache.druid.segment.serde.ComplexMetricSerde;
import org.apache.druid.segment.serde.LargeColumnSupportedComplexColumnSerializer;
import org.apache.druid.segment.writeout.SegmentWriteOutMedium;

public class ColumnProfileComplexMetricSerde extends ComplexMetricSerde {

  private static final ColumnProfileObjectStrategy STRATEGY = new ColumnProfileObjectStrategy();

  @Override
  public String getTypeName() {
    return WhylogsExtensionsModule.COLUMN_PROFILE;
  }

  @Override
  public ObjectStrategy<ColumnProfile> getObjectStrategy() {
    return STRATEGY;
  }

  @Override
  public ComplexMetricExtractor getExtractor() {
    return new ComplexMetricExtractor() {
      @Override
      public Class<?> extractedClass() {
        return ColumnProfile.class;
      }

      @Override
      public Object extractValue(final InputRow inputRow, final String metricName) {
        val object = inputRow.getRaw(metricName);
        if (object == null || object instanceof ColumnProfile) {
          return object;
        }

        if (object instanceof String) { // everything is a string during ingestion
          String objectString = (String) object;
          // Autodetection of the input format: empty string, number, or base64 encoded
          // sketch
          // A serialized DoublesSketch, as currently implemented, always has 0 in the
          // first 6 bits.
          // This corresponds to "A" in base64, so it is not a digit
          if (objectString.isEmpty()) {
            return ColumnProfileOperations.EMPTY_COLUMN;
          } else {
            return ColumnProfileOperations.deserialize(objectString);
          }
        }

        return ColumnProfileOperations.deserialize(object);
      }
    };
  }

  @Override
  public void deserializeColumn(final ByteBuffer buffer, final ColumnBuilder builder) {
    final GenericIndexed<ColumnProfile> column =
        GenericIndexed.read(buffer, STRATEGY, builder.getFileMapper());
    builder.setComplexColumnSupplier(new ComplexColumnPartSupplier(getTypeName(), column));
  }

  // support large columns
  @Override
  public GenericColumnSerializer<ColumnProfile> getSerializer(
      SegmentWriteOutMedium segmentWriteOutMedium, String column) {
    return LargeColumnSupportedComplexColumnSerializer.create(
        segmentWriteOutMedium, column, this.getObjectStrategy());
  }
}
