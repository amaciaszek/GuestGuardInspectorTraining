// GuestGuard Inspector Training progress configuration.
// The portal may override window.GG_PROGRESS_API before training-progress.js loads.
(function () {
  const defaults = {
    endpoint: '/api/training/progress',
    courseId: 'inspector-training',
    completionThreshold: 0.9,
    heartbeatSeconds: 15,
    credentials: 'include'
  };

  window.GG_PROGRESS_API = Object.assign(defaults, window.GG_PROGRESS_API || {});

  window.PART_DURATIONS = {
    '1-1': 299.7, '1-2': 378.1, '1-3': 384.9,
    '2-1': 250.3, '2-2': 312.7, '2-3': 363.7, '2-4': 276.7, '2-5': 429.6
  };

  window.SECTION_TIMINGS = {
    '1-1': { durations: [48.6, 28.0, 52.9, 91.5, 52.6, 24.9] },
    '1-2': { durations: [32.9, 345.1] },
    '1-3': { durations: [68.9, 35.8, 104.7, 22.4, 81.3, 32.0, 39.6] },
    '2-1': { durations: [50.6, 100.5, 98.1] },
    '2-2': { durations: [149.4, 162.8] },
    '2-3': { durations: [71.8, 139.2, 152.0] },
    '2-4': { durations: [130.2, 146.0] },
    '2-5': { durations: [159.5, 116.7, 153.0] }
  };

  window.calculateWeightedPercent = function (progress) {
    let total = 0, complete = 0;
    Object.keys(window.PART_DURATIONS).forEach(function (key) {
      const duration = window.PART_DURATIONS[key];
      const item = progress[key] || {};
      total += duration;
      complete += item.completed ? duration : Math.min(Number(item.maxTime) || 0, duration);
    });
    return total ? Math.round(complete / total * 100) : 0;
  };
}());
