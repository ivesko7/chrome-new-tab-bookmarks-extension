document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    updateTime();
    setInterval(updateTime, 1000);

    loadTopSites();
    loadPinnedSites();
    loadMobileBookmarks();
    initHistoryMenu();
});

function updateTime() {
    const now = new Date();
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

let currentSortType = 'default';
let currentSortDirection = 'asc';
let currentBookmarksNode = null;
let currentParentNodes = [];
let contextMenuTarget = null; // currently right-clicked bookmark
let zenRipplesEnabled = true;

let rippleCount = 1;
let rippleSeconds = 6;
let rippleIntervalId = null;
let rippleEchoEnabled = true;
let rippleEchoFreq = 8;
let rippleEchoDelay = 0.9;

function updateRippleEchoLabel() {
    const el = document.getElementById('ripple-echo-freq');
    const label = document.getElementById('ripple-echo-freq-label');
    if (el && label) {
        label.textContent = el.value + "/20";
    }

    const delayEl = document.getElementById('ripple-echo-delay');
    const delayLabel = document.getElementById('ripple-echo-delay-label');
    if (delayEl && delayLabel) {
        delayLabel.textContent = parseFloat(delayEl.value).toFixed(1) + 's';
    }

    const decayEl = document.getElementById('ripple-decay');
    const decayLabel = document.getElementById('ripple-decay-label');
    if (decayEl && decayLabel) {
        decayLabel.textContent = parseFloat(decayEl.value).toFixed(1) + 'x';
    }
}

let rippleDecayMultiplier = 1.0;

function initSettings() {
    // Load saved columns or default to 7
    const savedColumns = localStorage.getItem('bookmarksColumns') || 7;
    document.documentElement.style.setProperty('--bookmarks-columns', savedColumns);
    document.getElementById('column-count').value = savedColumns;

    zenRipplesEnabled = localStorage.getItem('zenRipplesEnabled') !== 'false';
    const stoneToggle = document.getElementById('stone-toggle');
    if (stoneToggle) stoneToggle.checked = zenRipplesEnabled;

    rippleEchoEnabled = localStorage.getItem('zenRippleEchoEnabled') !== 'false';
    const echoToggle = document.getElementById('echo-toggle');
    if (echoToggle) echoToggle.checked = rippleEchoEnabled;

    rippleCount = parseInt(localStorage.getItem('zenRippleCount')) || 1;
    rippleSeconds = parseInt(localStorage.getItem('zenRippleSeconds')) || 6;
    const storedFreq = localStorage.getItem('zenRippleEchoFreq');
    rippleEchoFreq = storedFreq !== null ? parseInt(storedFreq) : 8;
    const storedDelay = localStorage.getItem('zenRippleEchoDelay');
    rippleEchoDelay = storedDelay !== null ? parseFloat(storedDelay) : 0.9;
    const storedDecay = localStorage.getItem('zenRippleDecay');
    rippleDecayMultiplier = storedDecay !== null ? parseFloat(storedDecay) : 1.0;

    const countInput = document.getElementById('ripple-count');
    const secondsInput = document.getElementById('ripple-seconds');
    const echoFreqInput = document.getElementById('ripple-echo-freq');
    const echoDelayInput = document.getElementById('ripple-echo-delay');
    const decayInput = document.getElementById('ripple-decay');

    if (countInput) countInput.value = rippleCount;
    if (secondsInput) secondsInput.value = rippleSeconds;
    if (echoFreqInput) {
        echoFreqInput.value = rippleEchoFreq;
        updateRippleEchoLabel();
        echoFreqInput.addEventListener('input', updateRippleEchoLabel);
    }
    if (echoDelayInput) {
        echoDelayInput.value = rippleEchoDelay;
        updateRippleEchoLabel();
        echoDelayInput.addEventListener('input', updateRippleEchoLabel);
    }
    if (decayInput) {
        decayInput.value = rippleDecayMultiplier;
        updateRippleEchoLabel();
        decayInput.addEventListener('input', updateRippleEchoLabel);
    }

    const modal = document.getElementById('settings-modal');
    const btn = document.getElementById('settings-btn');
    const closeBtn = document.getElementsByClassName('close-btn')[0];
    const renameCloseBtn = document.querySelector('.rename-close');
    const saveBtn = document.getElementById('save-settings');
    const renameModal = document.getElementById('rename-modal');
    const saveRenameBtn = document.getElementById('save-rename');

    btn.onclick = () => { modal.style.display = "flex"; };

    closeBtn.onclick = () => { modal.style.display = "none"; };
    renameCloseBtn.onclick = () => { renameModal.style.display = "none"; };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == renameModal) {
            renameModal.style.display = "none";
        }
    };

    saveBtn.onclick = () => {
        const columns = document.getElementById('column-count').value;
        if (columns >= 1 && columns <= 12) {
            localStorage.setItem('bookmarksColumns', columns);
            document.documentElement.style.setProperty('--bookmarks-columns', columns);
        }
        zenRipplesEnabled = document.getElementById('stone-toggle').checked;
        localStorage.setItem('zenRipplesEnabled', zenRipplesEnabled);

        const echoToggleEl = document.getElementById('echo-toggle');
        if (echoToggleEl) {
            rippleEchoEnabled = echoToggleEl.checked;
            localStorage.setItem('zenRippleEchoEnabled', rippleEchoEnabled);
        }

        rippleCount = parseInt(document.getElementById('ripple-count').value) || 1;
        rippleSeconds = parseInt(document.getElementById('ripple-seconds').value) || 6;
        let freqVal = document.getElementById('ripple-echo-freq').value;
        rippleEchoFreq = freqVal === '' ? 8 : parseInt(freqVal);
        rippleEchoDelay = parseFloat(document.getElementById('ripple-echo-delay').value) || 0.9;
        rippleDecayMultiplier = parseFloat(document.getElementById('ripple-decay').value) || 1.0;

        localStorage.setItem('zenRippleCount', rippleCount);
        localStorage.setItem('zenRippleSeconds', rippleSeconds);
        localStorage.setItem('zenRippleEchoFreq', rippleEchoFreq);
        localStorage.setItem('zenRippleEchoDelay', rippleEchoDelay);
        localStorage.setItem('zenRippleDecay', rippleDecayMultiplier);

        updateRippleInterval();

        modal.style.display = "none";
    };

    // Sort Settings Initialization
    const sortTypeSelect = document.getElementById('sort-type');
    const sortDirBtn = document.getElementById('sort-direction-btn');
    const ascIcon = document.querySelector('.sort-icon.asc');
    const descIcon = document.querySelector('.sort-icon.desc');

    currentSortType = localStorage.getItem('bookmarkSortType') || 'default';
    currentSortDirection = localStorage.getItem('bookmarkSortDirection') || 'asc';

    sortTypeSelect.value = currentSortType;
    updateSortDirectionUI(ascIcon, descIcon, sortDirBtn, currentSortType);

    sortTypeSelect.addEventListener('change', (e) => {
        currentSortType = e.target.value;
        localStorage.setItem('bookmarkSortType', currentSortType);
        updateSortDirectionUI(ascIcon, descIcon, sortDirBtn, currentSortType);
        if (currentBookmarksNode) {
            renderBookmarks(currentBookmarksNode, document.getElementById('bookmarks-container'), currentParentNodes);
        }
    });

    sortDirBtn.addEventListener('click', () => {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        localStorage.setItem('bookmarkSortDirection', currentSortDirection);
        updateSortDirectionUI(ascIcon, descIcon, sortDirBtn, currentSortType);
        if (currentBookmarksNode) {
            renderBookmarks(currentBookmarksNode, document.getElementById('bookmarks-container'), currentParentNodes);
        }
    });

    initContextMenu();

    saveRenameBtn.onclick = () => {
        if (!contextMenuTarget) return;
        const newName = document.getElementById('rename-input').value;
        if (newName && newName.trim() !== '') {
            chrome.bookmarks.update(contextMenuTarget.id, { title: newName.trim() }, () => {
                renameModal.style.display = "none";
                loadMobileBookmarks(); // refresh
            });
        }
    };
}

