try {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
    var isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.indexOf('192.168.') === 0 ||
                window.location.port === '3000' ||
                window.location.port === '5000';
                
    if (isDev) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        if (registrations && registrations.length) {
          for (var i = 0; i < registrations.length; i++) {
            (function(reg) {
              if (!reg || typeof reg.unregister !== 'function') return;
              // Keep dev Service Worker registered if an active Web Push test subscription exists
              // (sw.js already bypasses all fetch caching on localhost / port 3000 / port 5000).
              if (reg.pushManager && typeof reg.pushManager.getSubscription === 'function') {
                reg.pushManager.getSubscription().then(function(sub) {
                  if (sub) {
                    console.log('Preserving dev service worker for active push subscription');
                    return;
                  }
                  reg.unregister().then(function(success) {
                    if (success) console.log('Successfully unregistered dev service worker');
                  }).catch(function(e) {
                    console.warn('Failed to unregister dev service worker:', e);
                  });
                }).catch(function() {
                  reg.unregister().catch(function() {});
                });
              } else {
                reg.unregister().then(function(success) {
                  if (success) console.log('Successfully unregistered dev service worker');
                }).catch(function(e) {
                  console.warn('Failed to unregister dev service worker:', e);
                });
              }
            })(registrations[i]);
          }
        }
      }).catch(function(err) {
        console.warn('Failed to get service worker registrations:', err);
      });

      if (typeof window.caches !== 'undefined' && window.caches && window.caches.keys) {
        window.caches.keys().then(function(keys) {
          keys.forEach(function(key) {
            window.caches.delete(key);
          });
          console.log('Successfully cleared dev cache storage');
        }).catch(function(e) {
          console.warn('Failed to clear dev cache storage:', e);
        });
      }
    } else {
      var registerSW = function() {
        try {
          if (navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function') {
            navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function(err) {
              console.log('ServiceWorker registration failed: ', err);
            });
          }
        } catch (swErr) {
          console.warn('ServiceWorker registration blocked by sandbox:', swErr);
        }
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW();
      } else {
        document.addEventListener('DOMContentLoaded', registerSW);
      }
    }
  }
} catch (globalErr) {
  console.warn('PWA service worker registration guard caught error:', globalErr);
}
