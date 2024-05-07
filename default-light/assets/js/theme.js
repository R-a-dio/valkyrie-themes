// Clear navbar search if it loses focus. There's probably a better way to do this.
function clearNavbarSearchValue(event) {
    parent = document.getElementById("search-bar");
    originalTarget = event.target;

    document.getElementById("content").addEventListener("click", (e) => {
        if (!parent.contains(e.target)) {
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
    if (url.pathname === "/help") {
        let other_div = htmx.find((target.id === "#stream-help") ? "#song-submission-guidelines" : "#stream-help");
        htmx.addClass(other_div, "is-hidden-mobile");
        htmx.removeClass(target, "is-hidden-mobile");
    }
    showHighlightAnimation(target, button);
}

function showHighlightAnimation(target, button) {
    if (typeof button === "undefined") {
        if (window.innerWidth >= 769) {
            Array.from(target.children).forEach(element => {
                htmx.addClass(element, "is-targeted");
            });
        }
    }
}

// Needed to display the right help page for mobile users
htmx.onLoad((event) => {
    url = window.location;
    if (url.pathname.startsWith("/help") || url.pathname.startsWith("/staff")) {
        if (url.hash !== "") {
            toggleHelpDisplay()
        }
    } else if (url.pathname.startsWith("/news")) {
        counter1 = document.getElementById("news-comment-character-counter-1");
        counter2 = document.getElementById("news-comment-character-counter-2");
    
        input1 = document.getElementById("news-comment-input-1");
        input2 = document.getElementById("news-comment-input-2");
    }
})

function countNewsInputCharacters(event) {
    target = event.target;

    counter1.innerHTML = 500 - target.textLength;
    counter2.innerHTML = 500 - target.textLength;

    if (target === input1) {
        input2.value = input1.value;
    } else {
        input1.value = input2.value;
    }
}

htmx.onLoad((event) => {
    // Functions to open and close a modal
    function openModal($el) {
      $el.classList.add('is-active');
    }
  
    function closeModal($el) {
      $el.classList.remove('is-active');
    }
  
    function closeAllModals() {
      (document.querySelectorAll('.modal') || []).forEach(($modal) => {
        closeModal($modal);
      });
    }
  
    // Add a click event on buttons to open a specific modal
    (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
      const modal = $trigger.dataset.target;
      const $target = document.getElementById(modal);
  
      $trigger.addEventListener('click', () => {
        openModal($target);
      });
    });
  
    // Add a click event on various child elements to close the parent modal
    (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot .button') || []).forEach(($close) => {
      const $target = $close.closest('.modal');
  
      $close.addEventListener('click', () => {
        closeModal($target);
      });
    });
  
    // Add a keyboard event to close all modals
    document.addEventListener('keydown', (event) => {
      if(event.key === "Escape") {
        closeAllModals();
      }
    });
  });