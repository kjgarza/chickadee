#!/usr/bin/env bun
/**
 * Generate CookingProcess from Recipe
 * Usage: bun generate-process.js <recipe-slug>
 * 
 * This script transforms a RecipeSchema into a CookingProcessSchema
 * by calculating timing based on step order and durations.
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/_data');

function generateProcess(recipeSlug) {
  const recipesPath = path.join(dataDir, 'recipes.json');
  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
  
  const recipe = recipes[recipeSlug];
  if (!recipe) {
    console.error(`Recipe "${recipeSlug}" not found`);
    process.exit(1);
  }
  
  console.log(`Generating process for: ${recipe.title}`);
  
  // Calculate timeline from steps
  let currentMinute = 0;
  const timeline = [];
  
  for (const step of recipe.steps) {
    timeline.push({
      id: step.id,
      type: 'action',
      instruction: step.instruction + (step.notes ? ` (${step.notes})` : ''),
      startMinute: currentMinute,
      durationMinutes: step.durationMinutes || 0,
      isCriticalPath: true,
      resource: undefined,
      image: step.image
    });
    
    currentMinute += step.durationMinutes || 0;
  }
  
  const process = {
    recipeSlug: recipeSlug,
    totalDurationMinutes: currentMinute,
    timeline: timeline,
    finishCriteria: 'Recipe completed'
  };
  
  // Output the generated process
  console.log('\nGenerated Process:');
  console.log(JSON.stringify(process, null, 2));
  
  // Optionally save to processes.json
  const processesPath = path.join(dataDir, 'processes.json');
  let processes = {};
  
  if (fs.existsSync(processesPath)) {
    processes = JSON.parse(fs.readFileSync(processesPath, 'utf-8'));
  }
  
  processes[recipeSlug] = process;
  fs.writeFileSync(processesPath, JSON.stringify(processes, null, 2));
  
  console.log(`\n✅ Saved to processes.json`);
}

// Get recipe slug from command line
const slug = process.argv[2];

if (!slug) {
  console.log('Usage: node generate-process.js <recipe-slug>');
  console.log('\nAvailable recipes:');
  
  const recipesPath = path.join(dataDir, 'recipes.json');
  if (fs.existsSync(recipesPath)) {
    const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
    Object.keys(recipes).forEach(s => console.log(`  - ${s}`));
  }
  
  process.exit(1);
}

generateProcess(slug);
