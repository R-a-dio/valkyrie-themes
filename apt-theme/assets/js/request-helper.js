let checkingInterval = null;

// default patterns to check for
let patterns = ['/r/', '/r/ing', 'requesting'];

// used to change the thread urls to the API urls
const urlTransformers = [
    {
        name: '4chan thread to JSON',
        match: /boards\.4chan(?:nel)?\.org\/([a-z0-9]+)\/thread\/(\d+)/,
        transformUrl: url => {
            const parts = url.match(/boards\.4chan(?:nel)?\.org\/([a-z0-9]+)\/thread\/(\d+)/);
            if (!parts) return url;
            const [_, board, thread] = parts;
            return `https://a.4cdn.org/${board}/thread/${thread}.json`;
        }
    },
    {
        name: 'meguca transformer',
        match: /shamiko\.org\/([a-z0-9]{1,30})\/([0-9]{1,12})(?:\?last=\d+)?$/, // match board(a-z0-9 up to 30 chars), thread(0-9 up to 12 chars), optional ?last=[number]
        transformUrl: url => {
            const parts = url.match(/shamiko\.org\/([a-z0-9]{1,30})\/([0-9]{1,12})(?:\?last=(\d+))?$/);
            if (!parts) return url;
            const [_, board, thread, lastParam] = parts;
            const baseUrl = `shamiko.org/json/boards/${board}/${thread}`;
            return lastParam ? `https://${baseUrl}?last=${lastParam}` : 'https://' + baseUrl;
        }
    },
    {
        name: 'test url',
        match: /static\.r-a-d\.io\/exci\/test-requests.json/,
        transformUrl: url => { return url; }
    }
];

function sanitizePostContent(text) {
    if (typeof text !== 'string') return '';

    const parser = new DOMParser();
    const decoded = parser.parseFromString(`<!doctype html><body>${text}`, 'text/html').body.textContent;

    return decoded
        .replace(/>>\d+/g, '')           // remove imageboard quotes
        .replace(/\\n/g, ' ')            // remove literal "\n"
        .replace(/[\x00-\x1F\x7F]/g, '') // remove null bytes and other control characters
        .replace(/\s+/g, ' ')            // collapse multiple spaces
        .trim();
}

// save and load box states so that requests are not lost
function saveBoxState() {
    const boxes = {
        patterns: patterns,
        leftBox: Array.from(document.getElementById('leftBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                // fetched requests have metadata
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            // manual requests do not
            return { text: textSpan.textContent };
        }),
        middleBox: Array.from(document.getElementById('middleBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            return { text: textSpan.textContent };
        }),
        rightBox: Array.from(document.getElementById('rightBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            return { text: textSpan.textContent };
        })
    };
    localStorage.setItem('requestHelperBoxes', JSON.stringify(boxes));
}

