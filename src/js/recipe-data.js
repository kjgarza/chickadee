// Recipe data loading and serving size calculations
const RecipeDataManager = {
  currentRecipe: null,
  currentServingSize: null,

  init(recipeData) {
    this.currentRecipe = recipeData;
    this.currentServingSize = recipeData.servings.default;
  },

  getIngredientQuantity(ingredient, servingSize) {
    const quantities = ingredient.quantitiesByServings;
    const key = servingSize.toString();
    
    if (quantities[key] !== undefined) {
      return quantities[key];
    }
    
    // Interpolate if exact serving size not available
    const defaultServing = this.currentRecipe.servings.default;
    const defaultQuantity = quantities[defaultServing.toString()];
    
    if (defaultQuantity !== undefined) {
      return (defaultQuantity / defaultServing) * servingSize;
    }
    
    return null;
  },

  formatQuantity(quantity) {
    if (quantity === null || quantity === undefined) return '';
    
    // Handle common fractions for readability
    const fractions = {
      0.25: '¼',
      0.5: '½',
      0.75: '¾',
      0.33: '⅓',
      0.67: '⅔'
    };
    
    const whole = Math.floor(quantity);
    const decimal = quantity - whole;
    
    // Round to 2 decimal places for comparison
    const roundedDecimal = Math.round(decimal * 100) / 100;
    
    if (roundedDecimal === 0) {
      return whole.toString();
    }
    
    if (fractions[roundedDecimal]) {
      return whole > 0 ? `${whole} ${fractions[roundedDecimal]}` : fractions[roundedDecimal];
    }
    
    return quantity.toFixed(1).replace(/\.0$/, '');
  }
};

function updateServingSize(newSize) {
  const size = parseInt(newSize);
  RecipeDataManager.currentServingSize = size;
  
  // Update all ingredient quantities in the DOM
  document.querySelectorAll('.ingredient-item').forEach(item => {
    const quantityEl = item.querySelector('.ingredient-quantity');
    if (!quantityEl) return;
    
    const quantities = JSON.parse(quantityEl.dataset.quantities || '{}');
    const newQuantity = quantities[size.toString()];
    
    if (newQuantity !== undefined) {
      quantityEl.textContent = RecipeDataManager.formatQuantity(newQuantity);
    } else {
      // Interpolate from default
      const defaultSize = RecipeDataManager.currentRecipe?.servings?.default || 4;
      const defaultQty = quantities[defaultSize.toString()];
      if (defaultQty !== undefined) {
        const scaled = (defaultQty / defaultSize) * size;
        quantityEl.textContent = RecipeDataManager.formatQuantity(scaled);
      }
    }
  });
  
  // Save to localStorage
  if (typeof currentRecipeSlug !== 'undefined' && currentRecipeSlug) {
    const state = TimerManager.getState(currentRecipeSlug) || {};
    state.servingSize = size;
    TimerManager.setState(currentRecipeSlug, state);
  }
}

function initRecipeData(recipeData) {
  RecipeDataManager.init(recipeData);
  
  // Restore saved serving size
  if (typeof currentRecipeSlug !== 'undefined' && currentRecipeSlug) {
    const state = TimerManager.getState(currentRecipeSlug);
    if (state && state.servingSize) {
      const selector = document.getElementById('serving-selector');
      if (selector) {
        selector.value = state.servingSize;
        updateServingSize(state.servingSize);
      }
    }
  }
}
