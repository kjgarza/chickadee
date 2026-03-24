set positional-arguments

default: help

# List available commands
help:
    @just --list

# Install dependencies
install:
    bun install

# Start local development server (11ty)
dev:
    bun start

# Build static site to _site/ (runs validation via prebuild)
build:
    bun run build

# Validate recipes.json and processes.json against Zod schemas
validate:
    bun run validate

# Run tests in watch mode
test:
    bunx vitest

# Run tests once
test-once:
    bunx vitest run

# Generate process data for a single recipe slug
# Usage: just generate pasta-carbonara
generate slug:
    bun run generate "{{slug}}"

# Translate one recipe to en-GB
# Usage: just translate hahnchenbrust-mit-brokkoli-paprikasosse
translate slug:
    bun scripts/translate-recipe.js "{{slug}}"

# Translate all known German recipes to en-GB
translate-all:
    bun scripts/translate-recipe.js --all-german

# Generate recipe data from an image (auto slug from AI)
# Usage: just image-to-recipe ./photos/recipe.jpg
image-to-recipe image:
    bun run image-to-recipe "{{image}}"

# Generate recipe data from an image with explicit slug
# Usage: just image-to-recipe-slug ./photos/recipe.jpg my-recipe
image-to-recipe-slug image slug:
    bun run image-to-recipe "{{image}}" "{{slug}}"

# Extract step pictures from one source image
# Usage: just extract-pictures ./photos/recipe.jpg
extract-pictures image:
    bun scripts/extract-food-pictures.js "{{image}}"

# Batch-extract step pictures from all photos
extract-pictures-all:
    bun scripts/extract-food-pictures.js --all

# End-to-end recipe data workflow after editing recipes.json
# Usage: just refresh-recipe pasta-carbonara
refresh-recipe slug:
    bun run generate "{{slug}}"
    bun run validate

# Run Puppeteer smoke test app script (expects app on localhost:8083)
test-app:
    bun scripts/test-app.js

# Remove generated site output
clean:
    rm -rf _site
