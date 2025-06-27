// Retrieve saved quotes from localStorage or use default
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "Stay hungry, stay foolish.", category: "Motivation" }
];

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// Display quotes (all or filtered)
function displayQuotes(quoteList = quotes) {
  const quoteDisplay = document.getElementById("quoteDisplay");
  quoteDisplay.innerHTML = ""; // Clear current list

  quoteList.forEach((quote, index) => {
    const quoteDiv = document.createElement("div");
    quoteDiv.className = "quote";
    quoteDiv.innerHTML = `
      <strong>${quote.text}</strong> - ${quote.category}
      <button onclick="removeQuote(${index})">❌</button>
    `;
    quoteDisplay.appendChild(quoteDiv);
  });
}

// Populate category filter dropdown
function populateCategories() {
  const filter = document.getElementById("categoryFilter");
  filter.innerHTML = `<option value="all">All Categories</option>`;

  const categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    filter.appendChild(option);
  });
}

// Filter quotes based on selected category
function filterQuotes() {
  const selected = document.getElementById("categoryFilter").value;
  const filtered = selected === "all"
    ? quotes
    : quotes.filter(q => q.category === selected);

  displayQuotes(filtered);
  localStorage.setItem("selectedCategory", selected);
}

// Add a new quote
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const text = textInput.value.trim();
  const category = categoryInput.value.trim();

  if (!text || !category) {
    alert("Please fill in both fields.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  displayQuotes();
  textInput.value = "";
  categoryInput.value = "";
}

// Remove a quote by index
function removeQuote(index) {
  quotes.splice(index, 1);
  saveQuotes();
  displayQuotes();
  populateCategories();
}

// Export quotes to JSON file
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        quotes.push(...imported);
        saveQuotes();
        populateCategories();
        displayQuotes();
        alert("Quotes imported successfully!");
      } else {
        throw new Error("Invalid JSON format");
      }
    } catch (err) {
      alert("Error reading JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Sync quotes with a mock server
function syncWithServer() {
  fetch("https://jsonplaceholder.typicode.com/posts")
    .then(response => response.json())
    .then(data => {
      const serverQuotes = data.slice(0, 5).map(post => ({
        text: post.title,
        category: "Server"
      }));

      quotes = [...quotes, ...serverQuotes];
      saveQuotes();
      populateCategories();
      displayQuotes();
      alert("Quotes synced from server!");
    })
    .catch(error => {
      console.error("Sync error:", error);
      alert("Failed to sync with server.");
    });
}

// Initial setup on page load
window.onload = function () {
  const savedCategory = localStorage.getItem("selectedCategory") || "all";
  populateCategories();
  document.getElementById("categoryFilter").value = savedCategory;
  filterQuotes();
};
