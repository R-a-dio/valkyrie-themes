// Clear navbar search if it loses focus. There's probably a better way to do this.
function clearNavbarSearchValue(event) {
    parent = document.getElementById("search-bar");
    originalTarget = event.target;

    document.getElementById("content").addEventListener("click", (e) => {
        if (!parent.contains(e.target)) {
            originalTarget.value = "";
            htmx.trigger(originalTarget, "input");
        }
    }, {once: true});
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

function preferencesResetNotifications() {
    Object.keys(localStorage)
    .filter(key => key.startsWith('notification-'))
    .forEach(key => localStorage.removeItem(key));

    unhideNotification('#preferences-notification-notifications-reset');
}

function unhideNotification (elementIdOrClass) {
    prefsNotification = document.querySelector(elementIdOrClass);
    prefsNotification.classList.toggle('is-hidden');
    prefsNotification.classList.toggle('fake-temporary-notification');
    setTimeout(() => {
        prefsNotification.classList.toggle('is-hidden');
    }, 6000)
}

function quotePost(postId) {
    const commentInput = document.getElementById('news-comment-input-2');
    let currentText = commentInput.value.trimEnd();
    const quoteText = '>>' + postId + '\n';
    
    // add newline before quote only if there's existing text and it doesn't end with a newline
    if (currentText) {
        if (!currentText.endsWith('\n')) {
            currentText += '\n';
        }
    }
    
    commentInput.value = currentText + quoteText;
    commentInput.focus();
    
    // cursor at the end of text
    const len = commentInput.value.length;
    commentInput.setSelectionRange(len, len);
}

// Needed to display the right help page for mobile users (and whatever else it does now)
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
    } else if (url.pathname === "/admin") {
        document.getElementById("daypass-timer").innerHTML = `Expires <time id="daypass-hours" datetime="${86400 + Math.floor(Date.now() / 1000 / 86400) * 86400}">at midnight</time>`
    } else if (url.pathname === "/admin/pending") {
        let adminPlayerVolume = localStorage.getItem("admin-player-volume");
        if (adminPlayerVolume) Array.from(document.getElementsByClassName("volume-input")).forEach((el) => el.value = adminPlayerVolume);
    } else if (url.pathname.startsWith("/admin/songs")) {
        let adminPlayerVolume = localStorage.getItem("admin-player-volume");
        if (adminPlayerVolume) Array.from(document.getElementsByClassName("volume-input")).forEach((el) => el.value = adminPlayerVolume);
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

function toggleState(element, stateA, stateB, options = { type: 'text', class: null, resetOthers: false }) {
    const currentState = element.dataset.state;
    const newState = currentState === stateA ? stateB : stateA;
    
    if (options.resetOthers && options.class) {
        document.querySelectorAll(`.${options.class}`).forEach(el => {
            if (el !== element) {
                if (options.type === 'icon') {
                    const iconEl = el.querySelector('use');
                    if (iconEl) {
                        const value = iconEl.getAttribute('href');
                        iconEl.setAttribute('href', value.replace(`#${el.dataset.state}`, `#${stateA}`));
                    }
                } else {
                    el.textContent = stateA;
                }
                el.dataset.state = stateA;
            }
        });
    }
    
    if (options.type === 'icon') {
        const iconElement = element.querySelector('use');
        if (iconElement) {
            const currentValue = iconElement.getAttribute('href');
            iconElement.setAttribute('href', currentValue.replace(`#${currentState}`, `#${newState}`));
        }
    } else {
        element.textContent = newState;
    }
    
    element.dataset.state = newState;
    return newState;
}

const toggleDropdown = (element, targetDiv = null, targetClass = "is-hidden", isLastChild = false) => {
    toggleState(element, 'plus', 'minus', options = {type: 'icon'});
    let dropdownParent = element.closest(".dropdown-parent");

    if (isLastChild) {
        dropdownParent.children[dropdownParent.children.length - 1].classList.toggle(targetClass);
    } else if (targetDiv === null) {
        dropdownParent.nextElementSibling.classList.toggle(targetClass);
    } else {
        document.getElementById(targetDiv).classList.toggle(targetClass);
    }
}

const togglePlayPauseAdmin = (element, songIdentifier) => {
    toggleState(element, "Play", "Pause", options = {class: "adminPlayerPlayPauseButton", resetOthers: true});

    if (this.url.pathname.startsWith("/admin/pending")) {
        adminPlayerPlayPause('/admin/pending-song/' + songIdentifier);
    } else {
        adminPlayerPlayPause(songIdentifier);
    }
}

function addTimezoneContext(text, weekday = null) {
  const userOffset = -(new Date().getTimezoneOffset()) / 60;
  const estOffset = -5;
  const diffFromEST = userOffset - estOffset;
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayIndex = weekday ? weekdays.indexOf(weekday) : new Date().getDay();

  const baseDate = new Date();
  const currentDayIndex = baseDate.getDay();
  const diff = weekdayIndex - currentDayIndex;
  baseDate.setDate(baseDate.getDate() + diff);
  
  return text.replace(
      /\b(\d{1,2}(?::\d{2})?(?:\s*[AaPp][Mm])?|\d{2}:\d{2})\b/g, 
      (match) => {
          let hour = 0;
          let minutes = 0;
          
          if (match.includes(':')) {
              const [h, m] = match.split(':');
              hour = parseInt(h);
              minutes = parseInt(m);
              if (match.toLowerCase().includes('pm') && hour < 12) hour += 12;
              if (match.toLowerCase().includes('am') && hour === 12) hour = 0;
          } else {
              hour = parseInt(match);
              if (match.toLowerCase().includes('pm') && hour < 12) hour += 12;
              if (match.toLowerCase().includes('am') && hour === 12) hour = 0;
          }
          
          const oldDate = new Date(baseDate);
          oldDate.setHours(hour, minutes, 0, 0);
          
          const newDate = new Date(oldDate);
          newDate.setHours(hour + diffFromEST, minutes, 0, 0);
          
          let newHour = newDate.getHours();
          let period = 'AM';
          
          if (newHour >= 12) {
              period = 'PM';
              if (newHour > 12) newHour -= 12;
          }
          if (newHour === 0) newHour = 12;
          
          const formattedNewTime = `${newHour}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${period}`;
          
          const oldDay = weekdays[oldDate.getDay()];
          const newDay = weekdays[newDate.getDay()];
          const dayChanged = oldDate.getDay() !== newDate.getDay();
          
          if (dayChanged) {
              return `${match} <b style="font-size:0.8rem;">(${formattedNewTime} on ${newDay} for (You))</b>`;
          } else {
              return `${match} <b style="font-size:0.8rem;">(${formattedNewTime} for (You))</b>`;
          }
      }
  );
}

function processElementTimezones(className) {
  const elementsToProcess = document.querySelectorAll(`${className}:not([data-timezone-processed])`);
  
  elementsToProcess.forEach(element => {
      const originalText = element.textContent || element.innerText;
      const weekday = element.dataset.weekday;
      const processedText = addTimezoneContext(originalText, weekday);
      element.innerHTML = processedText;
      element.setAttribute('data-timezone-processed', 'true');
  });
}

function switchTab(button) {
    const container = button.closest(".tabs");
    const buttons = container.getElementsByClassName('tab-button');
    const targets = [...buttons].map(btn => document.getElementById(btn.dataset.target));
    const selectedTarget = document.getElementById(button.dataset.target);
    
    if (!selectedTarget || !selectedTarget.classList.contains('is-hidden')) return;
    
    targets.forEach((target, idx) => {
        target.classList.add('is-hidden');
        buttons[idx].parentElement.classList.remove('is-active');
    });
    selectedTarget.classList.remove('is-hidden');
    button.parentElement.classList.add('is-active');
}

function countDuplicateListeners() {
    const ipColumn = document.querySelector('#listener-tracker-column-ip');
    if (ipColumn === null) return;

    const columnIndex = Array.from(ipColumn.parentElement.children).indexOf(ipColumn);
    const ipCells = document.querySelectorAll(`table tbody tr td:nth-child(${columnIndex + 1})`);
    const duplicateListenersElement = document.querySelector('#listener-tracker-duplicate-listeners');
    const containerElement = document.querySelector('#listener-tracker-duplicate-listeners-container');
    const ipCounts = {};

    ipCells.forEach(cell => {
        const ip = cell.textContent.trim();
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });

    duplicateListenersElement.innerHTML = '';
    let hasDuplicates = false;

    for (const [ip, count] of Object.entries(ipCounts)) {
        if (count > 1) {
            hasDuplicates = true;
            const containerDiv = document.createElement('div'); 
            const ipDiv = document.createElement('div');
            const countDiv = document.createElement('div');
            ipDiv.classList.add("tag");
            countDiv.classList.add("tag", "m-2");
            ipDiv.textContent = `${ip}`;
            countDiv.textContent = `${count} times`;
            containerDiv.appendChild(ipDiv);
            containerDiv.appendChild(countDiv);
            duplicateListenersElement.appendChild(containerDiv);
        }
    }

    if (hasDuplicates) {
        containerElement.classList.remove('is-hidden');
    }
}

htmx.onLoad((content) => {
    // Add a keyboard event to close all modals
    document.addEventListener('keydown', escToCloseModals, {passive: true});
});

function removeTargetOnClick(e) {
    el = e.closest(e.dataset.target);
    el.parentNode.removeChild(el);
}

function toggleClassOnClick(e) {
    htmx.toggleClass(htmx.find(`#${e.dataset.target}`), e.dataset.class);
}

function removeClassOnClick(e) {
    htmx.removeClass(htmx.find(`#${e.dataset.target}`), e.dataset.class);
}

function addClassOnClick(e) {
    htmx.addClass(htmx.find(`#${e.dataset.target}`), e.dataset.class);
}

// Functions to open and close modals
function escToCloseModals(event) {
    if(event.key === "Escape") {
        closeAllModals();
    }
}

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

// Function to show one-time notifications; see chat page for an example
function showOrHideOnLoad(element) {
    if (!localStorage.getItem(element.dataset.storageKey)) {
        element.dataset.visible = 'true';
    }

    element.onclick = (event) => {
        if (event.target.matches('.delete')) {
            localStorage.setItem(element.dataset.storageKey, 'dismissed');
            element.dataset.visible = 'false';
        }
    };
}

  function initNowPlayingTags() {
    const checkbox = document.getElementById('toggle-now-playing-tags');
    if (!checkbox) return;

    const savedState = localStorage.getItem('nowPlayingTagsState') === 'true';
    checkbox.checked = savedState;

    // set initial state in body to avoid pop-in
    document.body.classList.add(savedState ? 'tags-visible' : 'tags-hidden');
}

function saveNowPlayingTagsState(checkbox) {
    localStorage.setItem('nowPlayingTagsState', checkbox.checked);
    document.body.classList.remove('tags-visible', 'tags-hidden');
    document.body.classList.add(checkbox.checked ? 'tags-visible' : 'tags-hidden');
}

function handleVolumeScroll(event) {
    event.preventDefault();
    const input = event.target;
    const newValue = Math.min(Math.max(parseInt(input.value) + (event.deltaY < 0 ? 2 : -2), 0), 100);
    input.value = newValue;
    input.dispatchEvent(new Event('input'));
}

const initializeLoadElements = () => {
    const functionRegistry = {
        showOrHideOnLoad: showOrHideOnLoad,
        initNowPlayingTags: initNowPlayingTags
    };

    const executeFunction = (element) => {
        const functionName = element.getAttribute('data-run-on-load');
        if (functionName && functionRegistry[functionName]) {
            try {
                functionRegistry[functionName](element);
                element.removeAttribute('data-run-on-load');
            } catch (error) {
                console.error(`Error executing ${functionName}:`, error);
            }
        }
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.hasAttribute('data-run-on-load')) {
                        executeFunction(node);
                    }
                    node.querySelectorAll('[data-run-on-load]').forEach(executeFunction);
                }
            });
        });
    });

    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });

    document.querySelectorAll('[data-run-on-load]').forEach(executeFunction);
};

function loadFonts() {
    document.documentElement.setAttribute("data-font", localStorage.getItem("preferredFont") || "Default");
}

function loadAdminNavbar() {
    let navbarPosition = localStorage.getItem("adminNavbarPosition");
    document.documentElement.setAttribute("data-admin-navbar", navbarPosition || "bottom");
    if (localStorage.getItem("navbarState") === "admin" && navbarPosition === "top") {
        document.querySelector('#admin-navbar-container').style='top:0px!important;';
    }
}

function toggleNavbarState(isAdminOrPublic) {
    if (isAdminOrPublic === "public") {
        document.querySelector('#admin-navbar-container').style='top:0px!important;';
        localStorage.setItem("navbarState", "admin");
    } else {
        document.querySelector('#admin-navbar-container').style='top:calc(-1 * var(--bulma-navbar-height))!important;'
        localStorage.setItem("navbarState", "public")
    }
}

function loadCustomCSS() {
    document.getElementById("custom-css").textContent = localStorage.getItem("customCss") || "";
}

loadFonts();
loadCustomCSS();
initializeLoadElements();