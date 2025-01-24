import { add, addDays, formatDistance } from 'date-fns';
import { TimePeriod } from 'generated/graphql';

type DayAsNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function nextMonitorRun(batchFrequency: TimePeriod | undefined): string {
  const now = new Date();
  const gracePeriod = 5 * 60 * 1000;
  let nextRun: Date;
  switch (batchFrequency) {
    case TimePeriod.P1D: {
      const todayDayAt12AMUTC = new Date(new Date().setUTCHours(0, 0, 0));
      const tomorrowDayAt12AMUTC = addDays(todayDayAt12AMUTC, 1);
      nextRun = todayDayAt12AMUTC > now ? todayDayAt12AMUTC : tomorrowDayAt12AMUTC;
      break;
    }
    case TimePeriod.Pt1H: {
      const copy = new Date(now);
      copy.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
      nextRun = copy;
      break;
    }
    case TimePeriod.P1M: {
      const nextMonth = add(now, { months: 1 });
      nextMonth.setUTCHours(0, 0, 0); // Rest hours
      nextMonth.setUTCDate(1); // Reset day to first in month
      nextRun = nextMonth;
      break;
    }
    case TimePeriod.P1W: {
      const daysUntilNextMonday = nextMondayInDays(now.getUTCDay() as DayAsNumber);
      const copy = new Date(now);
      copy.setUTCDate(copy.getUTCDate() + daysUntilNextMonday);
      copy.setUTCHours(0, 0, 0, 0);
      nextRun = copy;
      break;
    }
    default:
      return '';
  }

  nextRun = new Date(nextRun.getTime() + gracePeriod);
  return formatDistance(now, nextRun, { includeSeconds: false });
}

function nextMondayInDays(day: DayAsNumber): number {
  switch (day) {
    case 0: // Sunday
      return 1;
    case 1: // Monday
      return 7;
    case 2: // Tuesday
      return 6;
    case 3: // Wednesday
      return 5;
    case 4: // Thursday
      return 4;
    case 5: // Friday
      return 3;
    case 6: // Saturday
      return 2;
    default:
      console.log(`nextMondayInDays recieved invalid day as number, day:${day}`);
      throw Error('Invalid day');
  }
}
