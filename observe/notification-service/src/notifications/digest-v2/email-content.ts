import { format } from 'date-fns-tz';
import handlebars from 'handlebars';
import { ModelNotification } from './digest-notifier';

interface ModelNotificationRow {
  first: ModelNotification;
  last: ModelNotification | null;
}

// for dates displayed in the email
const DATE_FORMAT = 'MM/dd/yyyy';
// for dates that end up in the url
const URL_DATE_FORMAT = 'yyyy-MM-dd';

handlebars.registerHelper('link_href', (url: string, query: string) => {
  return query.length > 0
    ? new handlebars.SafeString(`href="${url}?${query}"`)
    : new handlebars.SafeString(`href="${url}"`);
});

handlebars.registerHelper('s_pluralize', (word: string, count: number) => {
  const noun = count === 1 ? word : `${word}s`;
  const numeric = count === 0 ? 'no' : `${count}`;
  return `${numeric} ${noun}`;
});

//** New functions */
handlebars.registerHelper('date_range_url_display', (fromTimestamp: number, toTimestamp: number) => {
  return `startDate=${format(fromTimestamp, URL_DATE_FORMAT)}&endDate=${format(toTimestamp, URL_DATE_FORMAT)}`;
});

handlebars.registerHelper('date_range_user_display', (fromTimestamp: number, toTimestamp: number) => {
  const from = format(new Date(fromTimestamp), DATE_FORMAT);
  const to = format(new Date(toTimestamp), DATE_FORMAT);
  return `${from} to ${to}`;
});

handlebars.registerHelper('global_summary', (modelCount: number, totalAlertCount: number) => {
  const pluralString = modelCount === 1 ? 'model' : 'models';
  if (modelCount === 0 || totalAlertCount === 0) {
    return 'No models experienced alerts during this time period';
  }
  const pluralAlertsString = totalAlertCount === 1 ? 'alert' : 'alerts';
  return `${modelCount} ${pluralString} experienced ${totalAlertCount} ${pluralAlertsString} since last time`;
});

handlebars.registerHelper('get_row_item_style', (modelRow: ModelNotificationRow) => {
  if (modelRow.last) {
    return new handlebars.SafeString('style="width: 300"');
  } else {
    return new handlebars.SafeString('style="width: 300" colspan="2" align="center"');
  }
});
