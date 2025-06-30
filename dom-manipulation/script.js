// Global array to store quotes
let quotes = [];
let currentQuoteIndex = -1; // To keep track of the displayed quote
const SERVER_URL = 'https://jsonplaceholder.typicode.com/posts'; // Mock API endpoint
const SYNC_INTERVAL_MS = 5000; // Sync every 5 seconds for demonstration

// --- Utility Functions ---

// Function to save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
    updateStatus('Quotes saved to local storage.');
}

// Function to load quotes from local storage
function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
        // Ensure all loaded quotes have updatedAt and isSynced properties
        quotes = quotes.map(quote => ({
            ...quote,
            updatedAt: quote.updatedAt || Date.now(),
            isSynced: typeof quote.isSynced === 'boolean' ? quote.isSynced : true // Assume loaded quotes are synced unless specified
        }));
        updateStatus('Quotes loaded from local storage.');
    } else {
        // Initialize with some default quotes if nothing in local storage
        quotes = [
            { id: Date.now() + 1, text: "The only way to do great work is to love what you do.", category: "Work", updatedAt: Date.now(), isSynced: false },
            { id: Date.now() + 2, text: "Innovation distinguishes between a leader and a follower.", category: "Innovation", updatedAt: Date.now(), isSynced: false },
            { id: Date.now() + 3, text: "Your time is limited, don't waste it living someone else's life.", category: "Life", updatedAt: Date.now(), isSynced: false },
            { id: Date.now() + 4, text: "Strive not to be a success, but rather to be of value.", category: "Motivation", updatedAt: Date.now(), isSynced: false },
            { id: Date.now() + 5, text: "The mind is everything. What you think you become.", category: "Philosophy", updatedAt: Date.now(), isSynced: false }
        ];
        saveQuotes(); // Save initial quotes
        updateStatus('Default quotes loaded.');
    }
}

// Function to update status messages in the UI
function updateStatus(message, isError = false) {
    const statusDisplay = document.getElementById('statusDisplay');
    if (statusDisplay) {
        statusDisplay.textContent = message;
        statusDisplay.style.color = isError ? 'red' : 'green';
        console.log(message); // Also log to console for debugging
    }
}

// --- Part 0: Dynamic Content Generator ---

// Function to display a random quote
function displayRandomQuote() {
    const quoteDisplay = document.getElementById('quoteDisplay');
    const quoteCategory = document.getElementById('quoteCategory');
    const categoryFilter = document.getElementById('categoryFilter'); // Get the filter dropdown

    const selectedCategory = categoryFilter ? categoryFilter.value : 'all'; // Handle if filter not present

    let availableQuotes = [];
    if (selectedCategory === 'all') {
        availableQuotes = quotes;
    } else {
        availableQuotes = quotes.filter(quote => quote.category === selectedCategory);
    }

    if (availableQuotes.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        quoteCategory.textContent = "";
        sessionStorage.removeItem('lastViewedQuote');
        updateStatus('No quotes to display for selected category.', true);
        return;
    }

    currentQuoteIndex = Math.floor(Math.random() * availableQuotes.length);
    const selectedQuote = availableQuotes[currentQuoteIndex];

    quoteDisplay.textContent = selectedQuote.text;
    quoteCategory.textContent = `Category: ${selectedQuote.category}`;

    // Save the last viewed quote to session storage (Part 1)
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(selectedQuote));
    updateStatus('Displayed a random quote.');
}

