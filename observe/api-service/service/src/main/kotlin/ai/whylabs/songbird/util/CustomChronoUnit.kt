package ai.whylabs.songbird.util

import java.time.Duration
import java.time.temporal.Temporal
import java.time.temporal.TemporalUnit

class CustomChronoUnit(duration: Duration) : TemporalUnit {
    private val duration: Duration

    init {
        require(!(duration.isZero || duration.isNegative)) { "Duration cannot be zero or negative" }
        this.duration = duration
    }

    override fun getDuration(): Duration {
        return duration
    }

    override fun <R : Temporal?> addTo(temporal: R, amount: Long): R {
        return duration.multipliedBy(amount).addTo(temporal) as R
    }

    override fun isDurationEstimated(): Boolean {
        return duration.seconds >= SECONDS_PER_DAY
    }

    override fun isDateBased(): Boolean {
        return duration.nano == 0 && duration.seconds % SECONDS_PER_DAY == 0L
    }

    override fun isTimeBased(): Boolean {
        return duration.seconds < SECONDS_PER_DAY && NANOS_PER_DAY % duration.toNanos() == 0L
    }

    override fun between(temporalInclusive: Temporal?, temporalExclusive: Temporal?): Long {
        return Duration.between(temporalInclusive, temporalExclusive).dividedBy(duration)
    }

    override fun toString(): String {
        return duration.toString()
    }

    companion object {
        private const val SECONDS_PER_DAY = 86400
        private const val NANOS_PER_SECOND = 1000000000L
        private const val NANOS_PER_DAY = NANOS_PER_SECOND * SECONDS_PER_DAY
        fun of(duration: Duration): CustomChronoUnit {
            return CustomChronoUnit(duration)
        }

        fun ofDays(days: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofDays(days))
        }

        fun ofHours(hours: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofHours(hours))
        }

        fun ofMinutes(minutes: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofMinutes(minutes))
        }

        fun ofSeconds(seconds: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofSeconds(seconds))
        }

        fun ofMillis(millis: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofMillis(millis))
        }

        fun ofNanos(nanos: Long): CustomChronoUnit {
            return CustomChronoUnit(Duration.ofNanos(nanos))
        }
    }
}
