package ai.whylabs.dataservice.enums;

import lombok.Getter;

@Getter
public enum ResourceTagColor {
  COMBO1("#F21210", "#FDE7E7"),
  COMBO2("#D92B28", "#FBE9E9"),
  COMBO3("#BF4441", "#F8ECEC"),
  COMBO4("#A55D59", "#F6EEEE"),
  COMBO5("#8C7671", "#F3F1F0"),
  COMBO6("#738E89", "#F1F3F3"),
  COMBO7("#5AA7A1", "#EEF6F5"),
  COMBO8("#40C0B9", "#EBF8F8"),
  COMBO9("#27D9D2", "#E9FBFA"),
  COMBO10("#0DF2EA", "#E6FDFC"),
  COMBO11("#D8DC26", "#FBFBE9"),
  COMBO12("#BEC43F", "#F8F9EB"),
  COMBO13("#A5AD59", "#F6F6EE"),
  COMBO14("#8C9672", "#F3F4F0"),
  COMBO15("#747F8B", "#F1F2F3"),
  COMBO16("#5B67A4", "#EEEFF5"),
  COMBO17("#4250BE", "#ECEDF8"),
  COMBO18("#2938D7", "#E9EBFB"),
  COMBO19("#1021F0", "#E7E8FD"),
  COMBO20("#0FF31D", "#E7FDE8"),
  COMBO21("#28D934", "#E9FBEA"),
  COMBO22("#42C04B", "#ECF8ED"),
  COMBO23("#5BA762", "#EEF6EF"),
  COMBO24("#748E7A", "#F1F3F1"),
  COMBO25("#8D7690", "#F3F1F3"),
  COMBO26("#A65CA8", "#F6EEF6"),
  COMBO27("#C043BF", "#F8ECF8"),
  COMBO28("#D92AD6", "#FBE9FA"),
  COMBO29("#F211ED", "#FDE7FD");

  private final String color;
  private final String backgroundColor;

  ResourceTagColor(String color, String backgroundColor) {
    this.color = color;
    this.backgroundColor = backgroundColor;
  }

  public static ResourceTagColor getResourceTagColor(String key) {
    int i = Math.abs(key.hashCode() % ResourceTagColor.values().length);
    return ResourceTagColor.values()[i];
  }
}
