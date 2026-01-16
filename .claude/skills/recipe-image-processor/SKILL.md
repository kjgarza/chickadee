---
name: recipe-image-processor
description: Process recipe photos into structured recipe data using GPT-4 vision. Use when asked to extract recipes from images, convert recipe photos to JSON, process HelloFresh/meal-kit recipe cards, or batch process multiple recipe images. Handles image preprocessing (resize, rotate), recipe extraction via AI vision, step image linking, and cooking process generation.
---

# Recipe Image Processor

Extract structured recipe data from recipe card photos using GPT vision API.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **ImageMagick**: `brew install imagemagick`
- **OpenAI API key**: Set `OPENAI_API_KEY` environment variable

## Workflow

### Step 1: Preprocess Photos

Large photos (>2MB) should be resized before sending to GPT vision. Recipe card photos often need rotation.

```bash
# Resize and rotate single photo
magick "input.jpg" -rotate -90 -resize '2000x2000>' -quality 85 "processed.jpg"

# Batch preprocess all photos in a directory
for f in photos/*.jpg; do
  basename=$(basename "$f")
  magick "$f" -rotate -90 -resize '2000x2000>' -quality 85 "photos/processed/$basename"
done
```

Common transformations:
- `-rotate -90`: Rotate 90° counter-clockwise (for portrait photos taken in landscape)
- `-resize '2000x2000>'`: Shrink to max 2000px, maintaining aspect ratio
- `-quality 85`: Compress to reduce file size while maintaining readability

### Step 2: Extract Recipe from Image

Run the image-to-recipe script to extract structured recipe data using GPT-4 vision:

```bash
bun run image-to-recipe <image-path> [custom-slug]
```

The script:
1. Reads and optionally resizes the image
2. Sends to GPT-4.1-mini with structured JSON schema
3. Validates against Zod recipe schema
4. Saves to `recipes.json` and generates initial `processes.json`

Example:
```bash
bun run image-to-recipe photos/processed/my-recipe.jpg
bun run image-to-recipe photos/processed/my-recipe.jpg custom-slug-name
```

### Step 3: Link Step Images (if available)

If step images exist (extracted from the same photo), add `image` field to each recipe step.

Image path format: `/chickadee/assets/images/steps/{photo-prefix}-pic-{1-6}.jpg`

Mapping pattern (6 steps max with images):
- Step 1 → `-pic-1.jpg`
- Step 2 → `-pic-2.jpg`
- ...
- Step 6 → `-pic-6.jpg`

Edit `recipes.json` to add image paths:
```json
{
  "steps": [
    {
      "id": "chop-vegetables",
      "instruction": "Chop the vegetables",
      "durationMinutes": 5,
      "image": "/chickadee/assets/images/steps/PXL_20251228_145906937.MP-pic-1.jpg"
    }
  ]
}
```

### Step 4: Regenerate Cooking Process

After modifying recipes.json (especially adding images), regenerate the process:

```bash
bun run generate <recipe-slug>
```

This updates `processes.json` with image paths in the timeline.

### Step 5: Validate

Run validation to ensure all recipes and processes are valid:

```bash
bun run validate
```

## Batch Processing Multiple Photos

For processing many recipe photos:

```bash
# 1. Preprocess all photos
mkdir -p photos/processed
for f in photos/*.jpg; do
  basename=$(basename "$f")
  magick "$f" -rotate -90 -resize '2000x2000>' -quality 85 "photos/processed/$basename"
done

# 2. Extract recipes one by one
for f in photos/processed/*.jpg; do
  bun run image-to-recipe "$f"
done

# 3. Link step images (see Step 3 above)

# 4. Regenerate all processes
for slug in $(jq -r 'keys[]' src/_data/recipes.json); do
  bun run generate "$slug"
done

# 5. Validate all
bun run validate
```

## Extracting Step Images from Recipe Cards

If recipe cards contain embedded step images (e.g., HelloFresh cards with 6 cooking step photos), use the extract-food-pictures script:

```bash
# Single image
bun scripts/extract-food-pictures.js <image-path>

# All images in photos directory
bun scripts/extract-food-pictures.js --all
```

This extracts 6 cropped step images per recipe card, saved to `src/assets/images/steps/`.

## Recipe JSON Schema

Extracted recipes follow this structure:

```json
{
  "slug": "kebab-case-name",
  "title": "Recipe Title",
  "description": "Brief description",
  "difficulty": "easy|medium|hard",
  "totalTimeMinutes": 30,
  "servings": { "min": 2, "max": 6, "default": 4 },
  "ingredients": [
    {
      "name": "Ingredient Name",
      "unit": "g|ml|pieces|etc",
      "quantitiesByServings": { "2": 100, "3": 150, "4": 200, "5": 250, "6": 300 },
      "notes": "optional notes"
    }
  ],
  "steps": [
    {
      "id": "step-id-kebab-case",
      "instruction": "Do the thing",
      "durationMinutes": 5,
      "ingredients": ["ingredient-name"],
      "notes": "optional",
      "image": "/path/to/step-image.jpg"
    }
  ],
  "tags": ["vegetarian", "quick", "etc"]
}
```

## Troubleshooting

**`command not found: bun`**: Use full path `/Users/<user>/.bun/bin/bun` or add to PATH

**`command not found: magick`**: Install ImageMagick with `brew install imagemagick`

**Recipe validation fails**: Check error messages from `bun run validate` - common issues:
- Missing required fields (quantitiesByServings needs 2-6)
- Invalid step IDs (must be kebab-case)
- Invalid difficulty (must be easy/medium/hard)

**GPT extraction incomplete**: Try reducing image size further or improving image quality/lighting
