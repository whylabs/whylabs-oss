package ai.whylabs.songbird.util

import ai.whylabs.dataservice.model.Granularity
import ai.whylabs.songbird.v0.models.TimePeriod
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import java.util.Calendar
import java.util.Calendar.MONDAY
import java.util.Date
import java.util.TimeZone
import com.amazonaws.util.DateUtils as AwsDateUtils

object DateUtils {
    private val formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(ZoneOffset.UTC)
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC)

    fun formatDdbDateString(epochMillis: Long): String {
        return AwsDateUtils.formatISO8601Date(epochMillis.toDate())
    }

    fun getISOString(epochMillis: Long): String {
        return getISOString(Instant.ofEpochMilli(epochMillis))
    }

    fun getISOString(instant: Instant): String {
        return formatter.format(instant)
    }

    fun parseISOString(date: String): Instant {
        return Instant.parse(date)
    }

    fun getDateString(instant: Instant): String {
        return dateFormatter.format(instant)
    }

    fun getOneHourFromNow(): Instant {
        return Instant.now().plus(1, ChronoUnit.HOURS)
    }

    fun getTenMinutesFromNow(): Instant {
        return Instant.now().plus(10, ChronoUnit.MINUTES)
    }

    fun getOneWeekFromNow(): Instant {
        return Instant.now().plus(7, ChronoUnit.DAYS)
    }

    fun timePeriodToChronoUnit(timePeriod: TimePeriod): ChronoUnit {
        return when (timePeriod) {
            TimePeriod.PT1H -> ChronoUnit.HOURS
            TimePeriod.P1D -> ChronoUnit.DAYS
            TimePeriod.P1W -> ChronoUnit.WEEKS
            TimePeriod.P1M -> ChronoUnit.MONTHS
        }
    }

    fun getEndTimeForNBatches(from: org.joda.time.Instant, n: Long, unit: ChronoUnit): org.joda.time.Instant {
        val millisToAdd = unit.duration.toMillis() * n
        return from.plus(millisToAdd)
    }
}

fun Instant.toDate(): Date {
    return Date(this.toEpochMilli())
}

fun Instant.toDateString(): String {
    return DateUtils.getDateString(this)
}

fun Instant.getHour(): Int {
    return atZone(ZoneOffset.UTC).hour
}

fun Instant.toISOString(): String {
    return DateUtils.getISOString(this)
}

fun Date.toISOString(): String {
    return DateUtils.getISOString(this.toInstant())
}

fun Long.toInstant(): Instant {
    return Instant.ofEpochMilli(this)
}

fun Long.truncate(granularity: Granularity): Long {
    return when (granularity) {
        Granularity.HOURLY -> {
            Instant.ofEpochMilli(this).truncatedTo(ChronoUnit.HOURS).toEpochMilli()
        }

        Granularity.DAILY -> {
            Instant.ofEpochMilli(this).truncatedTo(ChronoUnit.DAYS).toEpochMilli()
        }

        Granularity.WEEKLY -> {
            val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
            cal.timeInMillis = this
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.clear(Calendar.MINUTE)
            cal.clear(Calendar.SECOND)
            cal.clear(Calendar.MILLISECOND)
            cal.set(Calendar.DAY_OF_WEEK, MONDAY)
            val truncated = cal.timeInMillis
            cal.clear()
            truncated
        }

        Granularity.MONTHLY -> {
            ZonedDateTime.ofInstant(Instant.ofEpochMilli(this), ZoneId.of("UTC")).with(
                TemporalAdjusters.firstDayOfMonth()
            ).truncatedTo(ChronoUnit.DAYS).toInstant().toEpochMilli()
        }

        else -> {
            throw IllegalArgumentException("Unsupported granularity value")
        }
    }
}

fun String.parseAsISO(): Date {
    return Date.from(
        OffsetDateTime.parse(this, DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(ZoneOffset.UTC)).toInstant()
    )
}

fun Long.toDate(): Date {
    return Date(this)
}
