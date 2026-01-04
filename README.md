# 🍳 Cooking Timer App

A mobile-friendly interactive cooking timer that displays recipe steps with precise timing, countdowns, and a full timeline view. Built with Eleventy, Nunjucks, and daisyUI.

## Features

- ⏱️ **Real-time countdown timers** for each cooking step
- 📱 **Mobile-friendly** responsive design
- 🎨 **Multiple themes** with daisyUI (Cupcake, Dark, Light, Forest)
- 📊 **Visual timeline** showing upcoming and current steps
- 🔢 **Serving size scaling** automatically adjusts ingredient quantities
- 💾 **Timer persistence** via localStorage (resume after page refresh)
- 🏷️ **Tag filtering** on recipe index page
- ✅ **Zod validation** ensures data integrity

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) installed

### Installation
```bash
bun install
```

### Development
```bash
bun start
# Opens dev server at http://localhost:8080
```

### Build
```bash
bun run build
# Outputs to _site/ directory
```

## Project Structure

```
src/
├── _data/               # Recipe data (JSON)
│   ├── recipes.json     # Hand-authored recipe data
│   └── processes.json   # Generated timing data (DO NOT EDIT)
├── _includes/
│   ├── layouts/         # Base page layouts
│   ├── components/      # Reusable UI components
│   └── macros/          # Nunjucks helper macros
├── recipes/
│   └── recipe.njk       # Dynamic recipe page template
├── js/                  # Client-side JavaScript
│   ├── timer.js         # Timer state management
│   ├── timeline.js      # Timeline calculations
│   └── recipe-data.js   # Serving size logic
├── css/                 # Custom styles
└── schemas/             # Zod validation schemas
    ├── recipe-schema.js
    └── cooking-process-schema.js
```

## Adding New Recipes

### 1. Create Recipe Data
Edit `src/_data/recipes.json` and add your recipe:

```json
{
  "my-recipe": {
    "slug": "my-recipe",
    "title": "My Recipe",
    "description": "Description here",
    "difficulty": "easy",
    "totalTimeMinutes": 30,
    "servings": {
      "min": 2,
      "max": 4,
      "default": 2
    },
    "ingredients": [
      {
        "name": "flour",
        "unit": "g",
        "quantitiesByServings": { "2": 200, "3": 300, "4": 400 }
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "instruction": "Mix ingredients",
        "durationMinutes": 5
      }
    ],
    "tags": ["breakfast", "quick"]
  }
}
```

### 2. Generate Process Data
```bash
bun run generate my-recipe
```

This creates timing data in `processes.json` (required for the timer to work).

### 3. Validate
```bash
bun run validate
```

### 4. Test Locally
```bash
bun start
# Visit http://localhost:8080/recipes/my-recipe/
```

## Data Architecture

### Two Schema System

**RecipeSchema** (`recipes.json`)
- Human-authored recipe data
- Ingredients, steps, serving sizes
- Source of truth for recipe content

**CookingProcessSchema** (`processes.json`)
- Generated timing data
- Timeline with `startMinute` for each step
- Optimized for real-time timer execution
- **Never edit manually** - always regenerate

### Why Two Schemas?

RecipeSchema is optimized for **authoring** (easy to write/edit), while CookingProcessSchema is optimized for **execution** (easy to calculate timings). The `generate-process.js` script transforms one into the other.

## Scripts

| Command | Description |
|---------|-------------|
| `bun start` | Start development server |
| `bun run build` | Build static site to `_site/` |
| `bun run validate` | Validate recipe data with Zod |
| `bun run generate <slug>` | Generate process data for recipe |
| `bun run image-to-recipe <image> [slug]` | Generate recipe from image using GPT-5 |

## Generate Recipe from Image (AI-Powered)

Extract recipe data from a photo using OpenAI's GPT-4.1-mini Vision:

### Prerequisites
- OpenAI API key from [platform.openai.com](https://platform.openai.com/)
- ImageMagick for image optimization: `brew install imagemagick`

### Setup
```bash
export OPENAI_API_KEY=your-key-here
```

### Usage
```bash
# Generate recipe from image
bun run image-to-recipe ./my-recipe-photo.jpg

# Or specify custom slug
bun run image-to-recipe ./recipe.png my-custom-slug
```

### Features
- 📏 **Auto-resizes** images over 800KB to 50% (saves API costs)
- 🤖 Uses GPT-4.1-mini with vision for extraction
- 📊 Extracts: title, ingredients, steps with timing
- 🔢 Auto-scales quantities for 2-6 servings
- ✅ Validates with Zod schemas
- 💾 Saves to `recipes.json` and `processes.json`
- 🧹 Auto-cleanup of temporary files

### What it extracts
1. 📸 Reads and optionally resizes image
2. 🤖 Sends to GPT-4.1-mini for structured extraction
3. ✅ Validates against RecipeSchema
4. 💾 Saves both recipe and process data
5. 🎉 Ready to cook!

## Deployment

The app automatically deploys to GitHub Pages on every push to `main`:

1. Validates all recipe data
2. Builds static site with Eleventy
3. Deploys to GitHub Pages

See `.github/workflows/deploy.yml` for the full workflow.

## Key Concepts

### Serving Size Scaling
Ingredients use explicit quantities per serving size (no multipliers):
```json
"quantitiesByServings": { "2": 200, "3": 300, "4": 400 }
```

### Timer State Persistence
Timer state is stored in localStorage:
- Key: `cookingTimer`
- Indexed by recipe slug
- Stores: `startTime`, `servingSize`, `currentStepId`

### Parallel Actions
Steps that can be done simultaneously:
```json
{
  "type": "parallel",
  "startMinute": 0,
  "actions": [...]
}
```
Use `resource` field to prevent conflicts (e.g., multiple pans on same stovetop).

### Critical Path
Mark time-sensitive steps with `isCriticalPath: true` to highlight them in the UI.

## Technologies

- **[Eleventy](https://www.11ty.dev/)** - Static site generator
- **[Nunjucks](https://mozilla.github.io/nunjucks/)** - Templating engine
- **[daisyUI](https://daisyui.com/)** - Tailwind CSS component library
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **Vanilla JavaScript** - No frameworks, just DOM APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add/edit recipes following the schema
4. Run validation: `bun run validate`
5. Submit a pull request

## License

ISC
