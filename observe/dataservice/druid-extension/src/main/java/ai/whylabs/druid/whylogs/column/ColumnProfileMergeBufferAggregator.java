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
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import java.nio.ByteBuffer;
import java.util.IdentityHashMap;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.monomorphicprocessing.RuntimeShapeInspector;
import org.apache.druid.segment.ColumnValueSelector;

public class ColumnProfileMergeBufferAggregator implements BufferAggregator {

  private final ColumnValueSelector selector;
  private final IdentityHashMap<ByteBuffer, Int2ObjectMap<ColumnProfile>> unions =
      new IdentityHashMap<>();

  public ColumnProfileMergeBufferAggregator(final ColumnValueSelector selector) {
    this.selector = selector;
  }

  @Override
  public synchronized void init(final ByteBuffer buffer, final int position) {
    // TDB? do something
    putUnion(buffer, position, null);
  }

  @Override
  public synchronized void aggregate(final ByteBuffer buffer, final int position) {
    ColumnProfile union = unions.get(buffer).get(position);
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }

    if (object instanceof ColumnProfile) {
      ColumnProfile col = (ColumnProfile) object;
      if (union == null) {
        union = col;
      } else {
        try {
          union = union.merge(col);
        } catch (Exception e) {
        }
      }
      putUnion(buffer, position, union);
    } else {
      throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get(final ByteBuffer buffer, final int position) {
    return unions.get(buffer).get(position);
  }

  @Override
  public float getFloat(final ByteBuffer buffer, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong(final ByteBuffer buffer, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public synchronized void close() {
    unions.clear();
  }

  // A small number of sketches may run out of the given memory, request more memory on heap and
  // move there.
  // In that case we need to reuse the object from the cache as opposed to wrapping the new
  // buffer.
  @Override
  public synchronized void relocate(
      int oldPosition, int newPosition, ByteBuffer oldBuffer, ByteBuffer newBuffer) {
    ColumnProfile union = unions.get(oldBuffer).get(oldPosition);
    putUnion(newBuffer, newPosition, union);

    Int2ObjectMap<ColumnProfile> map = unions.get(oldBuffer);
    map.remove(oldPosition);
    if (map.isEmpty()) {
      unions.remove(oldBuffer);
    }
  }

  private void putUnion(final ByteBuffer buffer, final int position, final ColumnProfile union) {
    Int2ObjectMap<ColumnProfile> map =
        unions.computeIfAbsent(buffer, buf -> new Int2ObjectOpenHashMap<>());
    if (union != null) {
      map.put(position, union);
      buffer.put(union.toProtobuf().build().toByteArray());
    }
  }

  @Override
  public void inspectRuntimeShape(final RuntimeShapeInspector inspector) {
    inspector.visit("selector", selector);
  }
}