function loadBoxState() {
    const savedState = localStorage.getItem('requestHelperBoxes');
    if (savedState) {
        try {
            const boxes = JSON.parse(savedState);
            
            // load patterns if any were addded
            if (Array.isArray(boxes.patterns)) {
                patterns = boxes.patterns;
                updatePatternsDisplay();
            }
            
            Object.entries(boxes).forEach(([boxId, items]) => {
                if (boxId === 'patterns') return;
                
                const box = document.getElementById(boxId);
                if (box && Array.isArray(items)) {
                    items.forEach(item => {
                        if (!textExists(JSON.stringify(item))) {
                            const resultItem = createResultItem(JSON.stringify(item));
                            box.appendChild(resultItem);
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
    // same format as saveBoxState
    const boxes = {
        patterns: patterns,
        leftBox: Array.from(document.getElementById('leftBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            return { text: textSpan.textContent };
        }),
        middleBox: Array.from(document.getElementById('middleBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            return { text: textSpan.textContent };
        }),
        rightBox: Array.from(document.getElementById('rightBox').children).map(item => {
            const textSpan = item.querySelector('.result-text');
            const postContent = textSpan.querySelector('.post-content');
            const postLink = textSpan.querySelector('.post-link');
            const time = textSpan.querySelector('time');

            if (postContent && postLink && time) {
                return {
                    postId: postLink.href.split('#p')[1],
                    baseUrl: postLink.href.split('#')[0],
                    timestamp: time.dateTime,
                    text: postContent.textContent
                };
            }
            return { text: textSpan.textContent };
        })
    };
    
    const exportData = btoa(JSON.stringify(boxes));
    document.getElementById('importData').value = exportData;
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
        
        // clear existing
        clearBox('leftBox');
        clearBox('middleBox');
        clearBox('rightBox');
        patterns = [];
        
        // import patterns if they exist (todo: fix this)
        if (Array.isArray(boxes.patterns)) {
            patterns = boxes.patterns;
            updatePatternsDisplay();
        }
        
        // import boxes
        Object.entries(boxes).forEach(([boxId, items]) => {
            if (boxId === 'patterns') return;
            
            const box = document.getElementById(boxId);
            if (box && Array.isArray(items)) {
                items.forEach(item => {
                    const resultItem = createResultItem(JSON.stringify(item));
                    box.appendChild(resultItem);
                });
            }
        });
        
        updateStatus();
        saveBoxState();
        document.getElementById('importData').value = '';
    } catch (error) {
        console.error('Error importing data:', error);
        alert('Invalid import data');
    }
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

// create result items, (=requests)
function createResultItem(textOrData) {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.draggable = true;

    const textSpan = document.createElement('span');
    textSpan.className = 'result-text';

    let data;
    try {
        data = JSON.parse(textOrData);
    } catch {
        data = { text: textOrData };
    }

    if (data.postId && data.baseUrl) {
        // link container
        const linkContainer = document.createElement('div');
        linkContainer.className = 'post-link-container';
        
        // post link
        const link = document.createElement('a');
        link.href = `${data.baseUrl}#p${data.postId}`;
        link.target = '_blank';
        link.className = 'post-link';
        linkContainer.appendChild(link);
        textSpan.appendChild(linkContainer);

        // timestamp
        if (data.timestamp) {
            const time = document.createElement('time');
            time.dateTime = data.timestamp;
            time.dataset.type = "medium";
            time.className = 'post-time has-timeago';
            link.appendChild(time);
        }

        // post content
        const contentSpan = document.createElement('span');
        contentSpan.className = 'post-content';
        contentSpan.textContent = data.text;
        textSpan.appendChild(contentSpan);

        // update times after adding stuff or they won't show up until next check
        updateTimes();
    } else {
        textSpan.textContent = data.text;
    }

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

    // event listeners for dragging boxes
    item.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', '');
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

// check if request exists in any box by comparing post content
function textExists(textOrData) {
    let content;
    try {
        // If it's JSON data, get the text property
        const data = JSON.parse(textOrData);
        content = data.text;
    } catch {
        // If it's plain text, use it directly
        content = textOrData;
    }

    if (!content) return false;

    const allContentElements = [...document.querySelectorAll('.post-content')];
    return allContentElements.some(element => element.textContent === content);
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
    if (!isValidUrl(document.getElementById('thread-url').value)) {
        return;
    }

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
    let targetUrl = document.getElementById('thread-url').value;
    
    // turn url from the input into an API url
    const transformer = urlTransformers.find(t => t.match.test(targetUrl));
    if (transformer?.transformUrl) {
        targetUrl = transformer.transformUrl(targetUrl);
    }

    const useProxy = document.getElementById('useCorsproxy').checked;
    const corsProxyUrl = document.getElementById('corsProxyUrl').value;
    const proxyUrl = useProxy ? 
        `${corsProxyUrl}${encodeURIComponent(targetUrl)}` : 
        targetUrl;
    
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const posts = normalizeJsonPosts(json);
        const results = findMatchesInPosts(posts);
        const leftBox = document.getElementById('leftBox');

        results.forEach(result => {
            if (!textExists(result)) {
                const item = createResultItem(result);
                leftBox.appendChild(item);
            }
        });

        saveBoxState();
        updateStatus();
    } catch (error) {
        console.error('Error checking patterns:', error);
        const leftBox = document.getElementById('leftBox');
        const errorItem = createResultItem(`Error: ${error.message}`);
        errorItem.style.color = 'red';
        leftBox.appendChild(errorItem);
    }
}

// turn each json response into a normalized format
function normalizeJsonPosts(json) {
    if (json.hasOwnProperty('abbrev') && json.hasOwnProperty('update_time') && Array.isArray(json.posts)) {
        console.log("Detected meguca format");
        return json.posts.map(post => ({
            postId: post.id?.toString(),
            timestamp: post.time,
            content: sanitizePostContent(post.body || '')
        }));
    }
    
    if (Array.isArray(json.posts) && json.posts.length > 0 && 
        (json.posts[0].hasOwnProperty('semantic_url') || json.posts[0].hasOwnProperty('custom_spoiler'))) {
        console.log("Detected 4chan format");
        return json.posts.map(post => ({
            postId: post.no?.toString(),
            timestamp: post.time,
            content: sanitizePostContent(post.com || '')
        }));
    }

    if (Array.isArray(json.posts) && json.posts.length > 0 &&
    json.posts[0].hasOwnProperty('no') && json.posts[0].hasOwnProperty('time') &&
    json.posts.some(post => post.name === 'Test Suite')) {
        console.log("Detected test format");
        return json.posts.map(post => ({
            postId: post.no?.toString(),
            timestamp: post.time,
            content: sanitizePostContent(post.com || '')
        }));
    }

    throw new Error('Unsupported JSON format');
}

function findMatchesInPosts(posts) {
    const wordLimit = parseInt(document.getElementById('wordLimit').value) || 3;
    const matches = new Set();
    const baseUrl = document.getElementById('thread-url').value.split('?')[0];

    for (const post of posts) {
        if (!post.content) continue;

        for (const pattern of patterns) {
            // special handling for "/r/" since dumbasses sometimes post "/r/song" instead of "/r/ song"
            const escapedPattern = pattern === '/r/' ?
                '(?:^|\\s)\/r\/(?:\\s|$)' :                           // match at start or after whitespace, with optional space after
                '(?:^|\\s)' + pattern.replace(/\//g, '\\/') + '\\s+'; // other patterns must start with pattern or have whitespace before, and space after

            const regex = new RegExp(`${escapedPattern}([^\\n]*)`, 'gi');
            
            let match;
            while ((match = regex.exec(post.content)) !== null) {
                const followingText = match[1];
                if (followingText) {
                    const followingWords = followingText.trim().split(/\s+/);
                    if (followingWords.length > 0) {
                        const limitedText = followingWords
                            .slice(0, wordLimit)
                            .join(' ');
                        if (limitedText) {
                            matches.add(JSON.stringify({
                                postId: post.postId,
                                timestamp: post.timestamp,
                                text: limitedText,
                                baseUrl: baseUrl
                            }));
                        }
                    }
                }
            }
        }
    }

    return Array.from(matches);
}

function isValidUrl(url) {
    return urlTransformers.some(transformer => transformer.match.test(url));
}

function validateThreadUrl() {
    const urlInput = document.getElementById('thread-url');
    const toggleBtn = document.getElementById('toggleBtn');
    
    const isValid = isValidUrl(urlInput.value);
    
    toggleBtn.disabled = !isValid;
    urlInput.classList.toggle('is-danger', !isValid);
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