function toggleDropdown(div) {
    div.nextElementSibling.classList.toggle("is-hidden");
}

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