function initContextMenu() {
    const menu = document.getElementById('context-menu');

    // Hide menu on click anywhere
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    // Handle menu actions
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!contextMenuTarget) return;
            const action = e.target.getAttribute('action');
            const url = contextMenuTarget.url;
            const id = contextMenuTarget.id;

            switch (action) {
                case 'open':
                    if (url) window.location.href = url;
                    break;
                case 'open-new':
                    if (url) chrome.tabs.create({ url: url, active: true });
                    break;
                case 'open-bg':
                    if (url) chrome.tabs.create({ url: url, active: false });
                    break;
                case 'pin':
                    if (url) {
                        const sites = getPinnedSites();
                        if (!sites.some(s => s.url === url)) {
                            sites.push({ url: url, title: contextMenuTarget.title || url });
                            savePinnedSites(sites);
                            loadPinnedSites();
                        }
                    }
                    break;
                case 'unpin':
                    if (url) {
                        let sites = getPinnedSites();
                        sites = sites.filter(s => s.url !== url);
                        savePinnedSites(sites);
                        loadPinnedSites();
                    }
                    break;
                case 'rename':
                    const renameModal = document.getElementById('rename-modal');
                    const renameInput = document.getElementById('rename-input');
                    renameInput.value = contextMenuTarget.title;
                    renameModal.style.display = 'flex';
                    renameInput.focus();
                    break;
                case 'delete':
                    if (confirm(`Are you sure you want to delete '${contextMenuTarget.title}'?`)) {
                        chrome.bookmarks.removeTree(id, () => {
                            loadMobileBookmarks();
                        });
                    }
                    break;
                case 'manage':
                    chrome.tabs.create({ url: 'chrome://bookmarks/' });
                    break;
            }
            menu.style.display = 'none';
        });
    });
}

