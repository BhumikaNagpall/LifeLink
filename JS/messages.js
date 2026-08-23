/* =====================================================
   MESSAGES - CONTACT FORM & MESSAGES
   ===================================================== */

/* =====================================================
   CONTACT FORM + MESSAGES DISPLAY
   ===================================================== */

function handleContactForm(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "contactName"
        )?.value.trim() || "";

    const email =
        document.getElementById(
            "contactEmail"
        )?.value.trim() || "";

    const subject =
        document.getElementById(
            "contactSubject"
        )?.value.trim() || "";

    const message =
        document.getElementById(
            "contactMessage"
        )?.value.trim() || "";


    if (
        !name ||
        !email ||
        !subject ||
        !message
    ) {

        const messageElement =
            document.getElementById(
                "contactFormMessage"
            );

        if (messageElement) {

            messageElement.textContent =
                "⚠️ Please fill all required fields.";

            messageElement.className =
                "form-success-message error";

        }

        return;

    }


    let contacts = [];


    try {

        contacts =
            JSON.parse(
                localStorage.getItem(
                    CONTACTS_KEY
                )
            ) || [];

    } catch (error) {

        contacts = [];

    }


    contacts.push({

        id:
            "MSG-" +
            Date.now(),

        name:
            name,

        email:
            email,

        subject:
            subject,

        message:
            message,

        createdAt:
            new Date().toISOString()

    });


    localStorage.setItem(
        CONTACTS_KEY,
        JSON.stringify(
            contacts
        )
    );


    const messageElement =
        document.getElementById(
            "contactFormMessage"
        );


    if (messageElement) {

        messageElement.textContent =
            "✓ Message sent successfully!";

        messageElement.className =
            "form-success-message success";

    }


    event.target.reset();


    // Display messages immediately
    displayMessages();


    // Scroll to messages section
    const messagesSection =
        document.querySelector(
            ".messages-section"
        );


    if (messagesSection) {

        messagesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    // Clear success message after 4 seconds
    setTimeout(
        () => {

            if (messageElement) {

                messageElement.textContent =
                    "";

                messageElement.className =
                    "form-success-message";

            }

        },
        4000
    );

}


/* =====================================================
   DISPLAY MESSAGES (SCROLLABLE LIST)
   ===================================================== */

/* =====================================================
   DISPLAY MESSAGES (SCROLLABLE LIST)
   ===================================================== */

function displayMessages() {

    const container =
        document.getElementById(
            "messagesList"
        );


    if (!container) return;


    let contacts = [];


    try {

        contacts =
            JSON.parse(
                localStorage.getItem(
                    CONTACTS_KEY
                )
            ) || [];

    } catch (error) {

        contacts = [];

    }


    const count =
        document.getElementById(
            "messageResultCount"
        );


    if (count) {

        count.textContent =
            `${contacts.length} message${
                contacts.length === 1
                    ? ""
                    : "s"
            }`;

    }


    if (
        contacts.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No contact messages found.
            </div>
        `;

        return;

    }


    // Sort newest first
    const sorted =
        [...contacts]
            .sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );


    container.innerHTML =
        sorted
            .map(
                contact => `

                    <div class="message-card" id="msg-${escapeHTML(
                        contact.id
                    )}">

                        <div class="message-header">

                            <div>

                                <span class="message-label">
                                    MESSAGE
                                </span>

                                <h3>
                                    ${escapeHTML(
                                        contact.subject
                                    )}
                                </h3>

                            </div>

                            <div style="display:flex;align-items:center;gap:8px;">

                                <span class="message-id">
                                    ${escapeHTML(
                                        contact.id
                                    )}
                                </span>

                                <button 
                                    class="delete-message-btn" 
                                    onclick="deleteMessage('${escapeHTML(
                                        contact.id
                                    )}')"
                                    title="Delete this message"
                                >
                                    🗑
                                </button>

                            </div>

                        </div>


                        <div class="message-details">

                            <div>

                                <strong>
                                    From
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        contact.name
                                    )}
                                </span>

                            </div>


                            <div>

                                <strong>
                                    Email
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        contact.email
                                    )}
                                </span>

                            </div>


                            <div>

                                <strong>
                                    Date
                                </strong>

                                <span>
                                    ${formatDate(
                                        contact.createdAt
                                    )}
                                </span>

                            </div>

                        </div>


                        <div class="message-content">

                            <strong>
                                Message
                            </strong>

                            <p>
                                ${escapeHTML(
                                    contact.message
                                )}
                            </p>

                        </div>

                    </div>

                `
            )
            .join("");

}


/* =====================================================
   DELETE MESSAGE
   ===================================================== */

function deleteMessage(messageId) {

    if (!messageId) return;


    // Find the message in localStorage
    let contacts = [];


    try {

        contacts =
            JSON.parse(
                localStorage.getItem(
                    CONTACTS_KEY
                )
            ) || [];

    } catch (error) {

        contacts = [];

    }


    // Find the message to show in confirmation
    const messageToDelete =
        contacts.find(
            contact =>
                String(contact.id) ===
                String(messageId)
        );


    if (!messageToDelete) {

        return;

    }


    // Confirm deletion
    const confirmed =
        confirm(
            `Delete message "${messageToDelete.subject}" from ${messageToDelete.name}?`
        );


    if (!confirmed) return;


    // Filter out the deleted message
    contacts =
        contacts.filter(
            contact =>
                String(contact.id) !==
                String(messageId)
        );


    // Save back to localStorage
    localStorage.setItem(
        CONTACTS_KEY,
        JSON.stringify(
            contacts
        )
    );


    // Update the messages display
    displayMessages();


    // Update the count
    const count =
        document.getElementById(
            "messageResultCount"
        );


    if (count) {

        count.textContent =
            `${contacts.length} message${
                contacts.length === 1
                    ? ""
                    : "s"
            }`;

    }

}