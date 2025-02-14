let checkingInterval = null;

// default patterns to check for
let patterns = ['/r/', '/r/ing', 'requesting'];

const altUrls = [
    'monm.ooo',
    'shamik.ooo',
    'shamiko.org'
];

const urlTransformers = [
    {
        name: '4chan thread to JSON',
        match: /boards\.4chan\.org\/\w+\/thread\/\d+/,
        transformUrl: url => url.replace(/\.json$/, '') + '.json',
        useResponse: true,
        transform: async (response) => {
            try {
                const text = await response.text();
                const json = JSON.parse(text);
    
                if (!json.posts || !Array.isArray(json.posts)) {
                    throw new Error('Invalid 4chan JSON format');
                }

                let val = json.posts
                    .filter(post => post?.com)
                    .map(post => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(post.com, 'text/html');
    
                        // remove all HTML elements but keep their text content
                        const walkNode = (node) => {
                            if (node.nodeType === 3) { // = text node
                                return node.textContent;
                            }
                            if (node.nodeType === 1) { // = element node
                                return Array.from(node.childNodes)
                                    .map(child => walkNode(child))
                                    .join('');
                            }
                            return '';
                        };
    
                        let text = walkNode(doc.body);
    
                        // cleanup on aisle 3
                        return text
                            // replace HTML entities
                            .replace(/&gt;/g, '')
                            .replace(/&lt;/g, '')
                            .replace(/&quot;/g, '')
                            .replace(/&amp;/g, '')
                            .replace(/&#039;/g, "")
                            // remove quote references
                            .replace(/>>?\d+/g, '')
                            // remove multiple spaces
                            .replace(/\s+/g, ' ')
                            // remove greentext markers
                            .replace(/^>\s*/gm, '')
                            // trim whitespace
                            .trim();
                    })
                    .filter(Boolean) // remove empty strings
                    .join('\n\n');

                console.log(val);
                return val;
    
            } catch (e) {
                console.error('Transform error:', e);
                throw e;
            }
        }
    },
    {
        name: 'meguca JSON extractor',
        match: new RegExp(`(?:${altUrls.map(url => url.replace('.', '\\.')).join('|')})\/a\/\\d+`),
        useResponse: true, 
        transform: async (response) => {
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            const scriptTag = doc.querySelector('script#post-data[type="application/json"]');
            if (scriptTag && scriptTag.textContent) {
                try {
                    const data = JSON.parse(scriptTag.textContent);
                    if (data && Array.isArray(data.posts)) {
                        // extract all post bodies into a single string
                        return data.posts
                            .filter(post => post && typeof post.body === 'string')
                            .map(post => post.body)
                            .join('\n\n');
                    }
                    throw new Error('No valid posts found in JSON data');
                } catch (e) {
                    console.error('Error parsing script JSON:', e);
                    throw new Error('Invalid script JSON data');
                }
            }
            return text;
        }
    },
    {
        name: 'r-a-d.io static content',
        match: /static\.r-a-d\.io/,
        useResponse: true,
        transform: async (response) => {
            const text = await response.text();
            return text;
        }
    },
    {   // todo: not use this
        name: 'deny-other-urls',
        // match everything not matched by previous transformers
        match: url => {
            const allowed = urlTransformers
                .slice(0, -1) // Exclude self from check
                .some(t => t.match.test(url));
            return !allowed;
        },
        useResponse: true,
        transform: async () => {
            throw new Error('URL not allowed');
        }
    }
];

function sanitizeJsonText(text) {
    return text
        // escape inner quotes that are preceded by a word boundary or space
        .replace(/(\w|^|\s)"(\w)/g, '$1\\"$2')
        // escape inner quotes that are followed by a word boundary or space
        .replace(/(\w)"(\s|$|\w)/g, '$1\\"$2')
        // remove any remaining unescaped double quotes that aren't at start/end of string
        .replace(/([^\\])"/g, '$1\\"')
        // clean up any double escapes that might have been created
        .replace(/\\\\/g, '\\');
}

function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&quot;/g, '')
        .replace(/&amp;/g, '')
        .replace(/&#39;/g, '')
        .replace(/&#96;/g, '')
        .replace(/&#36;/g, '')
        .replace(/[<>]/g, '')
        .replace(/["'`$]/g, '')
        .trim();
}

function sanitizeHTML(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    doc.querySelectorAll('script, style, meta, link, iframe, object, embed').forEach(el => el.remove());
    return doc;
}

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
        try {
            const boxes = JSON.parse(savedState);
            
            Object.entries(boxes).forEach(([boxId, items]) => {
                const box = document.getElementById(boxId);
                if (box && Array.isArray(items)) {
                    items.forEach(text => {
                        const sanitizedText = sanitizeText(text);
                        if (!textExists(sanitizedText)) {
                            const item = createResultItem(sanitizedText);
                            box.appendChild(item);
                        }
                    });
                }
            });
            
            updateStatus();
        } catch (error) {
            console.error('Error loading box state:', error);
        }
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

// clear requests
function clearBox(boxId) {
    const box = document.getElementById(boxId);
    while (box.firstChild) {
        box.removeChild(box.firstChild);
    }
    updateStatus();
    saveBoxState();
}

function importBoxes() {
    try {
        const importData = document.getElementById('importData').value.trim();
        if (!importData) return;
        
        const decoded = atob(importData);
        if (decoded.length > 100000) {
            throw new Error('Import data too large');
        }
        
        const boxes = JSON.parse(decoded);
        
        clearBox('leftBox');
        clearBox('middleBox');
        clearBox('rightBox');
        patterns = [];
        
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
    
    // always transform URL if transformer exists and has transformUrl method
    if (transformer && transformer.transformUrl) {
        targetUrl = transformer.transformUrl(targetUrl);
    }

    const useProxy = document.getElementById('useCorsproxy').checked;
    const corsProxyUrl = document.getElementById('corsProxyUrl').value;
    const proxyUrl = useProxy ? 
        `${corsProxyUrl}${encodeURIComponent(targetUrl)}` : 
        targetUrl;
    
    try {
        const results = await findPatternsInPage(proxyUrl, {
            patterns: patterns
        });

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

        const actualUrl = url.includes('?url=') ? 
            decodeURIComponent(url.split('?url=')[1]) : 
            url;

        // check for response transformers
        for (const transformer of urlTransformers) {
            if (transformer.useResponse && transformer.match.test(actualUrl)) {
                const transformedData = await transformer.transform(response);
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
    const wordLimit = parseInt(document.getElementById('wordLimit').value) || 3;
    
    // split into individual comments
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    for (const line of lines) {
        const cleanedLine = line
            .replace(/['"]\w+['"]:\s*/g, '')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
            .replace(/[^\x20-\x7E]/g, '')
            .trim();
        
        for (const pattern of options.patterns) {
            // escape pattern if it contains forward slashes
            const escapedPattern = pattern.replace(/\//g, '\\/');
            
            // match pattern+words within the same line
            const regex = new RegExp(
                `${escapedPattern}\\s*([^\\n]*)`,
                'gi'
            );
            
            let match;
            while ((match = regex.exec(cleanedLine)) !== null) {
                if (match[1]) { 
                    const followingWords = match[1].trim().split(/\s+/);
                    if (followingWords.length > 0) {
                        const limitedText = followingWords
                            .slice(0, wordLimit)
                            .join(' ');
                        if (limitedText) {
                            matches.add(limitedText);
                        }
                    }
                }
                regex.lastIndex = match.index + 1;
            }
        }
    }

    return Array.from(matches).map(match => ({ match }));
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