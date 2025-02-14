let checkingInterval = null;

const altUrls = [
    'monm.ooo',
    'shamik.ooo',
    'shamiko.org'    
];

const urlTransformers = [
    {
        name: '4chan thread to JSON',
        match: /boards\.4chan\.org\/\w+\/thread\/\d+$/,
        transform: url => `${url}.json`,
        useResponse: false
    },
    {
        name: 'meguca JSON extractor',
        match: new RegExp(`(?:${altUrls.map(url => url.replace('.', '\\.')).join('|')})\/a\/\\d+`),
        useResponse: true, 
        transform: async (response) => {
            const text = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            
            const scriptTag = tempDiv.querySelector('script#post-data[type="application/json"]');
            if (scriptTag && scriptTag.textContent) {
                try {
                    return JSON.parse(scriptTag.textContent);
                } catch (e) {
                    console.error('Error parsing script JSON:', e);
                    throw new Error('Invalid script JSON data');
                }
            }
            return text;
        }
    }
];

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
        saveBoxState();
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
    saveBoxState();
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
    let targetUrl = document.getElementById('url').value;
    
    // get the transformer first without transforming
    const transformer = urlTransformers.find(t => t.match.test(targetUrl));
    
    // transform URL only for non-response transformers
    if (transformer && !transformer.useResponse) {
        console.log(`Applying URL transformer: ${transformer.name}`);
        targetUrl = transformer.transform(targetUrl);
        console.log(`Transformed URL: ${targetUrl}`);
    }

    const useProxy = document.getElementById('useCorsproxy').checked;
    const corsProxyUrl = document.getElementById('corsProxyUrl').value;
    const proxyUrl = useProxy ? 
        `${corsProxyUrl}${encodeURIComponent(targetUrl)}` : 
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

        // get the actual target URL if using a CORS proxy
        const actualUrl = url.includes('?url=') ? 
            decodeURIComponent(url.split('?url=')[1]) : 
            url;

        // check for response transformers first
        for (const transformer of urlTransformers) {
            if (transformer.useResponse && transformer.match.test(actualUrl)) {
                console.log(`Applying response transformer: ${transformer.name}`);
                const transformedData = await transformer.transform(response);
                if (typeof transformedData === 'object') {
                    return processText(JSON.stringify(transformedData, null, 2), options);
                }
                return processText(transformedData, options);
            }
        }

        const contentType = response.headers.get('content-type');
        const text = await response.text();

        if (!text) {
            throw new Error('Empty response received');
        }

        // JSON response
        if (contentType && contentType.includes('application/json')) {
            try {
                const json = JSON.parse(text);
                // convert JSON to searchable text
                const jsonText = JSON.stringify(json, null, 2);
                return processText(jsonText, options);
            } catch (e) {
                console.error('JSON parse error:', e);
                throw new Error('Invalid JSON response');
            }
        }

        // HTML response
        return processText(text, options);

    } catch (error) {
        console.error('Error in findPatternsInPage:', error);
        throw error;
    }
}

function processText(text, options) {
    const matches = new Set();
    
    const isJSON = text.trim().startsWith('{') || text.trim().startsWith('[');
    console.log(`Processing content as: ${isJSON ? 'JSON' : 'HTML'}`);
    
    // temp div to parse HTML properly
    const tempDiv = document.createElement('div');
    // replace <br> tags with newlines before setting innerHTML
    text = text.replace(/<br\s*\/?>/gi, '\n');
    tempDiv.innerHTML = text;
    
    // process text nodes separately
    const textNodes = [];
    const treeWalker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = treeWalker.nextNode()) {
        textNodes.push(node.textContent.trim());
    }
    
    const wordLimit = parseInt(document.getElementById('wordLimit').value) || 3;
    
    for (const nodeText of textNodes) {
        if (!nodeText) continue;
        
        // split into lines and remove empty ones, keeping the newlines
        const lines = nodeText.split(/(?<=\n)|(?=\n)/).filter(line => line.trim());
        
        for (const line of lines) {
            let processedLine = line.trim().replace(/\s+/g, ' ');
            
            // process each pattern separately for the line
            for (const pattern of options.patterns) {
                // capture everything up to any stop condition, excluding quotes
                const regex = new RegExp(
                    `${pattern}\\s+([^<"]*?)(?=\\\\n|\\n|<br>|<br\\/>|<|\\.|,|\\||"|$)`,
                    'gi'
                );
                let match;
                
                while ((match = regex.exec(processedLine)) !== null) {
                    const matchText = match[1].trim();
                    if (matchText) {
                        const limitedText = matchText.split(/\s+/).slice(0, wordLimit).join(' ');
                        matches.add(limitedText);
                    }
                }
            }
        }
    }

    return Array.from(matches).map(match => ({
        match: match
    }));
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