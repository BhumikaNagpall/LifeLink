# 🩸 LifeLink - Smart Blood Donation & Donor Matching System

> *"Every donor can save a life today."*

---

## 📖 **About the Project**

**LifeLink** is a JavaScript-based smart blood donation and donor matching platform designed to simplify the process of finding compatible blood donors. The system uses an algorithmic matching approach to connect eligible blood donors with patients in need, ensuring quick and accurate donor discovery during critical moments.

Unlike traditional manual searching methods, LifeLink provides a structured, rule-driven matching experience that considers blood compatibility, donor eligibility, location proximity, and urgency priority.

---

## 🎯 **Purpose of the Project**

| Challenge | How LifeLink Solves It |
|-----------|----------------------|
| **Manual Searching** | Provides structured donor directory with search & filter |
| **Eligibility Uncertainty** | Automatically checks age, weight, health & cooldown |
| **Urgent Delays** | Prioritizes Emergency requests with bonus scoring |
| **No Prioritization** | Ranks donors by weighted score (compatibility + eligibility + location + urgency) |
| **Location Blind** | Evaluates donor zones for proximity matching |
| **History Gaps** | Tracks donation history with 90-day cooldown enforcement |

---

## ✨ **Key Features & How to Use Them**

### 1. **Dashboard (Home Page)**

**What it does:**
- Displays an overview of the entire system
- Shows statistics like total donors, eligible donors, total requests, emergency requests
- Shows blood group distribution and zone statistics
- Displays active blood requests

**How to use:**
- Navigate to Dashboard using the "🏠 Dashboard" button in the navigation bar
- View all statistics at a glance
- Click on any active request to find donors for it

---

### 2. **Donor Registration Wizard**

**What it does:**
- 10-step progressive form to register a new donor
- Captures personal information, health details, blood group, and donation history
- Has conditional logic to skip irrelevant questions

**How to use:**
1. Click "📝 Register Wizard" in the navigation bar
2. Answer all 10 questions:
   - **Question 1:** Is this your first time donating blood? (Yes/No)
   - **Question 2:** Are you currently feeling healthy? (Yes/No)
     - If "No" → Registration stops (paused screen appears)
   - **Question 3:** Enter your height and weight (weight must be ≥45kg)
   - **Question 4:** Enter your age (must be between 18-75)
   - **Question 5:** Select your blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
   - **Question 6:** Have you donated blood before? (Yes/No)
     - If "No" → Question 7 is skipped
   - **Question 7:** When was your last donation date? (Only if "Yes" to Q6)
   - **Question 8:** Do you have any medical condition? (Yes/No)
   - **Question 9:** Are you taking medication? (Yes/No)
     - If "Yes" → Medication details appear
   - **Question 10:** Enter your Name, Phone, Zone, and accept consent
3. Click "Complete Registration" to save the donor

---

### 3. **Donors Page (Donor Directory)**

**What it does:**
- Displays all registered donors in card format
- Shows donor name, blood group, age, weight, zone, and eligibility status
- Allows searching and filtering

**How to use:**
1. Click "👥 Donors" in the navigation bar
2. Use the search bar to find a donor by name
3. Use filters to narrow down by:
   - Blood Group (A+, A-, B+, etc.)
   - Zone (Zone A, B, C, D)
   - Eligibility Status (Eligible, Cooldown)
4. Click on any donor card to view their full profile

---

### 4. **Donor Profile (Modal)**

**What it does:**
- Shows complete donor details in a popup
- Displays eligibility status with cooldown timer
- Shows donation history
- Allows deleting the donor

**How to use:**
1. Click on any donor card in the Donors page
2. View donor details:
   - Blood Group, Age, Zone, Weight, Height, Phone
   - Eligibility Status (Eligible/Not Eligible)
   - Donation History with dates
3. Options available:
   - **Close Window** - Close the profile
   - **Delete Profile** - Permanently delete the donor
   - **Contact Donor** - View donor contact details

