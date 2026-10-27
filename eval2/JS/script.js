/* =====================================================
   BLOODCONNECT - MAIN SCRIPT
   ===================================================== */

document.addEventListener("DOMContentLoaded", function() {
    // Load data from localStorage
    loadData();
    
    // Initialize all components
    initializeAuthentication();
    initializeNavigation();
    initializeFilters();
    initializeForms();
    initializeModals();
    initializeWizard();
    initializeHealthQuestion();
    
    // Display all data
    updateDashboard();
    loadDonorsFromBackend();
    loadRequestsFromBackend();
    displayMessages();
    
});
