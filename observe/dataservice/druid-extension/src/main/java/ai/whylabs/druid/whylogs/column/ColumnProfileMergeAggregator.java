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

import com.whylogs.core.ColumnProfile;
import javax.annotation.Nullable;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.segment.ColumnValueSelector;

public class ColumnProfileMergeAggregator implements Aggregator {
  private final ColumnValueSelector selector;

  @Nullable private volatile ColumnProfile merged;

  public ColumnProfileMergeAggregator(final ColumnValueSelector selector) {
    this.selector = selector;
    merged = null;
  }

  @Override
  public synchronized void aggregate() {
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }
    if (object instanceof ColumnProfile) {
      ColumnProfile col = (ColumnProfile) object;
      if (merged == null) {
        merged = col;
      } else {
        try {
          merged = merged.merge(col);
        } catch (Exception e) {
        }
      }
    } else {
      throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get() {
    if (merged == null) {
      return ColumnProfileOperations.EMPTY_COLUMN;
    } else {
      return merged;
    }
  }

  @Override
  public float getFloat() {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong() {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public synchronized void close() {
    merged = null;
  }
}
