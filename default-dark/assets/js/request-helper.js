let checkingInterval = null;

// save and load box states so that requests are not lost
function saveBoxState() {
    const boxes = {
        leftBox: Array.from(document.getElementById('leftBox').children).map(item => 
            item.querySelector('.result-text').textContent
        ),
        middleBox: Array.from(document.getElementById('middleBox').children).map(item => 
            item.querySelector('.result-text').textContent
        ),
        rightBox: Array.from(document.getElementById('rightBox').children).map(item => 
            item.querySelector('.result-text').textContent
        )
    };
    localStorage.setItem('requestHelperBoxes', JSON.stringify(boxes));
}

function loadBoxState() {
    const savedState = localStorage.getItem('requestHelperBoxes');
    if (savedState) {
        const boxes = JSON.parse(savedState);
        
        // Restore items to their respective boxes
        Object.entries(boxes).forEach(([boxId, items]) => {
            const box = document.getElementById(boxId);
            items.forEach(text => {
                if (!textExists(text)) {
                    const item = createResultItem(text);
                    box.appendChild(item);
                }
            });
        });
        
        updateStatus();
    }
}

// request list export/import functions
function exportBoxes() {
    const boxes = {
        patterns: patterns,
        leftBox: Array.from(document.getElementById('leftBox').children).map(item => 
            item.querySelector('.result-text').textContent
        ),
        middleBox: Array.from(document.getElementById('middleBox').children).map(item => 
            item.querySelector('.result-text').textContent
        ),
        rightBox: Array.from(document.getElementById('rightBox').children).map(item => 
            item.querySelector('.result-text').textContent
        )
    };
    
    const exportData = btoa(JSON.stringify(boxes));
    document.getElementById('importData').value = exportData;
}

function importBoxes() {
    try {
        const importData = document.getElementById('importData').value.trim();
        if (!importData) return;
        
        const boxes = JSON.parse(atob(importData));
        
        document.getElementById('leftBox').innerHTML = '';
        document.getElementById('middleBox').innerHTML = '';
        document.getElementById('rightBox').innerHTML = '';
        patterns = [];
        
        if (boxes.patterns) {
            patterns = boxes.patterns;
            updatePatternsDisplay();
        }
        
        if (boxes.leftBox) {
            boxes.leftBox.forEach(text => {
                const item = createResultItem(text);
                document.getElementById('leftBox').appendChild(item);
            });
        }
        
        if (boxes.middleBox) {
            boxes.middleBox.forEach(text => {
                const item = createResultItem(text);
                document.getElementById('middleBox').appendChild(item);
            });
        }
        
        if (boxes.rightBox) {
            boxes.rightBox.forEach(text => {
                const item = createResultItem(text);
                document.getElementById('rightBox').appendChild(item);
            });
        }
        
        updateStatus();
        saveBoxState();
        document.getElementById('importData').value = '';
    } catch (error) {
        console.error('Error importing data:', error);
        alert('Invalid import data');
    }
}

// create result items, (=requests)
function createResultItem(text, sourceBox) {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.draggable = true;

    const textSpan = document.createElement('span');
    textSpan.className = 'result-text';
    textSpan.textContent = text;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'button remove-btn is-warning px-2 py-0';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        item.remove();
        updateStatus();
        saveBoxState(); // Add this line
    };

    item.appendChild(textSpan);
    item.appendChild(removeBtn);

    item.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', text);
        e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', (e) => {
        e.stopPropagation();
        item.classList.remove('dragging');
    });

    return item;
}

// manually add request to the list
function addManualRequest() {
    const input = document.getElementById('manualRequest');
    const text = input.value.trim();

    if (text && !textExists(text)) {
        const item = createResultItem(text);
        document.getElementById('leftBox').appendChild(item);
        input.value = '';
        updateStatus();
        saveBoxState();
    }
}

// check if request exists in any box
function textExists(text) {
    const allItems = [...document.querySelectorAll('.result-item')];
    return allItems.some(item =>
        item.querySelector('.result-text').textContent === text
    );
}

// clear requests
function clearBox(boxId) {
    document.getElementById(boxId).innerHTML = '';
    updateStatus();
    saveBoxState(); // Add this line
}

// update request count
function updateStatus() {
    const leftCount = document.getElementById('leftBox').children.length;
    const middleCount = document.getElementById('middleBox').children.length;
    const rightCount = document.getElementById('rightBox').children.length;

    document.getElementById('leftStatus').textContent =
        `${leftCount} item${leftCount !== 1 ? 's' : ''}`;
    document.getElementById('middleStatus').textContent =
        `${middleCount} item${middleCount !== 1 ? 's' : ''}`;
    document.getElementById('rightStatus').textContent =
        `${rightCount} item${rightCount !== 1 ? 's' : ''}`;
}