function updateSortDirectionUI(ascIcon, descIcon, sortDirBtn, sortType) {
    if (sortType === 'default') {
        sortDirBtn.style.display = 'none';
    } else {
        sortDirBtn.style.display = 'flex';
        if (currentSortDirection === 'asc') {
            ascIcon.style.display = 'block';
            descIcon.style.display = 'none';
        } else {
            ascIcon.style.display = 'none';
            descIcon.style.display = 'block';
        }
    }
}
// ==== ZEN RIPPLE EFFECT ====
const canvas = document.getElementById('water-canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const ripples = [];

// Create a ripple on left click
document.addEventListener('click', (e) => {
    // Ignore clicks on the settings gear or within modals to avoid annoying the user
    if (!zenRipplesEnabled) return;
    if (e.target.closest('.modal') || e.target.closest('.settings-btn') || e.target.closest('.context-menu')) return;

    // Large, slow ripple on click
    createRipple(e.clientX, e.clientY, 150);
});

// Calculate and set up the automated ripple interval
function updateRippleInterval() {
    if (rippleIntervalId) {
        clearInterval(rippleIntervalId);
        rippleIntervalId = null;
    }

    if (zenRipplesEnabled && rippleCount > 0 && rippleSeconds > 0) {
        // e.g. 4 ripples every 4 seconds = 1 ripple per 1 second (1000ms)
        const intervalMs = (rippleSeconds / rippleCount) * 1000;
        rippleIntervalId = setInterval(() => {
            if (!zenRipplesEnabled || document.hidden) return;

            // Random position on the canvas
            const x = Math.random() * width * 0.8 + (width * 0.1);
            const y = Math.random() * height * 0.8 + (height * 0.1);

            createRipple(x, y, 100);
        }, intervalMs);
    }
}

// Initial setup
updateRippleInterval();

function createRipple(x, y, power) {
    ripples.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: power,
        alpha: 0.8,
        thickness: 2
    });
}

