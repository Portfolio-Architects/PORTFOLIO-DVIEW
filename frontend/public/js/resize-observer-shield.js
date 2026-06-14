(function() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function(e) {
      if (e && (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.' || (e.reason && e.reason.message && e.reason.message.includes('ResizeObserver')))) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    });
  }
})();
