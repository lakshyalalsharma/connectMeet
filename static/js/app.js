
/* ============================================================
   CONNECTMEET - HOMEPAGE JAVASCRIPT
   ============================================================ */

const joinMeetingForm = document.getElementById("joinMeetingForm");
const meetingCodeInput = document.getElementById("meetingCode");

const createMeetingBtn = document.getElementById("createMeetingBtn");
const createMeetingBtnCta = document.getElementById("createMeetingBtnCta");

const meetingError = document.getElementById("meetingError");

const meetingCreatedModal = document.getElementById("meetingCreatedModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");

const createdRoomCode = document.getElementById("createdRoomCode");
const meetingLink = document.getElementById("meetingLink");

const copyMeetingLinkBtn = document.getElementById("copyMeetingLinkBtn");
const copyMessage = document.getElementById("copyMessage");

const joinCreatedMeetingBtn =
    document.getElementById("joinCreatedMeetingBtn");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

const scrollToMeeting = document.getElementById("scrollToMeeting");

let currentRoomCode = null;
let currentRoomUrl = null;


/* ============================================================
   ERROR HANDLING
   ============================================================ */

function showMeetingError(message) {
    if (!meetingError) return;

    meetingError.textContent = message;
    meetingError.hidden = false;
}

function hideMeetingError() {
    if (!meetingError) return;

    meetingError.textContent = "";
    meetingError.hidden = true;
}


/* ============================================================
   MEETING CODE
   ============================================================ */

function normalizeMeetingCode(code) {
    return code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

if (meetingCodeInput) {
    meetingCodeInput.addEventListener("input", function () {
        hideMeetingError();

        const cleanedValue = this.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

        this.value = cleanedValue.slice(0, 6);
    });
}


/* ============================================================
   JOIN EXISTING MEETING
   ============================================================ */

if (joinMeetingForm) {
    joinMeetingForm.addEventListener("submit", function (event) {
        event.preventDefault();

        hideMeetingError();

        const roomCode =
            normalizeMeetingCode(meetingCodeInput.value);

        if (!roomCode) {
            showMeetingError("Please enter a meeting code.");
            meetingCodeInput.focus();
            return;
        }

        if (roomCode.length !== 6) {
            showMeetingError(
                "Meeting code must contain 6 characters."
            );
            meetingCodeInput.focus();
            return;
        }

        window.location.href =
            `/join/${encodeURIComponent(roomCode)}`;
    });
}


/* ============================================================
   CREATE INSTANT MEETING
   ============================================================ */

async function createMeeting() {
    hideMeetingError();

    const buttons = [
        createMeetingBtn,
        createMeetingBtnCta
    ];

    buttons.forEach(function (button) {
        if (!button) return;

        button.disabled = true;
        button.dataset.originalText = button.innerHTML;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i>' +
            '<span>Creating...</span>';
    });

    try {
        const response = await fetch("/create-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Unable to create meeting.");
        }

        const data = await response.json();

        if (!data.success || !data.room_code) {
            throw new Error(
                data.message || "Unable to create meeting."
            );
        }

        currentRoomCode = data.room_code;

        currentRoomUrl = new URL(
            data.room_url,
            window.location.origin
        ).href;

        openMeetingModal(
            currentRoomCode,
            currentRoomUrl
        );

    } catch (error) {
        console.error("Create meeting error:", error);

        showMeetingError(
            error.message ||
            "Something went wrong while creating the meeting."
        );

    } finally {
        buttons.forEach(function (button) {
            if (!button) return;

            button.disabled = false;

            if (button.dataset.originalText) {
                button.innerHTML =
                    button.dataset.originalText;
            }
        });
    }
}


/* ============================================================
   CREATE BUTTON EVENTS
   ============================================================ */

if (createMeetingBtn) {
    createMeetingBtn.addEventListener(
        "click",
        createMeeting
    );
}

if (createMeetingBtnCta) {
    createMeetingBtnCta.addEventListener(
        "click",
        createMeeting
    );
}


/* ============================================================
   MEETING CREATED MODAL
   ============================================================ */

