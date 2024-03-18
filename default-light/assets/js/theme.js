// Clear navbar search if it loses focus. There's probably a better way to do this.
function clearNavbarSearchValue(event) {
    parent = document.getElementById("search-bar");
    originalTarget = event.originalTarget;

    document.getElementById("content").addEventListener("click", (e) => {
        if (!parent.contains(e.explicitOriginalTarget)) {
            originalTarget.value = "";
            htmx.trigger(originalTarget, "input");
            document.body.removeEventListener("click", this, true);
        }
    })
}

// Toggles dropdowns when you click queue, etc.
function toggleDropdown(div) {
    div.nextElementSibling.classList.toggle("is-hidden");
}

// Main page options dropdown toggle
function toggleOptionsDropdown() {
    document.getElementById("options-button-dropdown").classList.toggle("is-hidden");
}

// Help page switch for mobiles & highlight for desktop
function toggleHelpDisplay(button) {
    let target = htmx.find(window.location.hash);
    let other_div = htmx.find((target.id === "#stream-help") ? "#song-submission-guidelines" : "#stream-help");
    htmx.addClass(other_div, "is-hidden-mobile");
    htmx.removeClass(target, "is-hidden-mobile");

    if (typeof button === "undefined") {
        if (window.innerWidth >= 769) {
            Array.from(target.children).forEach(element => {
                element.style.border = "2px dashed rgba(255, 255, 255, 0.33)";
            });
        }
    }
}

// Needed to display the right help page for mobile users
htmx.onLoad((event) => {
    url = window.location;
    if (url.pathname === "/help") {
        if (url.hash !== "") {
            toggleHelpDisplay()
        }
    }
})