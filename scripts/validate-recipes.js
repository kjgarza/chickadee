#!/usr/bin/env bun
const fs = require('fs');
const path = require('path');
const { RecipeSchema } = require('../src/schemas/recipe-schema');
const { CookingProcessSchema } = require('../src/schemas/cooking-process-schema');

const dataDir = path.join(__dirname, '../src/_data');

function validateFile(filePath, schema, schemaName) {
  console.log(`Validating ${path.basename(filePath)} against ${schemaName}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    let errorCount = 0;
    
    for (const [key, value] of Object.entries(data)) {
      const result = schema.safeParse(value);
      
      if (!result.success) {
        console.error(`  ❌ ${key}: Validation failed`);
        result.error.issues.forEach(issue => {
          console.error(`     - ${issue.path.join('.')}: ${issue.message}`);
        });
        errorCount++;
      } else {
        console.log(`  ✓ ${key}`);
      }
    }
    
    return errorCount === 0;
  } catch (err) {
    console.error(`  ❌ Error reading/parsing file: ${err.message}`);
    return false;
  }
}

function main() {
  console.log('🔍 Validating recipe data...\n');
  
  let allValid = true;
  
  // Validate recipes.json
  const recipesPath = path.join(dataDir, 'recipes.json');
  if (fs.existsSync(recipesPath)) {
    if (!validateFile(recipesPath, RecipeSchema, 'RecipeSchema')) {
      allValid = false;
    }
  } else {
    console.log('⚠️  recipes.json not found');
  }
  
  console.log('');
  
  // Validate processes.json
  const processesPath = path.join(dataDir, 'processes.json');
  if (fs.existsSync(processesPath)) {
    if (!validateFile(processesPath, CookingProcessSchema, 'CookingProcessSchema')) {
      allValid = false;
    }
  } else {
    console.log('⚠️  processes.json not found');
  }
  
  console.log('');
  
  if (allValid) {
    console.log('✅ All validations passed!');
    process.exit(0);
  } else {
    console.log('❌ Some validations failed!');
    process.exit(1);
  }
}

main();
