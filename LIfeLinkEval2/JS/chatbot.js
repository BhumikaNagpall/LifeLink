/* =====================================================
   LIFELINK CHATBOT
   Rule-Based Chatbot
   ===================================================== */


const chatbotButton =
    document.getElementById("chatbotButton");

const chatbotWindow =
    document.getElementById("chatbotWindow");

const chatbotClose =
    document.getElementById("chatbotClose");

const chatbotInput =
    document.getElementById("chatbotInput");

const chatbotSend =
    document.getElementById("chatbotSend");

const chatbotMessages =
    document.getElementById("chatbotMessages");


/* =====================================================
   OPEN CHATBOT
   ===================================================== */

chatbotButton.addEventListener("click", function () {

    chatbotWindow.classList.add("active");

    chatbotInput.focus();

});


/* =====================================================
   CLOSE CHATBOT
   ===================================================== */

chatbotClose.addEventListener("click", function () {

    chatbotWindow.classList.remove("active");

});


/* =====================================================
   SEND MESSAGE
   ===================================================== */

function sendChatMessage() {

    const message =
        chatbotInput.value.trim();

    if (message === "") {
        return;
    }


    /* Display user message */

    addMessage(message, "user");


    /* Clear input */

    chatbotInput.value = "";


    /* Get bot response */

    const response =
        getBotResponse(message);


    /* Display bot response */

    setTimeout(function () {

        addMessage(response, "bot");

    }, 400);

}


/* =====================================================
   ENTER KEY
   ===================================================== */

chatbotInput.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {

        sendChatMessage();

    }

});


/* =====================================================
   SEND BUTTON
   ===================================================== */

chatbotSend.addEventListener("click", function () {

    sendChatMessage();

});


/* =====================================================
   ADD MESSAGE
   ===================================================== */

function addMessage(message, type) {

    const messageDiv =
        document.createElement("div");


    if (type === "user") {

        messageDiv.className =
            "user-message";

    } else {

        messageDiv.className =
            "bot-message";

    }


    messageDiv.textContent =
        message;


    chatbotMessages.appendChild(
        messageDiv
    );


    /* Automatically scroll down */

    chatbotMessages.scrollTop =
        chatbotMessages.scrollHeight;

}


/* =====================================================
   BOT RESPONSE
   ===================================================== */

function getBotResponse(message) {

    const text =
        message.toLowerCase();


    /* Registration */

    if (
        text.includes("register") ||
        text.includes("registration") ||
        text.includes("donate")
    ) {

        return "To become a donor, open the Register Wizard from the navigation menu and complete the registration steps. We will check your eligibility before registering you.";

    }


    /* Blood request */

    if (
        text.includes("request") ||
        text.includes("need blood") ||
        text.includes("blood needed")
    ) {

        return "If you need blood, open the Requests section and create a blood request with the required blood group, location and urgency.";

    }


    /* Smart Matcher */

    if (
        text.includes("match") ||
        text.includes("matcher") ||
        text.includes("find donor")
    ) {

        return "Our Smart Matcher finds compatible donors based on blood group, donor eligibility, location and request urgency.";

    }


    /* Blood compatibility */

    if (
        text.includes("compatible") ||
        text.includes("blood group") ||
        text.includes("blood type")
    ) {

        return "BloodConnect checks blood-group compatibility before suggesting donors. You can use the Smart Matcher to find compatible donors.";

    }


    /* Donor */

    if (
        text.includes("donor") ||
        text.includes("donors")
    ) {

        return "You can view available donors from the Donors section. Donor eligibility and compatibility are considered before matching.";

    }


    /* Dashboard */

    if (
        text.includes("dashboard") ||
        text.includes("home")
    ) {

        return "The Dashboard gives you an overview of donors, blood requests and matching activity.";

    }


    /* Contact */

    if (
        text.includes("contact") ||
        text.includes("message") ||
        text.includes("help")
    ) {

        return "You can contact the LifeLink team through the Contact section. Messages submitted there can be viewed in the Messages section.";

    }


    /* About */

    if (
        text.includes("what is lifelink") ||
        text.includes("what is bloodconnect") ||
        text.includes("about")
    ) {

        return "LifeLink is a smart blood matching platform designed to connect eligible blood donors with patients and urgent blood requests.";

    }


    /* Greetings */

    if (
        text.includes("hello") ||
        text.includes("hi") ||
        text.includes("hey")
    ) {

        return "Hello! 👋 How can I help you with LifeLink today?";

    }


    /* Default */

    return "I'm still learning! You can ask me about donor registration, blood requests, Smart Matcher, donors, blood compatibility or contacting us.";

}