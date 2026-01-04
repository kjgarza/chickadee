const { z } = require('zod');

const CookingActionSchema = z.object({
  id: z.string(),
  type: z.literal('action'),
  instruction: z.string(),
  startMinute: z.number(),
  durationMinutes: z.number().optional(),
  isCriticalPath: z.boolean().default(false),
  resource: z.string().optional(),
  image: z.string().optional()
});

const ParallelBlockSchema = z.object({
  id: z.string(),
  type: z.literal('parallel'),
  startMinute: z.number(),
  actions: z.array(CookingActionSchema)
});

const TimelineItemSchema = z.union([CookingActionSchema, ParallelBlockSchema]);

const CookingProcessSchema = z.object({
  recipeSlug: z.string(),
  totalDurationMinutes: z.number(),
  timeline: z.array(TimelineItemSchema),
  finishCriteria: z.string().optional()
});

module.exports = { 
  CookingActionSchema, 
  ParallelBlockSchema, 
  TimelineItemSchema,
  CookingProcessSchema 
};