// Function to add a new quote
async function addQuote() { // Made async for potential server post
    const newQuoteTextInput = document.getElementById('newQuoteTextInput');
    const newQuoteCategoryInput = document.getElementById('newQuoteCategoryInput');

    const newQuoteText = newQuoteTextInput.value.trim();
    const newQuoteCategory = newQuoteCategoryInput.value.trim();

    if (newQuoteText && newQuoteCategory) {
        const newQuote = {
            id: `local-${Date.now()}`, // Client-generated ID for new quote, will be updated by server
            text: newQuoteText,
            category: newQuoteCategory,
            updatedAt: Date.now(), // Timestamp for conflict resolution
            isSynced: false // Flag to track if synced with server
        };
        quotes.push(newQuote);
        saveQuotes(); // Save to local storage after adding (Part 1)
        populateCategories(); // Update categories dropdown (Part 2)
        displayRandomQuote(); // Display a new random quote including the new one
        newQuoteTextInput.value = ''; // Clear input fields
        newQuoteCategoryInput.value = '';
        updateStatus('New quote added locally. Attempting to sync...');

        // Attempt to post the new quote to the server immediately (Part 3)
        await postQuoteToServer(newQuote);
    } else {
        alert("Please enter both quote text and a category.");
        updateStatus('Failed to add quote: Missing text or category.', true);
    }
}

// --- Part 1: Web Storage and JSON Handling (saveQuotes/loadQuotes moved to Utility) ---

// Function to export quotes to a JSON file
function exportToJsonFile() {
    const dataStr = JSON.stringify(quotes, null, 2); // null, 2 for pretty print
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileName = 'quotes.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    linkElement.remove(); // Clean up the element
    updateStatus('Quotes exported to JSON file.');
}

// Function to import quotes from a JSON file
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) {
        updateStatus('No file selected for import.', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) { // Made async to allow postQuoteToServer
        try {
            const importedQuotes = JSON.parse(e.target.result);
            if (Array.isArray(importedQuotes) && importedQuotes.every(q => q.text && q.category)) {
                let importedCount = 0;
                for (const impQuote of importedQuotes) {
                    // Check if a quote with same text and category already exists
                    const exists = quotes.some(q => q.text === impQuote.text && q.category === impQuote.category);
                    if (!exists) {
                        const newQuote = {
                            id: impQuote.id || `imported-${Date.now()}-${Math.random()}`, // Assign ID if missing
                            text: impQuote.text,
                            category: impQuote.category,
                            updatedAt: impQuote.updatedAt || Date.now(),
                            isSynced: false // Mark as unsynced initially, will try to post
                        };
                        quotes.push(newQuote);
                        importedCount++;
                        // Attempt to post newly imported quotes to the server
                        await postQuoteToServer(newQuote);
                    }
                }
                saveQuotes(); // Save merged quotes to local storage
                populateCategories(); // Repopulate categories with new quotes
                displayRandomQuote(); // Display a quote from the newly imported set
                updateStatus(`${importedCount} new quotes imported and synced!`);
            } else {
                alert("Invalid JSON file format. Expected an array of objects with 'text' and 'category'.");
                updateStatus('Invalid JSON file format for import.', true);
            }
        } catch (error) {
            alert("Error parsing JSON file: " + error.message);
            updateStatus("Error parsing JSON file: " + error.message, true);
        }
    };
    reader.readAsText(file);
}

// --- Part 2: Dynamic Content Filtering System (populateCategories/filterQuotes moved to Utility) ---

// Function to populate the category dropdown
function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return; // Ensure element exists

    // Clear existing options
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // Extract unique categories, filter out undefined/null categories
    const uniqueCategories = [...new Set(quotes.map(quote => quote.category).filter(Boolean))];

    // Sort categories alphabetically
    uniqueCategories.sort();

    // Add unique categories to the dropdown
    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Restore last selected category from local storage
    const lastSelectedCategory = localStorage.getItem('selectedCategory');
    if (lastSelectedCategory && uniqueCategories.includes(lastSelectedCategory)) {
        categoryFilter.value = lastSelectedCategory;
    } else {
        categoryFilter.value = 'all'; // Default to 'all' if no valid category stored
    }
    updateStatus('Categories populated.');
}

// Function to filter quotes based on selected category (this just triggers displayRandomQuote)
function filterQuotes() {
    const categoryFilter = document.getElementById('categoryFilter');
    // Save the selected category to local storage
    localStorage.setItem('selectedCategory', categoryFilter.value);
    displayRandomQuote(); // Re-display a random quote based on the new filter
    updateStatus(`Filtered by category: ${categoryFilter.value}`);
}

// --- Part 3: Syncing Data with Server and Implementing Conflict Resolution ---

