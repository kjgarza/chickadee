#!/usr/bin/env bun
/**
 * Generate Recipe from Image using OpenAI GPT-5 Vision
 * Usage: bun scripts/image-to-recipe.js <image-path> [recipe-slug]
 * 
 * Environment: OPENAI_API_KEY must be set
 */
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai').default;
const { RecipeSchema } = require('../src/schemas/recipe-schema');

const dataDir = path.join(__dirname, '../src/_data');

// JSON schema for recipe extraction
const recipeJsonSchema = {
  type: "object",
  properties: {
    slug: { type: "string", description: "URL-friendly slug in kebab-case" },
    title: { type: "string" },
    description: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    totalTimeMinutes: { type: "number" },
    servings: {
      type: "object",
      properties: {
        min: { type: "number" },
        max: { type: "number" },
        default: { type: "number" }
      },
      required: ["min", "max", "default"],
      additionalProperties: false
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          unit: { type: "string" },
          quantity2: { type: "number", description: "Quantity for 2 servings" },
          quantity3: { type: "number", description: "Quantity for 3 servings" },
          quantity4: { type: "number", description: "Quantity for 4 servings" },
          quantity5: { type: "number", description: "Quantity for 5 servings" },
          quantity6: { type: "number", description: "Quantity for 6 servings" },
          notes: { type: "string" }
        },
        required: ["name", "unit", "quantity2", "quantity3", "quantity4", "quantity5", "quantity6", "notes"],
        additionalProperties: false
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique step ID in kebab-case" },
          instruction: { type: "string" },
          durationMinutes: { type: "number" },
          ingredients: { type: "array", items: { type: "string" } },
          notes: { type: "string" }
        },
        required: ["id", "instruction", "durationMinutes", "ingredients", "notes"],
        additionalProperties: false
      }
    },
    tags: { type: "array", items: { type: "string" } }
  },
  required: ["slug", "title", "description", "difficulty", "totalTimeMinutes", "servings", "ingredients", "steps", "tags"],
  additionalProperties: false
};

