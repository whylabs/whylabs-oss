import { z } from 'zod';

export const feedbackSchema = z.object({
  componentName: z.string(),
  cardType: z.string(),
  featureId: z.string().optional(),
});

export type FeedbackInfo = z.infer<typeof feedbackSchema>;