function animateRipples() {
    requestAnimationFrame(animateRipples);

    ctx.clearRect(0, 0, width, height);

    if (!zenRipplesEnabled) return;

    // Draw Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];

        // Very slow expansion (twice as slow as previous slow value)
        r.radius += r.maxRadius * 0.005 + 0.1;

        // Dynamic slow fade based on decay multiplier slider (1x - 3x longer)
       r.alpha -= 0.0018 / rippleDecayMultiplier;


        if (r.alpha <= 0) {
            ripples.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        // Elliptical ripple for perspective
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(88, 166, 255, ${r.alpha})`;
        ctx.lineWidth = r.thickness;
        ctx.stroke();
    }
}
animateRipples();

// ==== RIPPLE ECHO ====
let echoLastScheduledTime = 0;
let echoLastScheduledPos = null;

document.addEventListener('mousemove', (e) => {
    if (!zenRipplesEnabled || !rippleEchoEnabled) return;

    const now = Date.now();
    let freq = parseInt(rippleEchoFreq);
    if (isNaN(freq)) freq = 8;
    let freqMultiplier = freq === 10 ? 1.0 : (freq < 10 ? 1 + (10 - freq) * 0.5 : 1 / (1 + (freq - 10) * 0.3));

    // Determine thresholds
    let minDistance = Math.max(20, (window.innerWidth / 10) * freqMultiplier);
    let timeThreshold = 500 * freqMultiplier;

    let shouldSchedule = false;
    if (!echoLastScheduledPos) {
        shouldSchedule = true;
    } else {
        const dx = e.clientX - echoLastScheduledPos.x;
        const dy = e.clientY - echoLastScheduledPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= minDistance || (dist >= 20 && now - echoLastScheduledTime > timeThreshold)) {
            shouldSchedule = true;
        }
    }

    if (shouldSchedule) {
        const x = e.clientX;
        const y = e.clientY;
        echoLastScheduledPos = { x, y };
        echoLastScheduledTime = now;

        const delayMs = rippleEchoDelay * 1000;
        setTimeout(() => {
            if (zenRipplesEnabled && rippleEchoEnabled && !document.hidden) {
                createRipple(x, y, 80);
            }
        }, delayMs);
    }
});

function getPinnedSites() {
    try {
        return JSON.parse(localStorage.getItem('pinnedSites')) || [];
    } catch (e) {
        return [];
    }
}

function savePinnedSites(sites) {
    localStorage.setItem('pinnedSites', JSON.stringify(sites));
}

function loadPinnedSites() {
    const sites = getPinnedSites();
    const section = document.getElementById('pinned-sites-section');
    const container = document.getElementById('pinned-sites-container');
    container.innerHTML = '';

    if (sites && sites.length > 0) {
        section.style.display = 'block';
        sites.forEach((site, index) => {
            const a = document.createElement('a');
            a.href = site.url;
            a.className = 'site-item';
            
            // Allow drag and drop
            a.draggable = true;
            a.dataset.index = index;

            const img = document.createElement('img');
            img.src = getFaviconUrl(site.url);
            img.className = 'icon';
            img.onerror = () => { img.src = getFallbackFavicon(); };

            const span = document.createElement('span');
            span.className = 'title';
            
            try {
                let domain = new URL(site.url).hostname;
                if (domain.startsWith('www.')) domain = domain.substring(4);
                span.textContent = site.title || domain;
            } catch(e) {
                span.textContent = site.title || site.url;
            }
            span.title = site.title || span.textContent;

            a.appendChild(img);
            a.appendChild(span);

            // Drag and drop event listeners
            a.addEventListener('dragstart', (e) => {
                a.classList.add('dragging');
                e.dataTransfer.setData('text/plain', index);
            });

            a.addEventListener('dragend', () => {
                a.classList.remove('dragging');
                container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            a.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necessary to allow dropping
                if (!a.classList.contains('dragging')) {
                    a.classList.add('drag-over');
                }
            });

            a.addEventListener('dragleave', () => {
                a.classList.remove('drag-over');
            });

            a.addEventListener('drop', (e) => {
                e.preventDefault();
                a.classList.remove('drag-over');
                
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (isNaN(draggedIndex) || draggedIndex === index) return;

                let updatedSites = getPinnedSites();
                const [draggedItem] = updatedSites.splice(draggedIndex, 1);
                updatedSites.splice(index, 0, draggedItem);
                
                savePinnedSites(updatedSites);
                loadPinnedSites();
            });

            a.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                contextMenuTarget = { url: site.url, title: site.title, type: 'pinned' };
                showContextMenu(e, contextMenuTarget);
            });

            container.appendChild(a);
        });
    } else {
        section.style.display = 'none';
    }
}

function showContextMenu(e, target) {
    const menu = document.getElementById('context-menu');
    const renameItem = menu.querySelector('[action="rename"]');
    const deleteItem = menu.querySelector('[action="delete"]');
    const pinItem = menu.querySelector('[action="pin"]');
    const unpinItem = menu.querySelector('[action="unpin"]');
    const sepRename = document.getElementById('sep-rename');

    const isRecentOrPinned = target.type === 'recent' || target.type === 'pinned';
    
    if (isRecentOrPinned) {
        if (renameItem) renameItem.style.display = 'none';
        if (deleteItem) deleteItem.style.display = 'none';
        if (sepRename) sepRename.style.display = 'none';
    } else {
        if (renameItem) renameItem.style.display = 'block';
        if (deleteItem) deleteItem.style.display = 'block';
        if (sepRename) sepRename.style.display = 'block';
    }

    if (!target.url) {
        if (pinItem) pinItem.style.display = 'none';
        if (unpinItem) unpinItem.style.display = 'none';
        if (sepRename) sepRename.style.display = 'none';
    } else {
        const isPinned = getPinnedSites().some(s => s.url === target.url);
        if (target.type === 'pinned' || isPinned) {
            if (pinItem) pinItem.style.display = 'none';
            if (unpinItem) unpinItem.style.display = 'block';
        } else {
            if (pinItem) pinItem.style.display = 'block';
            if (unpinItem) unpinItem.style.display = 'none';
        }
    }

    menu.style.display = 'block';

    let x = e.pageX;
    let y = e.pageY;
    if (e.clientX + 200 > window.innerWidth) x = e.pageX - 200;
    if (e.clientY + menu.offsetHeight > window.innerHeight) y = e.pageY - menu.offsetHeight;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

function getFaviconUrl(u) {
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", u);
    url.searchParams.set("size", "32");
    return url.toString();
}

function getFallbackFavicon(color = '#8b949e') {
    return `data:image/svg+xml;base64,t${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y1="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`)}`;
}

function loadTopSites() {
    const renderSites = (sites) => {
        const section = document.getElementById('top-sites-section');
        const container = document.getElementById('top-sites-container');
        container.innerHTML = '';

        if (sites && sites.length > 0) {
            section.style.display = 'block';
            // Get up to 8 top sites
            sites.slice(0, 8).forEach(site => {
                const a = document.createElement('a');
                a.href = site.url;
                a.className = 'site-item';

                const img = document.createElement('img');
                img.src = getFaviconUrl(site.url);
                img.className = 'icon';
                img.onerror = () => { img.src = getFallbackFavicon(); };

                const span = document.createElement('span');
                span.className = 'title';
                
                try {
                    let domain = new URL(site.url).hostname;
                    if (domain.startsWith('www.')) domain = domain.substring(4);
                    span.textContent = site.title || domain;
                } catch(e) {
                    span.textContent = site.title || site.url;
                }
                span.title = site.title || span.textContent;

                a.appendChild(img);
                a.appendChild(span);

                // Add right-click listener for recent sites
                a.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    contextMenuTarget = { url: site.url, title: site.title || site.url, type: 'recent' };
                    showContextMenu(e, contextMenuTarget);
                });

                container.appendChild(a);
            });
        } else {
            section.style.display = 'none';
        }
    };

    if (chrome.history && chrome.history.search) {
        // Fetch up to 1000 recent history items from the past 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        chrome.history.search({ text: '', maxResults: 1000, startTime: thirtyDaysAgo }, (historyItems) => {
            const domainMap = new Map();

            for (const item of historyItems) {
                if (!item.url) continue;
                try {
                    const url = new URL(item.url);
                    // Skip browser internal pages
                    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:' || url.protocol === 'edge:') continue;

                    let domain = url.hostname;
                    if (domain.startsWith('www.')) {
                        domain = domain.substring(4);
                    }

                    if (!domainMap.has(domain)) {
                        domainMap.set(domain, {
                            url: item.url,
                            title: item.title,
                            visitCount: 0,
                            maxItemVisitCount: 0
                        });
                    }


                    const entry = domainMap.get(domain);
                    entry.visitCount += item.visitCount || 1;
                    
                    // Keep the url/title of the most heavily visited exact page on this domain
                    if ((item.visitCount || 1) > entry.maxItemVisitCount) {
                        entry.maxItemVisitCount = item.visitCount || 1;
                        entry.url = item.url;
                        entry.title = item.title;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Sort domains by total visit count
            const topSites = Array.from(domainMap.values()).sort((a, b) => b.visitCount - a.visitCount);
            
            if (topSites.length > 0) {
                renderSites(topSites);
            } else if (chrome.topSites && chrome.topSites.get) {
                chrome.topSites.get(renderSites);
            } else {
                renderSites([]);
            }
        });
    } else if (chrome.topSites && chrome.topSites.get) {
        chrome.topSites.get(renderSites);
    }
}

function loadMobileBookmarks() {
    if (chrome.bookmarks && chrome.bookmarks.getTree) {
        chrome.bookmarks.getTree((tree) => {
            const bookmarksBarNode = findBookmarksBar(tree[0]);
            const container = document.getElementById('bookmarks-container');

            if (bookmarksBarNode && bookmarksBarNode.children && bookmarksBarNode.children.length > 0) {
                renderBookmarks(bookmarksBarNode.children, container, []);
            } else {
                container.innerHTML = '<p>Bookmarks Bap not found or empty.</p>';
            }
        });
    } else {
        document.getElementById('bookmarks-container').innerHTML = '<p>Bookmarks permission denied or not available.</p>';
    }
}

function findBookmarksBar(node) {
    if (node.title && node.title.toLowerCase() === 'bookmarks bar') {
        return node;
    }
    if (node.children) {
        for (let child of node.children) {
            const found = findBookmarksBar(child);
            if (found) return found;
        }
    }
    return null;
}

function sortBookmarksList(bookmarksList) {
    if (currentSortType === 'default') {
        return bookmarksList; // Keep original order
    }

    // Separate folders and links to sort them independently or together if preferred
    // For now, let's sort them all together, but typically folders go first.
    // Let's implement Folders First, then sort within each group.
    const folders = bookmarksList.filter(b => b.children);
    const links = bookmarksList.filter(b => !b.children);

    const sortFn = (a, b) => {
        let valA, valB;
        if (currentSortType === 'name') {
            valA = (a.title || '').toLowerCase();
            valB = (b.title || '').toLowerCase();
        } else if (currentSortType === 'date') {
            valA = a.dateAdded || 0;
            valB = b.dateAdded || 0;
        }

        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    };

    folders.sort(sortFn);
    links.sort(sortFn);

    return [...folders, ...links];
}

function renderBookmarks(bookmarks, container, parentNodes = []) {
    currentBookmarksNode = bookmarks;
    currentParentNodes = parentNodes;
    container.innerHTML = ''; // Clear container

    // Optional: Update title to show breadcrumb or current folder
    const titleEl = document.getElementById('bookmarks-title');
    if (parentNodes.length > 0) {
        const currentFolder = parentNodes[parentNodes.length - 1];
        titleEl.textContent = `Bookmarks Bar / ${currentFolder.title}`;

        // Add "Back" button
        const backBtn = document.createElement('a');
        backBtn.href = '#';
        backBtn.className = 'bookmark-item bookmark-back';

        const btnSpan = document.createElement('span');
        btnSpan.className = 'title';
        btnSpan.textContent = 'Back';

        backBtn.appendChild(btnSpanD);

        backBtn.onclick = (ev) => {
            ev.preventDefault();
            if (parentNodes.length > 1) {
                // Go back up one level
                const previousParent = parentNodes[parentNodes.length - 2];
                renderBookmarks(previousParent.children, container, parentNodes.slice(0, -1));
            } else {
                // Go back to root
                loadMobileBookmarks();
            }
        };
        container.appendChild(backBtn);
    } else {
        titleEl.textContent = 'Bookmarks Bar';
    }

    const sortedBookmarks = sortBookmarksList([...bookmarks]);

    sortedBookmarks.forEach(bookmark => {
        const a = document.createElement('a');

        // Add right-click listener
        a.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenuTarget = Object.assign({}, bookmark, { type: 'bookmark' });
           showContextMenu(e, contextMenuTarget);
        });

        if (bookmark.url) {
            // It's a bookmark
            a.className = 'bookmark-item';
            a.href = bookmark.url;

            const img = document.createElement('img');
            img.src = getFaviconUrl(bookmark.url);
            img.className = 'icon';
            img.onerror = () => { img.src = getFallbackFavicon(); };

            const span = document.createElement('span');
            span.className = 'title';
            span.textContent = bookmark.title || new URL(bookmark.url).hostname;
            span.title = bookmark.title;

            a.appendChild(img);
            a.appendChild(span);
        } else if (bookmark.children) {
            // It's a folder
            a.className = 'bookmark-item bookmark-folder';
            a.href = '#';

            const span = document.createElement('span');
            span.className = 'title';
            span.textContent = bookmark.title;
            span.title = bookmark.title;

            a.appendChild(span);

            a.onclick = (e) => {
                e.preventDefault();
                renderBookmarks(bookmark.children, container, [...parentNodes, { title: bookmark.title, children: bookmark.children }]);
            };
        }

        // Add drag & drop support
        if (currentSortType === 'default') {
            a.draggable = true;
            a.dataset.id = bookmark.id;

            a.addEventListener('dragstart', (e) => {
                a.classList.add('dragging');
                e.dataTransfer.setData('text/plain', bookmark.id);
            });

            a.addEventListener('dragend', () => {
                a.classList.remove('dragging');
                // Clean up drag-over classes
                container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            a.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necessary to allow dropping
                if (!a.classList.contains('dragging')) {
                    a.classList.add('drag-over');
                }
            });

            a.addEventListener('dragleave', () => {
                a.classList.remove('drag-over');
            });

            a.addEventListener('drop', (e) => {
                e.preventDefault();
                a.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId === bookmark.id) return; // Dropped on itself

                // Get all current nodes to find indexes
                const items = Array.from(container.children).filter(child => child.draggable);
                const draggedElement = document.querySelector('.dragging');
                if (!draggedElement) return;

                const draggedIndex = items.indexOf(draggedElement);
                const targetIndex = items.indexOf(a);

                const dropIndex = bookmark.index;

                // Attempt to move it in Chrome Bookmarks
                // We determine where it should fall based on hover position. For simplicity, we just use the target's index.
                let newIndex = dropIndex;
                if (draggedIndex < targetIndex) {
                    // moving down, index remains the same because removing the previous element shifts everything up
                } else {
                    // moving up
                }

                chrome.bookmarks.move(draggedId, { parentId: bookmark.parentId, index: newIndex }, () => {
                    loadMobileBookmarks();
                });
            });
        }

        container.appendChild(a);
    });
}