async function extractRecipeFromImage(imagePath, openai) {
  console.log(`📸 Reading image: ${imagePath}`);
  
  // Check image size and resize if necessary
  const stats = fs.statSync(imagePath);
  const fileSizeKB = stats.size / 1024;
  
  let processedImagePath = imagePath;
  
  if (fileSizeKB > 800) {
    console.log(`📏 Image size: ${fileSizeKB.toFixed(0)}KB - resizing to 50%...`);
    
    const ext = path.extname(imagePath);
    const basename = path.basename(imagePath, ext);
    const dirname = path.dirname(imagePath);
    processedImagePath = path.join(dirname, `${basename}_resized${ext}`);
    
    // Use ImageMagick to resize
    const { execSync } = require('child_process');
    try {
      execSync(`magick "${imagePath}" -resize 50% "${processedImagePath}"`, { 
        stdio: 'inherit' 
      });
      
      const newStats = fs.statSync(processedImagePath);
      const newSizeKB = newStats.size / 1024;
      console.log(`✅ Resized to ${newSizeKB.toFixed(0)}KB`);
    } catch (err) {
      console.warn('⚠️  ImageMagick resize failed, using original image');
      console.warn('   Install ImageMagick: brew install imagemagick');
      processedImagePath = imagePath;
    }
  } else {
    console.log(`📏 Image size: ${fileSizeKB.toFixed(0)}KB - OK`);
  }
  
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(processedImagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = processedImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  console.log('🤖 Sending to GPT-5 for analysis...');
  
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: `You are a culinary expert that extracts recipe information from images. 
Extract all recipe details including title, ingredients with quantities, step-by-step instructions with timing, and generate appropriate metadata.
For quantitiesByServings, provide quantities for serving sizes from the recipe's min to max servings.
The image includes the ingredients and utensils on the left side, and the cooking steps on the right side.
Generate kebab-case IDs for steps (e.g., "boil-water", "chop-vegetables").
Estimate duration in minutes for each step based on the cooking action.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the complete recipe from this image. Include all ingredients with their quantities scaled for different serving sizes, and all cooking steps with estimated durations.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recipe",
        schema: recipeJsonSchema,
        strict: true,
      },
    },
    max_completion_tokens: 4096,
  });
  
  const rawContent = response.choices[0].message.content;
  console.log('📄 Received response from GPT-5');
  
  let recipeData;
  try {
    recipeData = JSON.parse(rawContent);
  } catch (err) {
    console.error('Failed to parse JSON response:');
    console.error('Raw content:', rawContent?.substring(0, 500));
    throw new Error(`JSON parsing failed: ${err.message}`);
  }
  
  // Transform quantity fields to quantitiesByServings object
  recipeData.ingredients = recipeData.ingredients.map(ing => {
    const { quantity2, quantity3, quantity4, quantity5, quantity6, ...rest } = ing;
    return {
      ...rest,
      quantitiesByServings: {
        "2": quantity2,
        "3": quantity3,
        "4": quantity4,
        "5": quantity5,
        "6": quantity6
      }
    };
  });
  
  // Cleanup resized image if created
  if (processedImagePath !== imagePath && fs.existsSync(processedImagePath)) {
    fs.unlinkSync(processedImagePath);
    console.log('🧹 Cleaned up resized image');
  }
  
  return recipeData;
}

function generateCookingProcess(recipe) {
  console.log('⚙️  Generating cooking process timeline...');
  
  let currentMinute = 0;
  const timeline = [];
  
  for (const step of recipe.steps) {
    timeline.push({
      id: step.id,
      type: 'action',
      instruction: step.instruction + (step.notes ? ` (${step.notes})` : ''),
      startMinute: currentMinute,
      durationMinutes: step.durationMinutes || 0,
      isCriticalPath: true
    });
    
    currentMinute += step.durationMinutes || 0;
  }
  
  return {
    recipeSlug: recipe.slug,
    totalDurationMinutes: currentMinute,
    timeline: timeline,
    finishCriteria: 'Recipe completed as described'
  };
}

async function saveRecipe(recipe, process) {
  // Load existing recipes
  const recipesPath = path.join(dataDir, 'recipes.json');
  let recipes = {};
  if (fs.existsSync(recipesPath)) {
    recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
  }
  
  // Validate recipe against schema
  const validation = RecipeSchema.safeParse(recipe);
  if (!validation.success) {
    console.error('❌ Recipe validation failed:');
    validation.error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    throw new Error('Recipe validation failed');
  }
  
  // Save recipe
  recipes[recipe.slug] = recipe;
  fs.writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));
  console.log(`✅ Recipe saved to recipes.json as "${recipe.slug}"`);
  
  // Load existing processes
  const processesPath = path.join(dataDir, 'processes.json');
  let processes = {};
  if (fs.existsSync(processesPath)) {
    processes = JSON.parse(fs.readFileSync(processesPath, 'utf-8'));
  }
  
  // Save process
  processes[recipe.slug] = process;
  fs.writeFileSync(processesPath, JSON.stringify(processes, null, 2));
  console.log(`✅ Cooking process saved to processes.json`);
}

async function main() {
  const imagePath = process.argv[2];
  const customSlug = process.argv[3];
  
  if (!imagePath) {
    console.log('Usage: bun scripts/image-to-recipe.js <image-path> [recipe-slug]');
    console.log('\nExample:');
    console.log('  bun scripts/image-to-recipe.js ./my-recipe.jpg');
    console.log('  bun scripts/image-to-recipe.js ./recipe.png custom-slug');
    console.log('\nEnvironment:');
    console.log('  OPENAI_API_KEY must be set');
    process.exit(1);
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Error: Image file not found: ${imagePath}`);
    process.exit(1);
  }
  
  try {
    console.log('🍳 Starting recipe extraction from image...\n');
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Extract recipe from image using GPT-5
    const recipe = await extractRecipeFromImage(imagePath, openai);
    
    // Override slug if provided
    if (customSlug) {
      recipe.slug = customSlug;
    }
    
    console.log(`\n📝 Extracted recipe: ${recipe.title}`);
    console.log(`   Slug: ${recipe.slug}`);
    console.log(`   Ingredients: ${recipe.ingredients.length}`);
    console.log(`   Steps: ${recipe.steps.length}`);
    
    // Generate cooking process
    const cookingProcess = generateCookingProcess(recipe);
    console.log(`   Total time: ${cookingProcess.totalDurationMinutes} minutes`);
    
    // Save to JSON files
    await saveRecipe(recipe, cookingProcess);
    
    console.log('\n🎉 Recipe successfully generated from image!');
    console.log(`   View at: http://localhost:8080/recipes/${recipe.slug}/`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
