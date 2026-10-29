/* =====================================================
   CONFIG - STORAGE KEYS & GLOBAL VARIABLES
   ===================================================== */

// Storage Keys
const DONORS_KEY = "bloodConnectDonors";
const REQUESTS_KEY = "bloodConnectRequests";
const USERS_KEY = "bloodConnectUsers";
const CONTACTS_KEY = "bloodConnectContacts";

// Global Variables
let donors = [];
let requests = [];
let users = [];

let currentWizardStep = 1;
const totalWizardSteps = 10;

let activeProfileDonorId = null;
let authMode = "login";
let currentRequestFilter = "all";
let currentMatchData = [];
let currentExplanationData = null;
let registrationStoppedForHealth = false;
let medicationDetailsOpen = false;