// Function to fetch quotes from the server
async function fetchQuotesFromServer() {
    try {
        updateStatus('Fetching quotes from server...');
        const response = await fetch(SERVER_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const serverPosts = await response.json(); // .json() check
        updateStatus('Quotes fetched successfully from server.');

        // Map server posts to our quote format
        const serverQuotes = serverPosts.map(post => ({
            id: post.id, // Use server's ID
            text: post.title, // Map 'title' to 'text'
            category: post.body.substring(0, 20) || 'General', // Map 'body' to 'category', truncate if too long
            updatedAt: Date.now(), // Assume server data is fresh or add server-side timestamp if available
            isSynced: true // These quotes are from the server, so they are synced
        }));
        return serverQuotes;
    } catch (error) {
        updateStatus(`Failed to fetch quotes from server: ${error.message}`, true);
        console.error('Fetch error:', error);
        return [];
    }
}

// Function to post a new quote to the server
async function postQuoteToServer(quote) {
    // Only post if it hasn't been synced yet
    if (quote.isSynced) {
        return true; // Already synced, no need to post
    }

    try {
        updateStatus(`Posting quote "${quote.text}" to server...`);
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: quote.text,
                body: quote.category,
                userId: 1, // Example user ID for JSONPlaceholder
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const serverResponse = await response.json();
        updateStatus(`Quote "${quote.text}" posted successfully to server. Server ID: ${serverResponse.id}`);

        // Update the local quote with the server-assigned ID and mark as synced
        const index = quotes.findIndex(q => q.id === quote.id); // Find by original local ID
        if (index !== -1) {
            quotes[index].id = serverResponse.id; // Update with actual server ID
            quotes[index].isSynced = true;
            quotes[index].updatedAt = Date.now(); // Update timestamp on successful sync
            saveQuotes(); // Save updated local quotes
        }
        return true;
    } catch (error) {
        updateStatus(`Failed to post quote "${quote.text}" to server: ${error.message}. Will retry on next sync.`, true);
        console.error('Post error:', error);
        return false;
    }
}

// Function to synchronize quotes between local storage and server
async function syncQuotes() {
    updateStatus('Initiating quote synchronization...');
    const serverQuotes = await fetchQuotesFromServer();
    let updatedCount = 0;
    let newServerQuotesCount = 0;
    let postedLocalQuotesCount = 0;

    // Deep copy of original quotes to compare against changes made during sync
    const originalQuotes = JSON.parse(JSON.stringify(quotes));

    // --- Conflict Resolution Strategy: Merge based on uniqueness and update timestamp ---
    // If a server quote is new locally, add it.
    // If a local quote is new (not synced), try to post it.
    // If both exist, prioritize the one with the most recent 'updatedAt' timestamp.

    // Step 1: Process server quotes against local quotes
    serverQuotes.forEach(sQuote => {
        // Find if an equivalent quote exists locally by text and category (content match)
        const localContentMatchIndex = quotes.findIndex(lQuote =>
            lQuote.text === sQuote.text && lQuote.category === sQuote.category
        );

        if (localContentMatchIndex === -1) {
            // Case 1: Server quote is completely new to local storage (by content)
            // Add it to local quotes
            quotes.push({
                id: sQuote.id, // Use server ID
                text: sQuote.text,
                category: sQuote.category,
                updatedAt: sQuote.updatedAt,
                isSynced: true // It just came from the server, so it's synced
            });
            newServerQuotesCount++;
        } else {
            // Case 2: Content match found locally. Now check by ID and timestamp.
            const localQuote = quotes[localContentMatchIndex];

            // If the server quote has the same ID as a local quote (they are the 'same' item)
            // and the server's timestamp is newer than local, update local.
            // For JSONPlaceholder, we'll assume the fetched data is always the 'latest'
            // and update the local `id` if our local one was temporary.
            if (localQuote.id === sQuote.id || localQuote.id.startsWith('local-')) {
                 // Update local quote's server ID and content if content differs or if it was a local unsynced item
                if (localQuote.text !== sQuote.text || localQuote.category !== sQuote.category) {
                     // This simple strategy assumes server wins for existing items if content differs
                     // A more advanced strategy would compare updatedAt timestamps
                    localQuote.text = sQuote.text;
                    localQuote.category = sQuote.category;
                    localQuote.updatedAt = sQuote.updatedAt;
                    updatedCount++;
                }
                // Ensure local quote has the correct server ID and is marked synced
                localQuote.id = sQuote.id;
                localQuote.isSynced = true;
            }
        }
    });

    // Step 2: Post new/unsynced local quotes to the server
    // Iterate over a copy of quotes because 'quotes' array might be modified by postQuoteToServer
    for (const quote of [...quotes]) { // Iterate over a shallow copy
        if (!quote.isSynced) {
            const posted = await postQuoteToServer(quote);
            if (posted) {
                postedLocalQuotesCount++;
            }
        }
    }

    // Only save if actual changes occurred to avoid unnecessary localStorage writes
    const currentQuotesString = JSON.stringify(quotes);
    const originalQuotesString = JSON.stringify(originalQuotes);
    if (currentQuotesString !== originalQuotesString) {
        saveQuotes();
    }


    populateCategories(); // Re-populate categories in case new ones were added
    displayRandomQuote(); // Refresh displayed quote

    if (newServerQuotesCount > 0 || postedLocalQuotesCount > 0 || updatedCount > 0) {
        updateStatus(`Sync complete: Added ${newServerQuotesCount} new from server, Posted ${postedLocalQuotesCount} new local quotes, Updated ${updatedCount} existing quotes.`, false);
    } else {
        updateStatus('Sync complete: No new changes detected.', false);
    }
}

// Function to periodically check for new quotes from the server
function startPeriodicSync() {
    // Clear any existing interval to prevent duplicates
    if (window.syncInterval) {
        clearInterval(window.syncInterval);
    }
    window.syncInterval = setInterval(syncQuotes, SYNC_INTERVAL_MS);
    updateStatus(`Periodic sync started every ${SYNC_INTERVAL_MS / 1000} seconds.`);
}

// --- Event Listeners and Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Load quotes from local storage when the page initializes
    loadQuotes();

    // Populate categories dropdown (Part 2)
    populateCategories();

    // Check for last viewed quote in session storage and display it (Part 1)
    const lastViewedQuote = sessionStorage.getItem('lastViewedQuote');
    if (lastViewedQuote) {
        try {
            const quote = JSON.parse(lastViewedQuote);
            document.getElementById('quoteDisplay').textContent = quote.text;
            document.getElementById('quoteCategory').textContent = `Category: ${quote.category}`;
            updateStatus('Last viewed quote restored from session storage.');
        } catch (e) {
            console.error("Error parsing last viewed quote from session storage:", e);
            displayRandomQuote(); // Fallback to random if error
            updateStatus('Error restoring last quote, displaying random.', true);
        }
    } else {
        displayRandomQuote(); // Display initial random quote if no previous one
    }

    // Event listener for "Show New Quote" button (Part 0)
    const newQuoteBtn = document.getElementById('newQuoteBtn');
    if (newQuoteBtn) {
        newQuoteBtn.addEventListener('click', displayRandomQuote);
    }

    // Event listener for "Add Quote" button (Part 0)
    const addQuoteBtn = document.getElementById('addQuoteBtn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', addQuote);
    }

    // Event listener for "Export Quotes" button (Part 1)
    const exportQuotesBtn = document.getElementById('exportQuotesBtn');
    if (exportQuotesBtn) {
        exportQuotesBtn.addEventListener('click', exportToJsonFile);
    }

    // Event listener for "Import File" input (Part 1)
    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        importFileInput.addEventListener('change', importFromJsonFile);
    }

    // Event listener for category filter change (Part 2)
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterQuotes);
    }

    // Event listener for "Sync with Server" button (Part 3)
    const syncQuotesBtn = document.getElementById('syncQuotesBtn');
    if (syncQuotesBtn) {
        syncQuotesBtn.addEventListener('click', syncQuotes);
    }

    // Start periodic synchronization (Part 3)
    startPeriodicSync();
});