function initHistoryMenu() {
    const historyBtn = document.getElementById('history-menu-btn');
    const historyMenu = document.getElementById('history-menu');
    
    if (!historyBtn || !historyMenu) return;

    document.addEventListener('click', (e) => {
        if (!historyBtn.contains(e.target) && !historyMenu.contains(e.target)) {
            historyMenu.style.display = 'none';
        }
    });

    historyBtn.addEventListener('click', () => {
        if (historyMenu.style.display === 'block') {
            historyMenu.style.display = 'none';
            return;
        }

        if (chrome.history && chrome.history.search) {
            chrome.history.search({ text: '', maxResults: 100 }, (historyItems) => {
                historyItems.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
                
                historyMenu.innerHTML = '';
                
                for (let i = 0; i < 5; i++) {
                    const start = i * 20;
                  const end = start + 20;
                    const slice = historyItems.slice(start, end);
                    
                    if (slice.length === 0) break;

                    const menuItem = document.createElement('div');
                    menuItem.className = 'menu-item has-submenu';
                    menuItem.textContent = `\${start + 1} - \${start + slice.length}`;
                    
                    const submenu = document.createElement('div');
                    submenu.className = 'submenu';
                    
                    slice.forEach(item => {
                        const a = document.createElement('a');
                        a.href = item.url;
                        a.className = 'menu-item';
                        a.innerHTML = `<img src="\${getFaviconUrl(item.url)}" onerror="this.src='\${getFallbackFavicon()}'" class="icon" style="width:16px;height:16px;margin-right:8px;vertical-align:middle;"><span>\${item.title || item.url}</span>`;
                        submenu.appendChild(a);
                    });
                    
                    menuItem.appendChild(submenu);
                    historyMenu.appendChild(menuItem);
                }
                
                historyMenu.style.display = 'block';
            });
        }
    });
}
