#!/usr/bin/env bun
/**
 * Translate Recipe to English using OpenAI GPT-4.1-mini
 * Usage: bun scripts/translate-recipe.js <recipe-slug> [--all-german]
 *
 * Environment: OPENAI_API_KEY must be set
 */
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai').default;
const { RecipeSchema } = require('../src/schemas/recipe-schema');

const dataDir = path.join(__dirname, '../src/_data');

// JSON schema for translated recipe
const translatedRecipeJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          unit: { type: "string" },
          notes: { type: "string" }
        },
        required: ["name", "unit", "notes"],
        additionalProperties: false
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          instruction: { type: "string" },
          notes: { type: "string" }
        },
        required: ["instruction", "notes"],
        additionalProperties: false
      }
    },
    tags: { type: "array", items: { type: "string" } }
  },
  required: ["title", "description", "ingredients", "steps", "tags"],
  additionalProperties: false
};

async function translateRecipe(recipe, openai) {
  console.log(`🌐 Translating: ${recipe.title}`);

  // Extract only text fields for translation
  const textToTranslate = {
    title: recipe.title,
    description: recipe.description || "",
    ingredients: recipe.ingredients.map(ing => ({
      name: ing.name,
      unit: ing.unit || "",
      notes: ing.notes || ""
    })),
    steps: recipe.steps.map(step => ({
      instruction: step.instruction,
      notes: step.notes || ""
    })),
    tags: recipe.tags || []
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional translator specializing in culinary content. Translate the recipe from German to British English (en-GB).

Translation rules:
- Use British English spelling (colour, flavour, courgette not zucchini, aubergine not eggplant)
- Translate units: EL → tbsp, TL → tsp, Stück → pieces, nach Geschmack → to taste
- Keep brand names as-is (e.g., "Hello Paprika" seasoning)
- Translate cooking terms naturally (anbraten → sauté/fry, köcheln → simmer)
- Remove regional origin codes like "DE", "NL|BE|DE" from ingredient notes
- Translate tags to English equivalents
- Keep the same array order for ingredients and steps`
      },
      {
        role: "user",
        content: JSON.stringify(textToTranslate)
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "translated_recipe",
        schema: translatedRecipeJsonSchema,
        strict: true
      }
    },
    max_completion_tokens: 4096,
  });

  const translated = JSON.parse(response.choices[0].message.content);
  console.log(`✅ Translation received`);

  return translated;
}

function mergeTranslation(original, translated) {
  // Create new recipe with translated text but original structure
  const newRecipe = {
    slug: original.slug + "-en-GB",
    title: translated.title,
    description: translated.description,
    difficulty: original.difficulty,
    totalTimeMinutes: original.totalTimeMinutes,
    servings: { ...original.servings },
    ingredients: original.ingredients.map((ing, i) => ({
      name: translated.ingredients[i]?.name || ing.name,
      unit: translated.ingredients[i]?.unit || ing.unit,
      notes: translated.ingredients[i]?.notes || "",
      quantitiesByServings: { ...ing.quantitiesByServings }
    })),
    steps: original.steps.map((step, i) => {
      const translatedStep = {
        id: step.id,
        instruction: translated.steps[i]?.instruction || step.instruction,
        durationMinutes: step.durationMinutes,
        notes: translated.steps[i]?.notes || ""
      };
      if (step.ingredients) translatedStep.ingredients = step.ingredients;
      if (step.image) translatedStep.image = step.image;
      return translatedStep;
    }),
    tags: ["en-GB", ...translated.tags.filter(t => t !== "en-GB")]
  };

  // Copy optional fields
  if (original.ovenSettings) newRecipe.ovenSettings = { ...original.ovenSettings };
  if (original.nutrition) newRecipe.nutrition = { ...original.nutrition };
  if (original.servingSuggestions) newRecipe.servingSuggestions = [...original.servingSuggestions];

  return newRecipe;
}

async function saveTranslatedRecipe(recipe) {
  const recipesPath = path.join(dataDir, 'recipes.json');
  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));

  // Validate recipe against schema
  const validation = RecipeSchema.safeParse(recipe);
  if (!validation.success) {
    console.error('❌ Recipe validation failed:');
    validation.error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Recipe validation failed');
  }

  recipes[recipe.slug] = recipe;
  fs.writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));
  console.log(`💾 Saved: ${recipe.slug}`);
}

// German recipes to translate (excluding already English ones)
const GERMAN_RECIPE_SLUGS = [
  'zucchini-schinken-birne-salat-mit-pinienkernen',
  'hahnchenbrust-mit-brokkoli-paprikasosse',
  'glasnudelsalat-mit-hackfleisch-und-gemuese',
  'gemuese-lachs-mit-porree-und-linsen',
  'bulgur-spitzpaprika-salat-mit-avocado-und-zwiebel-joghurt-dip',
  'vegetarische-moussaka-mit-aubergine-linsen',
  'ofen-ratatouille-mit-walnussen-und-mozzarella',
  'beef-burger-garden-style-risotto',
  'miniballs-with-chili-mayo-and-vegetable-salad',
  'bulgogi-sweet-chili-burger-with-roasted-vegetable-slices'
];

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('Usage: bun scripts/translate-recipe.js <recipe-slug>');
    console.log('       bun scripts/translate-recipe.js --all-german');
    console.log('\nGerman recipes available:');
    GERMAN_RECIPE_SLUGS.forEach(s => console.log(`  - ${s}`));
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const recipesPath = path.join(dataDir, 'recipes.json');
  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));

  const slugsToTranslate = arg === '--all-german'
    ? GERMAN_RECIPE_SLUGS
    : [arg];

  console.log(`🍳 Starting translation of ${slugsToTranslate.length} recipe(s)...\n`);

  let translated = 0;
  let skipped = 0;

  for (const slug of slugsToTranslate) {
    const enSlug = slug + '-en-GB';

    // Skip if already translated
    if (recipes[enSlug]) {
      console.log(`⏭️  Skipping ${slug} (already translated)`);
      skipped++;
      continue;
    }

    const original = recipes[slug];
    if (!original) {
      console.error(`❌ Recipe not found: ${slug}`);
      continue;
    }

    try {
      const translatedText = await translateRecipe(original, openai);
      const newRecipe = mergeTranslation(original, translatedText);
      await saveTranslatedRecipe(newRecipe);
      translated++;

      // Small delay between API calls
      if (slugsToTranslate.length > 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error(`❌ Error translating ${slug}:`, error.message);
    }
  }

  console.log(`\n🎉 Done! Translated: ${translated}, Skipped: ${skipped}`);
}

main();
