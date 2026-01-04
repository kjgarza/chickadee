// Timer state management with localStorage
const TimerManager = {
  storageKey: 'cookingTimer',

  getState(recipeSlug) {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed[recipeSlug] || null;
  },

  setState(recipeSlug, state) {
    const data = localStorage.getItem(this.storageKey);
    const parsed = data ? JSON.parse(data) : {};
    parsed[recipeSlug] = state;
    localStorage.setItem(this.storageKey, JSON.stringify(parsed));
  },

  clearState(recipeSlug) {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return;
    const parsed = JSON.parse(data);
    delete parsed[recipeSlug];
    localStorage.setItem(this.storageKey, JSON.stringify(parsed));
  },

  getElapsedMs(recipeSlug) {
    const state = this.getState(recipeSlug);
    if (!state || !state.startTime) return 0;
    
    // If paused, return elapsed time at pause
    if (state.isPaused && state.pausedAt) {
      return state.pausedAt - state.startTime;
    }
    
    return Date.now() - state.startTime;
  }
};

let timerInterval = null;
let currentRecipeSlug = null;

function initTimer(recipeSlug) {
  currentRecipeSlug = recipeSlug;
  const state = TimerManager.getState(recipeSlug);
  
  if (state && state.startTime) {
    if (state.isPaused) {
      showTimerPaused();
    } else {
      showTimerRunning();
      startTimerInterval();
    }
    collapseIngredientsSection();
    updateTimerDisplay();
  }
}

function startTimer() {
  if (!currentRecipeSlug) return;
  
  const state = {
    startTime: Date.now(),
    servingSize: getSelectedServingSize(),
    currentStepId: null,
    isPaused: false,
    pausedAt: null
  };
  
  TimerManager.setState(currentRecipeSlug, state);
  showTimerRunning();
  startTimerInterval();
  collapseIngredientsSection();
}

function pauseTimer() {
  if (!currentRecipeSlug) return;
  
  const state = TimerManager.getState(currentRecipeSlug);
  if (!state) return;
  
  state.isPaused = true;
  state.pausedAt = Date.now();
  TimerManager.setState(currentRecipeSlug, state);
  
  stopTimerInterval();
  showTimerPaused();
}

function resumeTimer() {
  if (!currentRecipeSlug) return;
  
  const state = TimerManager.getState(currentRecipeSlug);
  if (!state || !state.isPaused) return;
  
  // Adjust start time to account for pause duration
  const pauseDuration = Date.now() - state.pausedAt;
  state.startTime += pauseDuration;
  state.isPaused = false;
  state.pausedAt = null;
  TimerManager.setState(currentRecipeSlug, state);
  
  showTimerRunning();
  startTimerInterval();
}

function resetTimer() {
  if (!currentRecipeSlug) return;
  
  if (confirm('Reset timer? This will clear your cooking progress.')) {
    TimerManager.clearState(currentRecipeSlug);
    stopTimerInterval();
    showTimerStopped();
    resetStepDisplays();
    expandIngredientsSection();
  }
}

function collapseIngredientsSection() {
  const servingSection = document.getElementById('serving-section');
  const ingredientsSection = document.getElementById('ingredients-section');
  const recipeHeaderSection = document.getElementById('recipe-header-section');
  const sectionsToggle = document.getElementById('sections-toggle');
  
  if (servingSection) servingSection.classList.add('hidden');
  if (ingredientsSection) ingredientsSection.classList.add('hidden');
  if (recipeHeaderSection) recipeHeaderSection.classList.add('hidden');
  if (sectionsToggle) sectionsToggle.classList.remove('hidden');
  
  // Reset toggle state
  updateToggleButtonState(false);
}

function expandIngredientsSection() {
  const servingSection = document.getElementById('serving-section');
  const ingredientsSection = document.getElementById('ingredients-section');
  const recipeHeaderSection = document.getElementById('recipe-header-section');
  const sectionsToggle = document.getElementById('sections-toggle');
  
  if (servingSection) servingSection.classList.remove('hidden');
  if (ingredientsSection) ingredientsSection.classList.remove('hidden');
  if (recipeHeaderSection) recipeHeaderSection.classList.remove('hidden');
  if (sectionsToggle) sectionsToggle.classList.add('hidden');
}

// Track if sections are currently shown via toggle
let sectionsExpanded = false;

function toggleCollapsedSections() {
  sectionsExpanded = !sectionsExpanded;
  
  const servingSection = document.getElementById('serving-section');
  const ingredientsSection = document.getElementById('ingredients-section');
  const recipeHeaderSection = document.getElementById('recipe-header-section');
  
  if (sectionsExpanded) {
    if (servingSection) servingSection.classList.remove('hidden');
    if (ingredientsSection) ingredientsSection.classList.remove('hidden');
    if (recipeHeaderSection) recipeHeaderSection.classList.remove('hidden');
  } else {
    if (servingSection) servingSection.classList.add('hidden');
    if (ingredientsSection) ingredientsSection.classList.add('hidden');
    if (recipeHeaderSection) recipeHeaderSection.classList.add('hidden');
  }
  
  updateToggleButtonState(sectionsExpanded);
}

