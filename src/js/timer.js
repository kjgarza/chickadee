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

  if (confirm('86 this order? This will clear your cooking progress.')) {
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
  const toggleText = document.getElementById('toggle-text');

  if (toggleText) {
    toggleText.textContent = isExpanded ? 'Hide Details' : 'Show Details';
  }
  sectionsExpanded = isExpanded;
}

function updateTimerStatusLabel(status) {
  const label = document.getElementById('timer-status-label');
  if (!label) return;

  label.classList.remove('timer-status--firing', 'timer-status--held');

  switch (status) {
    case 'firing':
      label.textContent = 'Firing';
      label.classList.add('timer-status--firing');
      break;
    case 'held':
      label.textContent = 'Held';
      label.classList.add('timer-status--held');
      break;
    default:
      label.textContent = 'Mise en Place';
  }
}

function showTimerRunning() {
  document.getElementById('timer-status').classList.remove('hidden');
  document.getElementById('start-btn').classList.add('hidden');
  document.getElementById('pause-btn').classList.remove('hidden');
  document.getElementById('resume-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');

  updateTimerStatusLabel('firing');

  // Show countdowns on step cards
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.remove('hidden');
  });
  document.querySelectorAll('.step-time').forEach(el => {
    el.classList.add('hidden');
  });
}

function showTimerPaused() {
  document.getElementById('timer-status').classList.remove('hidden');
  document.getElementById('start-btn').classList.add('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('resume-btn').classList.remove('hidden');
  document.getElementById('reset-btn').classList.remove('hidden');

  updateTimerStatusLabel('held');

  // Show countdowns on step cards
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.remove('hidden');
  });
  document.querySelectorAll('.step-time').forEach(el => {
    el.classList.add('hidden');
  });
}

function showTimerStopped() {
  document.getElementById('timer-status').classList.add('hidden');
  document.getElementById('start-btn').classList.remove('hidden');
  document.getElementById('pause-btn').classList.add('hidden');
  document.getElementById('resume-btn').classList.add('hidden');
  document.getElementById('reset-btn').classList.add('hidden');

  updateTimerStatusLabel('ready');

  // Hide countdowns, show static times
  document.querySelectorAll('.step-countdown').forEach(el => {
    el.classList.add('hidden');
  });
  document.querySelectorAll('.step-time').forEach(el => {
    el.classList.remove('hidden');
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

  document.querySelectorAll('.step-ticket').forEach(card => {
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

    // Update ticket state classes
    card.classList.remove('step-ticket--waiting', 'step-ticket--firing', 'step-ticket--done', 'step-ticket--next');

    if (remainingMinutes <= 0) {
      // Step is active now
      countdownEl.textContent = 'Now';
      countdownEl.classList.add('step-countdown--done');
      card.classList.add('step-ticket--done');
    } else {
      const remainingSeconds = Math.floor(remainingMinutes * 60);
      countdownEl.textContent = 'T-' + formatTime(remainingSeconds);
      countdownEl.classList.remove('step-countdown--done');
      card.classList.add('step-ticket--waiting');
    }
  });

  // Highlight next upcoming step
  highlightNextStep(elapsedMinutes);
}

function highlightNextStep(elapsedMinutes) {
  let nextStep = null;
  let minRemaining = Infinity;

  document.querySelectorAll('.step-ticket').forEach(card => {
    const startMinute = parseFloat(card.dataset.startMinute);
    const remaining = startMinute - elapsedMinutes;

    card.classList.remove('step-ticket--next', 'step-ticket--firing');

    if (remaining > 0 && remaining < minRemaining) {
      minRemaining = remaining;
      nextStep = card;
    }
  });

  if (nextStep) {
    nextStep.classList.add('step-ticket--next');
    // If very close (within 30 seconds), mark as firing
    if (minRemaining < 0.5) {
      nextStep.classList.add('step-ticket--firing');
    }
  }
}

function resetStepDisplays() {
  document.querySelectorAll('.step-ticket').forEach(card => {
    card.classList.remove('step-ticket--done', 'step-ticket--firing', 'step-ticket--next');
    card.classList.add('step-ticket--waiting');
    card.classList.remove('hidden');

    const countdownEl = card.querySelector('.step-countdown');
    if (countdownEl) {
      countdownEl.textContent = '--:--';
      countdownEl.classList.remove('step-countdown--done');
    }
  });

  // Re-mark first step as next
  const firstStep = document.querySelector('.step-ticket');
  if (firstStep) {
    firstStep.classList.remove('step-ticket--waiting');
    firstStep.classList.add('step-ticket--next');
  }
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
  const activeBtn = document.querySelector('.covers-btn--active');
  return activeBtn ? parseInt(activeBtn.dataset.value) : 4;
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
