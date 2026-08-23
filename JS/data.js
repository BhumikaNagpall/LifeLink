/* =====================================================
   DATA - LOAD & SAVE
   ===================================================== */

function loadData() {
    try {
        donors = JSON.parse(localStorage.getItem(DONORS_KEY)) || [];
    } catch (error) {
        donors = [];
    }

    try {
        requests = JSON.parse(localStorage.getItem(REQUESTS_KEY)) || [];
    } catch (error) {
        requests = [];
    }

    try {
        users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (error) {
        users = [];
    }
}

function saveDonors() {
    localStorage.setItem(DONORS_KEY, JSON.stringify(donors));
}

function saveRequests() {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

function saveUsers() {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}