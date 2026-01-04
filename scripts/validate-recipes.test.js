import { describe, it, expect } from 'vitest';

describe('Recipe Validation', () => {
    it('should validate a correct recipe', () => {
        const recipe = { name: 'Pancakes', ingredients: ['flour', 'milk', 'eggs'] };
        expect(validateRecipe(recipe)).toBe(true);
    });

    it('should invalidate a recipe with missing ingredients', () => {
        const recipe = { name: 'Omelette', ingredients: [] };
        expect(validateRecipe(recipe)).toBe(false);
    });

    it('should invalidate a recipe with no name', () => {
        const recipe = { name: '', ingredients: ['eggs', 'salt'] };
        expect(validateRecipe(recipe)).toBe(false);
    });
});