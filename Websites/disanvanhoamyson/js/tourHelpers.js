// tourHelpers.js
(function() {
    'use strict';
    
    // Đợi tour load xong
    function waitForTour(callback) {
        if (window.tour && window.tour._getRootPlayer) {
            callback();
        } else {
            setTimeout(() => waitForTour(callback), 100);
        }
    }
    
    waitForTour(function() {
        // Export ra global scope
        window.TourHelpers = {
            getCurrentMediaName: function() {
                const rootPlayer = window.tour._getRootPlayer();
                const mainViewer = rootPlayer.MainViewer;
                const currentMedia = rootPlayer.getActiveMediaWithViewer(mainViewer);
                return currentMedia.get('label');
            },
            
            getCurrentLanguage: function() {
                return window.tour.locManager.currentLocaleID;
            }
        };
        
        console.log('TourHelpers loaded ✓');
    });
})();