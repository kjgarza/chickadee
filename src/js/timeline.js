// Timeline calculations and rendering
const TimelineManager = {
  calculateAbsoluteTime(startTime, startMinute) {
    return startTime + (startMinute * 60000);
  },

  getUpcomingSteps(timeline, elapsedMinutes) {
    return timeline
      .filter(item => {
        if (item.type === 'action') {
          return item.startMinute > elapsedMinutes;
        } else if (item.type === 'parallel') {
          return item.startMinute > elapsedMinutes;
        }
        return false;
      })
      .sort((a, b) => a.startMinute - b.startMinute);
  },

  getNextStep(timeline, elapsedMinutes) {
    const upcoming = this.getUpcomingSteps(timeline, elapsedMinutes);
    return upcoming.length > 0 ? upcoming[0] : null;
  },

  getCurrentStep(timeline, elapsedMinutes) {
    let current = null;
    
    for (const item of timeline) {
      if (item.type === 'action') {
        if (item.startMinute <= elapsedMinutes) {
          const endMinute = item.startMinute + (item.durationMinutes || 0);
          if (endMinute > elapsedMinutes) {
            current = item;
          }
        }
      }
    }
    
    return current;
  },

  formatTimeOfDay(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  getCriticalPathSteps(timeline) {
    const steps = [];
    
    for (const item of timeline) {
      if (item.type === 'action' && item.isCriticalPath) {
        steps.push(item);
      } else if (item.type === 'parallel') {
        for (const action of item.actions) {
          if (action.isCriticalPath) {
            steps.push(action);
          }
        }
      }
    }
    
    return steps.sort((a, b) => a.startMinute - b.startMinute);
  }
};

// Initialize timeline display if process data exists
function initTimeline(processData) {
  if (!processData || !processData.timeline) return;
  
  // Timeline is rendered server-side via Nunjucks
  // This function can be used for dynamic updates
  console.log('Timeline initialized with', processData.timeline.length, 'steps');
}
