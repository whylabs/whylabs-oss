package ai.whylabs.songbird.v0.data

import java.util.EnumSet

enum class Granularity {
    DAILY, HOURLY, WEEKLY, MONTHLY, ALL
}

// defining this explicitly in case we add to the above enum
val allowedRollupGranularity: Set<Granularity> = EnumSet.of(Granularity.HOURLY, Granularity.DAILY, Granularity.WEEKLY, Granularity.MONTHLY, Granularity.ALL)