function updateToggleButtonState(isExpanded) {
  const toggleIcon = document.getElementById('toggle-icon');
  const toggleText = document.getElementById('toggle-text');
  
  if (toggleIcon && toggleText) {
    if (isExpanded) {
      toggleIcon.textContent = '🙈';
      toggleText.textContent = 'Hide Recipe Details';
    } else {
      toggleIcon.textContent = '👁️';
      toggleText.textContent = 'Show Recipe Details';
    }
  }
  sectionsExpanded = isExpanded;
}

function showTimerRunning() {
  document.getElementById('timer-status').classList.remove('hidden');
  document.getElementById('start-btn').classList.add('hidden');
  document.getElementById('pause-btn').classList.remove('hidden');
  document.getElementById('resume-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');
  
  // Show countdowns on step cards
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.remove('hidden');
  });
}

function showTimerPaused() {
  document.getElementById('timer-status').classList.remove('hidden');
  document.getElementById('start-btn').classList.add('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('resume-btn').classList.remove('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');
  
  // Show countdowns on step cards
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.remove('hidden');
  });
}

function showTimerStopped() {
  document.getElementById('timer-status').classList.add('hidden');
  document.getElementById('start-btn').classList.remove('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('resume-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.add('hidden');
  
  // Hide countdowns
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.add('hidden');
  });
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  if (!currentRecipeSlug) return;
  
  const elapsedMs = TimerManager.getElapsedMs(currentRecipeSlug);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  // Update elapsed time display
  const elapsedEl = document.getElementById('elapsed-time');
  if (elapsedEl) {
    elapsedEl.textContent = formatTime(elapsedSeconds);
  }
  
  // Update step countdowns
  updateStepCountdowns(elapsedMs);
}

function updateStepCountdowns(elapsedMs) {
  const elapsedMinutes = elapsedMs / 60000;
  
  document.querySelectorAll('.step-card').forEach(card => {
    const startMinute = parseFloat(card.dataset.startMinute);
    const durationMinutes = parseFloat(card.dataset.durationMinutes || 0);
    const endMinute = startMinute + durationMinutes;
    const countdownEl = card.querySelector('.step-countdown');
    
    if (!countdownEl) return;
    
    const remainingMinutes = startMinute - elapsedMinutes;
    
    // Hide steps that are completely in the past (started + duration has passed)
    if (endMinute > 0 && elapsedMinutes > endMinute) {
      card.classList.add('hidden');
      return;
    }
    
    card.classList.remove('hidden');
    
    if (remainingMinutes <= 0) {
      countdownEl.textContent = '✓ Now!';
      countdownEl.classList.add('text-success');
      countdownEl.classList.remove('text-accent');
      card.classList.add('opacity-60');
    } else {
      const remainingSeconds = Math.floor(remainingMinutes * 60);
      countdownEl.textContent = formatTime(remainingSeconds);
      countdownEl.classList.remove('text-success');
      countdownEl.classList.add('text-accent');
      card.classList.remove('opacity-60');
    }
  });
  
  // Highlight next upcoming step
  highlightNextStep(elapsedMinutes);
}

function highlightNextStep(elapsedMinutes) {
  let nextStep = null;
  let minRemaining = Infinity;
  
  document.querySelectorAll('.step-card').forEach(card => {
    const startMinute = parseFloat(card.dataset.startMinute);
    const remaining = startMinute - elapsedMinutes;
    
    card.classList.remove('border-2', 'border-accent');
    
    if (remaining > 0 && remaining < minRemaining) {
      minRemaining = remaining;
      nextStep = card;
    }
  });
  
  if (nextStep) {
    nextStep.classList.add('border-2', 'border-accent');
  }
}

function resetStepDisplays() {
  document.querySelectorAll('.step-card').forEach(card => {
    card.classList.remove('opacity-60', 'border-2', 'border-accent');
    const countdownEl = card.querySelector('.step-countdown');
    if (countdownEl) {
      countdownEl.textContent = '--:--';
      countdownEl.classList.remove('text-success');
    }
  });
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = n => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function getSelectedServingSize() {
  const selector = document.getElementById('serving-selector');
  return selector ? parseInt(selector.value) : 4;
}

// Handle page visibility to keep timer accurate
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentRecipeSlug) {
    const state = TimerManager.getState(currentRecipeSlug);
    if (state && state.startTime) {
      updateTimerDisplay();
    }
  }
});
