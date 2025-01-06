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
        let adminPendingColumns = localStorage.getItem("admin-pending-columns");
        let adminPendingWidth = localStorage.getItem("admin-pending-width");

        document.getElementById("pending-columns").value = adminPendingColumns;
        document.getElementById("pending-width").value = adminPendingWidth;
        
        if (adminPlayerVolume)              Array.from(document.getElementsByClassName("volume-input")).forEach((el) => el.value = adminPlayerVolume);
        if (adminPendingColumns > 1)        document.getElementById("pending-section").classList.add("has-"+adminPendingColumns+"-cols");
        if (adminPendingWidth === "narrow") document.getElementById("pending").classList.remove("is-fluid");
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

const toggleDropdown = (element, targetDiv = null, targetClass = "is-hidden") => {
    toggleState(element, 'plus', 'minus', options = {type: 'icon'});

    if (targetDiv === null) {
        element.closest(".dropdown-parent").nextElementSibling.classList.toggle(targetClass);
    } else {
        document.getElementById(targetDiv).classList.toggle(targetClass);
    }
}

const togglePlayPauseAdmin = (element, songIdentifier) => {
    toggleState(element, "Play", "Pause", options = {class: "adminPlayerPlayPauseButton", resetOthers: true});
    adminPlayerPlayPause('/admin/pending-song/' + songIdentifier);
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
    const container = button.parentElement;
    const buttons = container.getElementsByTagName('button');
    const targets = [...buttons].map(btn => document.getElementById(btn.dataset.target));
    const selectedTarget = document.getElementById(button.dataset.target);
    
    if (!selectedTarget || !selectedTarget.classList.contains('is-hidden')) return;
    
    targets.forEach(target => target.classList.add('is-hidden'));
    selectedTarget.classList.remove('is-hidden');
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