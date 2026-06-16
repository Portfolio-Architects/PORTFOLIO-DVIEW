if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
  try {
    var isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.indexOf('192.168.') === 0 ||
                window.location.port === '3000' ||
                window.location.port === '5000';
                
    if (isDev) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        if (registrations && registrations.length) {
          for (var i = 0; i < registrations.length; i++) {
            if (registrations[i] && typeof registrations[i].unregister === 'function') {
              registrations[i].unregister().then(function(success) {
                if (success) console.log('Successfully unregistered dev service worker');
              }).catch(function(e) {
                console.warn('Failed to unregister dev service worker:', e);
              });
            }
          }
        }
      }).catch(function(err) {
        console.warn('Failed to get service worker registrations:', err);
      });
    } else {
      var registerSW = function() {
        if (navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function') {
          navigator.serviceWorker.register('/sw.js').catch(function(err) {
            console.log('ServiceWorker registration failed: ', err);
          });
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }
  } catch (globalErr) {
    console.warn('PWA service worker registration guard caught error:', globalErr);
  }
}