function openMeetingModal(roomCode, roomUrl) {
    if (!meetingCreatedModal) return;

    if (createdRoomCode) {
        createdRoomCode.textContent = roomCode;
    }

    if (meetingLink) {
        meetingLink.value = roomUrl;
    }

    if (copyMessage) {
        copyMessage.textContent = "";
    }

    meetingCreatedModal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeMeetingModal() {
    if (!meetingCreatedModal) return;

    meetingCreatedModal.hidden = true;
    document.body.style.overflow = "";
}

if (closeModalBtn) {
    closeModalBtn.addEventListener(
        "click",
        closeMeetingModal
    );
}

if (modalOverlay) {
    modalOverlay.addEventListener(
        "click",
        closeMeetingModal
    );
}

document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        meetingCreatedModal &&
        !meetingCreatedModal.hidden
    ) {
        closeMeetingModal();
    }
});


/* ============================================================
   COPY MEETING LINK
   ============================================================ */

async function copyMeetingLink() {
    if (!meetingLink) return;

    const link = meetingLink.value.trim();

    if (!link) return;

    try {
        await navigator.clipboard.writeText(link);
        showCopySuccess();

    } catch (error) {
        console.warn(
            "Clipboard API failed. Trying fallback.",
            error
        );

        meetingLink.focus();
        meetingLink.select();

        const copied =
            document.execCommand("copy");

        if (copied) {
            showCopySuccess();
        } else if (copyMessage) {
            copyMessage.textContent =
                "Copy failed. Please copy the link manually.";

            copyMessage.style.color = "#dc2626";
        }
    }
}

function showCopySuccess() {
    if (copyMessage) {
        copyMessage.textContent =
            "Meeting link copied!";

        copyMessage.style.color = "#10b981";
    }

    if (copyMeetingLinkBtn) {
        const originalIcon =
            copyMeetingLinkBtn.innerHTML;

        copyMeetingLinkBtn.innerHTML =
            '<i class="fa-solid fa-check"></i>';

        setTimeout(function () {
            copyMeetingLinkBtn.innerHTML =
                originalIcon;
        }, 1500);
    }
}

if (copyMeetingLinkBtn) {
    copyMeetingLinkBtn.addEventListener(
        "click",
        copyMeetingLink
    );
}


/* ============================================================
   JOIN CREATED MEETING
   ============================================================ */

if (joinCreatedMeetingBtn) {
    joinCreatedMeetingBtn.addEventListener(
        "click",
        function () {
            if (!currentRoomUrl) {
                showMeetingError(
                    "Meeting link is not available."
                );
                return;
            }

            window.location.href =
                currentRoomUrl;
        }
    );
}


/* ============================================================
   MOBILE MENU
   ============================================================ */

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener(
        "click",
        function () {
            const isOpen =
                mobileMenu.classList.toggle("active");

            const icon =
                mobileMenuBtn.querySelector("i");

            if (!icon) return;

            if (isOpen) {
                icon.classList.remove("fa-bars");
                icon.classList.add("fa-xmark");

                mobileMenuBtn.setAttribute(
                    "aria-label",
                    "Close navigation menu"
                );
            } else {
                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");

                mobileMenuBtn.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );
            }
        }
    );
}


/* ============================================================
   CLOSE MOBILE MENU AFTER LINK CLICK
   ============================================================ */

if (mobileMenu) {
    const mobileLinks =
        mobileMenu.querySelectorAll("a");

    mobileLinks.forEach(function (link) {
        link.addEventListener(
            "click",
            function () {
                mobileMenu.classList.remove("active");

                const icon =
                    mobileMenuBtn?.querySelector("i");

                if (icon) {
                    icon.classList.remove("fa-xmark");
                    icon.classList.add("fa-bars");
                }

                if (mobileMenuBtn) {
                    mobileMenuBtn.setAttribute(
                        "aria-label",
                        "Open navigation menu"
                    );
                }
            }
        );
    });
}


/* ============================================================
   START A MEETING LINK
   ============================================================ */

if (scrollToMeeting) {
    scrollToMeeting.addEventListener(
        "click",
        function (event) {
            event.preventDefault();

            const meetingCard =
                document.querySelector(
                    ".cm-meeting-card"
                );

            if (!meetingCard) return;

            meetingCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            setTimeout(function () {
                if (meetingCodeInput) {
                    meetingCodeInput.focus();
                }
            }, 500);
        }
    );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        console.log(
            "ConnectMeet homepage initialized."
        );
    }
);