---

### 5. **Blood Requests**

**What it does:**
- Allows users to create blood requests
- Displays requests sorted by priority (Emergency → Urgent → Normal)
- Enables finding donors for each request
- Allows deleting completed requests

**How to use:**
1. Click "📋 Requests" in the navigation bar
2. **To create a request:**
   - Click "+ Create New Request"
   - Fill in:
     - Patient Name
     - Required Blood Group
     - Hospital Zone
     - Priority Level (Emergency/Urgent/Normal)
   - Click "Broadcast Request"
3. **Filter requests** by clicking priority buttons:
   - All Priority Levels
   - 🚨 Emergency
   - 🔴 Urgent
   - 🟢 Normal
4. **For each request, you can:**
   - Click "🔍 Find Donors" → Redirects to Smart Matcher
   - Click "🗑️ Delete" → Removes the request

---

### 6. **Smart Matcher (Matching Algorithm)**

**What it does:**
- Finds compatible donors based on blood group, eligibility, location, and urgency
- Calculates a weighted score for each donor
- Ranks donors from best match to least match
- Auto-scrolls to results after execution

**How to use:**
1. Click "🔎 Smart Matcher" in the navigation bar
2. Fill in all fields:
   - **Patient Name** (e.g., Vikram Malhotra)
   - **Required Blood Group** (A+, A-, B+, etc.)
   - **Patient Location Zone** (Zone A, B, C, D)
   - **Request Priority** (Emergency/Urgent/Normal)
   - **Required Units** (1-10 pints)
3. Click "⚡ Execute Smart Matching Algorithm"
4. Results appear with:
   - Number of compatible donors found
   - Best match highlighted with 🏆
   - Score breakdown for each donor
   - "Why Matched?" button for explanation
   - "Contact Donor" button to view donor details

---

### 7. **Contact & Messages**

**What it does:**
- Allows users to send support messages
- Displays all messages in a scrollable list
- Allows deleting messages

**How to use:**
1. Click "📩 Contact" in the navigation bar
2. **To send a message:**
   - Fill in:
     - Name
     - Email
     - Subject
     - Message
   - Click "Send Message"
   - Message appears in the messages list below
3. **To delete a message:**
   - Click the 🗑 button next to any message
   - Confirm deletion

---

### 8. **Chatbot Assistant (LifeLink Assistant)**

**What it does:**
- Provides automated responses to user questions
- Helps users navigate the platform

**How to use:**
1. Click the 💬 button in the bottom-right corner
2. Type your question and press Enter or click ➤
3. The chatbot responds with helpful information

**What you can ask:**
- "How to register?" → Explains registration process
- "Need blood" → Explains how to create a request
- "Match donor" → Explains Smart Matcher
- "Blood compatibility" → Explains compatibility rules
- "Hello" → Greets you back
- "About" → Tells about LifeLink

---

### 9. **Data Management**

**What it does:**
- Export all data as JSON file
- Import data from JSON file

**How to use:**
1. Go to Dashboard
2. Scroll to "📦 Data Management" card
3. **To Export:**
   - Click "📤 Export Data"
   - A JSON file downloads with all donors, requests, and users
4. **To Import:**
   - Click "📥 Import Data"
   - Select a previously exported JSON file
   - Confirm the import
   - Data is restored

---
## 🚀 **Installation & Setup**

### Prerequisites
- Any modern web browser (Chrome, Firefox, Edge, Safari)
- No server or internet connection required (runs locally)

### Step-by-Step Setup

1. **Clone or Download** the project
   ```bash
   git clone https://github.com/BhumikaNagpall/LifeLink.git
Or download the ZIP file and extract it.

Navigate to the project folder

bash
cd LifeLink
Open index.html in your browser

bash
# Method 1: Double-click the file
# Method 2: Right-click → Open with → Your browser
# Method 3: Command line
open index.html        # Mac
start index.html       # Windows
Start using the application!