// main toggle for the checking
function toggleChecking() {
    const btn = document.getElementById('toggleBtn');
    if (checkingInterval) {
        clearInterval(checkingInterval);
        checkingInterval = null;
        btn.textContent = 'Start Checking';
    } else {
        const interval = document.getElementById('interval').value;
        checkPatterns();
        checkingInterval = setInterval(checkPatterns, interval * 1000);
        btn.textContent = 'Stop Checking';
    }
}

// default patterns to check for
let patterns = ['/r/', '/r/ing', 'requesting'];

function addPattern() {
    const input = document.getElementById('pattern');
    const pattern = input.value.trim();

    if (pattern && !patterns.includes(pattern)) {
        patterns.push(pattern);
        updatePatternsDisplay();
        input.value = '';
    }
}

function removePattern(pattern) {
    patterns = patterns.filter(p => p !== pattern);
    updatePatternsDisplay();
}

function updatePatternsDisplay() {
    const container = document.getElementById('patterns-list');
    container.innerHTML = '';

    patterns.forEach(pattern => {
        const tag = document.createElement('span');
        tag.className = 'tag pattern-tag is-medium mr-3 mb-2';
        tag.innerHTML = `
                    ${pattern}
                    <button onclick="removePattern('${pattern}')" title="Remove pattern">×</button>
                `;
        container.appendChild(tag);
    });
}

// fetch and check patterns
async function checkPatterns() {
    const targetUrl = document.getElementById('url').value;
    const useProxy = document.getElementById('useCorsproxy').checked;
    const proxyUrl = useProxy ? 
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` : 
        targetUrl;
    
    try {
        console.log('Fetching URL:', targetUrl);
        const results = await findPatternsInPage(proxyUrl, {
            patterns: patterns
        });
        
        console.log('Results found:', results.length);

        const leftBox = document.getElementById('leftBox');

        if (Array.isArray(results) && results.length > 0) {
            results.forEach(result => {
                if (result?.match) {
                    const resultText = result.match;
                    if (!textExists(resultText)) {
                        const item = createResultItem(resultText);
                        leftBox.appendChild(item);
                    }
                }
            });
            saveBoxState();
        }

        updateStatus();
    } catch (error) {
        console.error('Error checking patterns:', error);
        const leftBox = document.getElementById('leftBox');
        const errorItem = createResultItem(`Error: ${error.message}`);
        errorItem.style.color = 'red';
        leftBox.appendChild(errorItem);
    }
}

async function findPatternsInPage(url, options = {}) {
    const defaultOptions = {
        requireStartsWith: false,
        wordsAfter: 0,
        patterns: patterns
    };

    options = { ...defaultOptions, ...options };
    options.patterns = options.patterns.filter(pattern => pattern);
    options.patterns.sort((a, b) => b.length - a.length);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
            throw new Error('Empty response received');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        doc.querySelectorAll('script, style, meta, link').forEach(el => el.remove());
        
        const matches = new Set();
        const walker = document.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const lines = node.textContent.split('\n');
            
            for (const line of lines) {
                let processedLine = line.trim();
                let matched = false;

                for (const pattern of options.patterns) {
                    if (matched) break;

                    const regex = new RegExp(`${pattern}\\s+([^/\\r\\n]+)`, 'i');
                    const match = processedLine.match(regex);

                    if (match) {
                        const matchText = match[1].trim();
                        if (matchText) {
                            const limitedText = matchText.split(/\s+/).slice(0, 10).join(' ');
                            matches.add(limitedText);
                            matched = true;
                        }
                    }
                }
            }
        }

        doc.body.innerHTML = '';
        
        return Array.from(matches).map(match => ({
            match: match
        }));

    } catch (error) {
        console.error('Error in findPatternsInPage:', error);
        throw error;
    }
}

document.querySelectorAll('.droppable').forEach(box => {
    box.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.add('drag-over');
    });

    box.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.remove('drag-over');
    });

    box.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.remove('drag-over');

        const draggingItem = document.querySelector('.dragging');
        if (draggingItem) {
            box.appendChild(draggingItem);
            draggingItem.classList.remove('dragging');
            updateStatus();
            saveBoxState();
        }
    });
});

// init
updatePatternsDisplay();
loadBoxState();
updateStatus();