const { z } = require('zod');

const IngredientSchema = z.object({
  name: z.string(),
  unit: z.string().optional(),
  quantitiesByServings: z.record(z.string(), z.number()),
  notes: z.string().optional()
});

const StepSchema = z.object({
  id: z.string(),
  instruction: z.string(),
  durationMinutes: z.number().optional(),
  ingredients: z.array(z.string()).optional(),
  notes: z.string().optional(),
  image: z.string().optional()
});

const RecipeSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  totalTimeMinutes: z.number().optional(),
  ovenSettings: z.object({
    temperature: z.number(),
    unit: z.enum(['C', 'F']),
    mode: z.string().optional()
  }).optional(),
  servings: z.object({
    min: z.number(),
    max: z.number(),
    default: z.number()
  }),
  ingredients: z.array(IngredientSchema),
  steps: z.array(StepSchema),
  nutrition: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional()
  }).optional(),
  servingSuggestions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

module.exports = { RecipeSchema, IngredientSchema, StepSchema };
