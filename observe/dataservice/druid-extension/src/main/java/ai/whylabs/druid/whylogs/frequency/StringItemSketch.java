package ai.whylabs.druid.whylogs.frequency;

import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.whylogs.core.utils.sketches.FrequentStringsSketch;

/**
 * ItemsSketch can technically work with multiple datatypes, but for Druid's API its a whole lot
 * easier if we avoid parameterized types and wrap the ItemsSketch class.
 */
public class StringItemSketch {

  private ItemsSketch<String> itemsSketch;

  public StringItemSketch() {
    itemsSketch = new ItemsSketch<>((int) Math.pow(2, FrequentStringsSketch.FREQUENT_MAX_LG_K));
  }

  public StringItemSketch(ItemsSketch<String> itemsSketch) {
    this.itemsSketch = itemsSketch;
  }

  public static StringItemSketch as(Object o) {
    if (o instanceof StringItemSketch) {
      return (StringItemSketch) o;
    } else if (o instanceof ItemsSketch) {
      return new StringItemSketch((ItemsSketch<String>) o);
    } else {
      throw new ClassCastException(
          "Object cannot be cast to StringItemSketch " + o.getClass().getName());
    }
  }

  public ItemsSketch<String> get() {
    return itemsSketch;
  }

  @Override
  public String toString() {
    return "StringItemSketch{" + "itemsSketch=" + itemsSketch + '}';
  }
}
