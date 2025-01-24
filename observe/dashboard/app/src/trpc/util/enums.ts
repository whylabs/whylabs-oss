import { z } from 'zod';

import { TimePeriod } from '../../graphql/generated/graphql';

export const Granularity = z.nativeEnum(TimePeriod);
