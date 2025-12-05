// ------------------------------------------------------
// SUPABASE CLIENT
// ------------------------------------------------------

const SUPABASE_URL = "https://qoilcrybvddmzqpatzgn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvaWxjcnlidmRkbXpxcGF0emduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDQwOTQsImV4cCI6MjA3OTU4MDA5NH0.slov4DIAHzhPCVm3a8sz4nyLJ2WUui5jBP8_m6-AI5Q";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------
// STATE
// ------------------------------------------------------

let books = [];
let scannedCoverUrl = null;

// ------------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------------

const addBookFab = document.getElementById("addBookFab");
const randomPickBtn = document.getElementById("randomPickBtn");
const wishlistBtn = document.getElementById("wishlistBtn");
const wishlistPanel = document.getElementById("wishlistPanel");
const closeWishlist = document.getElementById("closeWishlist");
const wishlistList = document.getElementById("wishlistList");

const addModal = document.getElementById("addModal");
const closeAddModalBtn = document.getElementById("closeAddModal");
const addBookForm = document.getElementById("addBookForm");
const addBookBtn = document.getElementById("addBookBtn");

const addTitle = document.getElementById("addTitle");
const addAuthor = document.getElementById("addAuthor");
const addGenre = document.getElementById("addGenre");
const addSummary = document.getElementById("addSummary");
const addRating = document.getElementById("addRating");
const addShelf = document.getElementById("addShelf");
const addCover = document.getElementById("addCover");
const coverSelectedMsg = document.getElementById("coverSelectedMsg");

const wishlistFormBtn = document.getElementById("wishlistFormBtn");

const bookModal = document.getElementById("bookModal");
const closeBookModalBtn = document.getElementById("closeBookModal");
const bookModalBody = document.getElementById("bookModalBody");
const addIsbn = document.getElementById("addIsbn");

// Auto-trigger lookup when ISBN reaches 10 or 13 chars
addIsbn.addEventListener("input", () => {
  const clean = addIsbn.value.replace(/[^\dX]/gi, "");
  if (clean.length === 10 || clean.length === 13) {
    lookupIsbn(clean);
  }
});

const searchInput = document.getElementById("searchInput");
const shelvesContainer = document.getElementById("shelvesContainer");

// ------------------------------------------------------
// WISHLIST TOGGLE (form)
// ------------------------------------------------------

let addFormWishlist = false;

function resetWishlistFormButton() {
  addFormWishlist = false;
  wishlistFormBtn.textContent = "♡ Add to Wishlist";
  wishlistFormBtn.style.background = "#1e1b4b";
}

wishlistFormBtn.addEventListener("click", () => {
  addFormWishlist = !addFormWishlist;

  wishlistFormBtn.textContent = addFormWishlist
    ? "♥ Wishlisted!"
    : "♡ Add to Wishlist";

  wishlistFormBtn.style.background = addFormWishlist ? "#4c1d95" : "#1e1b4b";
});

// ------------------------------------------------------
// MODALS
// ------------------------------------------------------

function openAddModal() {
  addBookForm.reset();
  addShelf.value = "";
  scannedCoverUrl = null;
  coverSelectedMsg.style.display = "none";
  resetWishlistFormButton();
  addBookBtn.removeAttribute("data-edit-id");
  addModal.classList.remove("hidden");
}

function closeAddModal() {
  addModal.classList.add("hidden");
}

function closeBookModal() {
  bookModal.classList.add("hidden");
}

function prettyShelf(shelf) {
  switch (shelf) {
    case "read":
      return "Read";
    case "havent":
      return "Haven't read";
    case "none":
    case "":
    case null:
    case undefined:
      return "—";
    default:
      return shelf;
  }
}

// ------------------------------------------------------
// BOOK MODAL (VIEW / EDIT / DELETE)
// ------------------------------------------------------

function openBookModal(book) {
  const stars = "⭐".repeat(parseInt(book.rating) || 0);

  bookModalBody.innerHTML = `
    <div class="book-modal-layout">
      ${book.coverData ? `<img src="${book.coverData}" class="modal-cover" />` : ""}

      <div class="modal-info">
        <h2 class="modal-title">${book.title}</h2>
        <p class="modal-author">by ${book.author || "Unknown"}</p>
        <p class="modal-meta"><strong>Shelf:</strong> ${prettyShelf(book.shelf)}</p>
        ${book.genre ? `<p class="modal-meta"><strong>Genre:</strong> ${book.genre}</p>` : ""}

        <h3 class="modal-section-title">Summary</h3>
        <p class="modal-summary">${book.summary || "No summary provided."}</p>

        ${stars ? `<div class="modal-stars">${stars}</div>` : ""}

        <div class="modal-buttons">
          <button class="edit-btn" id="editBookBtn">Edit</button>
          <button class="delete-btn" id="deleteBookBtn">Delete</button>
        </div>
      </div>
    </div>
  `;

  // Delete
  document.getElementById("deleteBookBtn").onclick = async () => {
    if (!confirm(`Delete "${book.title}"?`)) return;

    const { error } = await sb.from("books").delete().eq("id", book.id);
    if (error) {
      console.error(error);
      alert("Error deleting book.");
      return;
    }

    books = books.filter((b) => b.id !== book.id);
    renderAllShelves();
    renderWishlist();
    closeBookModal();
  };

  // Edit
  document.getElementById("editBookBtn").onclick = () => {
    closeBookModal();

    addTitle.value = book.title;
    addAuthor.value = book.author;
    addGenre.value = book.genre || "";
    addSummary.value = book.summary || "";
    addRating.value = book.rating || "";
    addShelf.value = book.shelf || "";

    addIsbn.value = book.isbn || "";

    addFormWishlist = !!book.isWishlisted;
    wishlistFormBtn.textContent = book.isWishlisted
      ? "♥ Wishlisted!"
      : "♡ Add to Wishlist";
    wishlistFormBtn.style.background = book.isWishlisted ? "#4c1d95" : "#1e1b4b";

    addBookBtn.setAttribute("data-edit-id", book.id);
    addModal.classList.remove("hidden");
  };

  bookModal.classList.remove("hidden");
}

// ------------------------------------------------------
// RANDOM PICK
// ------------------------------------------------------

function randomPick() {
  const pool = books.filter((b) => b.shelf === "havent" && !b.isWishlisted);

  if (!pool.length) {
    alert("You have no unread books!");
    return;
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  openBookModal(chosen);
  expandShelf(chosen.shelf);
}

// ------------------------------------------------------
// RENDERING SHELVES & WISHLIST
// ------------------------------------------------------

function createBookCard(book) {
  const div = document.createElement("div");
  div.className = "book-card";

  div.innerHTML = `
    ${book.coverData ? `<img src="${book.coverData}" class="book-card-cover" />` : ""}
    <div class="book-card-info">
      <div class="book-card-title">${book.title}</div>
      <div class="book-card-author">${book.author}</div>
      ${
        book.rating
          ? `<div class="book-card-stars">${"⭐".repeat(parseInt(book.rating))}</div>`
          : ""
      }
    </div>
  `;

  div.addEventListener("click", () => openBookModal(book));
  return div;
}

function renderShelf(shelfId) {
  const booksList = books.filter((b) => b.shelf === shelfId);
  booksList.sort((a, b) => {
    const strip = (t) =>
      (t || "").trim().replace(/^the\s+/i, "");
    return strip(a.title).localeCompare(strip(b.title), "en", { sensitivity: "base" });
  });
  const container = document.getElementById(`shelf-${shelfId}-books`);
  const countSpan = document.getElementById(`count-${shelfId}`);

  if (!container || !countSpan) return;

  countSpan.textContent = booksList.length;
  container.innerHTML = "";

  if (!booksList.length) {
    container.innerHTML = `<p class="empty-shelf">Empty shelf.</p>`;
    return;
  }

  booksList.forEach((b) => container.appendChild(createBookCard(b)));
}

function renderAllShelves() {
  renderShelf("read");
  renderShelf("havent");
}

function renderWishlist() {
  const wish = books.filter((b) => b.isWishlisted);
  wishlistList.innerHTML = "";

  if (!wish.length) {
    wishlistList.innerHTML = `<p class="empty-shelf">No wishlisted books.</p>`;
    return;
  }

  wish.forEach((book) => {
    const item = document.createElement("div");
    item.className = "wishlist-item";

    item.innerHTML = `
      ${book.coverData ? `<img src="${book.coverData}" class="wishlist-cover" />` : ""}
      <div class="wishlist-info">
        <div class="wishlist-title">${book.title}</div>
        <div class="wishlist-author">${book.author}</div>
        <button class="wishlist-bought-btn">Already Bought ✔</button>
      </div>
    `;

    item.addEventListener("click", (e) => {
      if (!e.target.classList.contains("wishlist-bought-btn")) {
        openBookModal(book);
      }
    });

    item
      .querySelector(".wishlist-bought-btn")
      .addEventListener("click", async () => {
        const newShelf =
          !book.shelf || book.shelf === "none" || book.shelf === ""
            ? "havent"
            : book.shelf;

        const { data, error } = await sb
          .from("books")
          .update({ isWishlisted: false, shelf: newShelf })
          .eq("id", book.id)
          .select()
          .single();

        if (error) {
          console.error(error);
          alert("Error updating book.");
          return;
        }

        Object.assign(book, data);
        renderAllShelves();
        renderWishlist();
      });

    wishlistList.appendChild(item);
  });
}


function expandShelf(shelfId) {
  document.querySelectorAll(".shelf-card").forEach((c) =>
    c.classList.remove("open")
  );

  const card = document.querySelector(`.shelf-card[data-shelf="${shelfId}"]`);
  if (card) card.classList.add("open");
}

function initShelfToggles() {
  document.querySelectorAll("[data-shelf-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const card = el.closest(".shelf-card");
      const openNow = card.classList.contains("open");

      document.querySelectorAll(".shelf-card").forEach((c) =>
        c.classList.remove("open")
      );

      if (!openNow) card.classList.add("open");
    });
  });
}


// ------------------------------------------------------
// ISBN LOOKUP (SIMPLE VERSION - OPENLIBRARY ONLY)
// ------------------------------------------------------

async function lookupIsbn(isbn) {
  isbn = isbn.trim();
  if (!isbn) return;

  scannedCoverUrl = null;
  coverSelectedMsg.style.display = "none";

  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) return;

    const data = await res.json();

    if (!addTitle.value && data.title) addTitle.value = data.title;

    if (!addAuthor.value && data.authors?.length) {
      const aKey = data.authors[0].key;
      try {
        const aRes = await fetch(`https://openlibrary.org${aKey}.json`);
        const aData = await aRes.json();
        if (aData.name) addAuthor.value = aData.name;
      } catch (_) {}
    }

    if (!addSummary.value) {
      const d = data.description;
      if (typeof d === "string") addSummary.value = d;
      else if (d?.value) addSummary.value = d.value;
    }

    if (data.covers?.length) {
      scannedCoverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
      coverSelectedMsg.style.display = "block";
      coverSelectedMsg.textContent = "Cover auto-selected (OpenLibrary)";
    }
  } catch (err) {
    console.warn("ISBN lookup failed:", err);
  }
}

// ------------------------------------------------------
// ADD / UPDATE BOOK
// ------------------------------------------------------

async function handleAddBook() {
  const title = addTitle.value.trim();
  const author = addAuthor.value.trim();

  if (!title || !author) {
    alert("Please add at least a title and an author.");
    return;
  }

  const editingId = addBookBtn.getAttribute("data-edit-id");

  const ratingVal = addRating.value.trim();
  const ratingNum = ratingVal ? parseInt(ratingVal, 10) : null;
  const shelfValue = addShelf.value || "none";

  let coverData = null;

  if (addCover.files[0]) {
    const file = addCover.files[0];
    coverData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else if (scannedCoverUrl) {
    try {
      const safeUrl = scannedCoverUrl.replace(/^http:\/\//i, "https://");
      const blob = await fetch(safeUrl).then((r) => r.blob());
      coverData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Could not load scanned cover image", e);
    }
  }

  const payload = {
    title,
    author,
    genre: addGenre.value.trim() || null,
    summary: addSummary.value.trim() || null,
    rating: ratingNum,
    shelf: shelfValue,
    isWishlisted: addFormWishlist,
    coverData,
    isbn: addIsbn.value.trim() || null,
  };

  // UPDATE
  if (editingId) {
    const { data, error } = await sb
      .from("books")
      .update(payload)
      .eq("id", editingId)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Error updating book.");
      return;
    }

    const idx = books.findIndex((b) => b.id == editingId);
    if (idx !== -1) books[idx] = data;

    renderAllShelves();
    renderWishlist();

    addBookBtn.removeAttribute("data-edit-id");
    closeAddModal();
    return;
  }

  // INSERT
  const { data, error } = await sb.from("books").insert(payload).select().single();

  if (error) {
    console.error(error);
    alert("Error adding book.");
    return;
  }

  books.push(data);
  renderAllShelves();
  renderWishlist();

  addBookForm.reset();
  addShelf.value = "";
  scannedCoverUrl = null;
  coverSelectedMsg.style.display = "none";
  resetWishlistFormButton();
  closeAddModal();
}

// ------------------------------------------------------
// LOAD FROM SUPABASE
// ------------------------------------------------------

async function loadBooksFromSupabase() {
  const { data, error } = await sb.from("books").select("*");

  if (error) {
    console.error(error);
    books = [];
  } else {
    books = data || [];
  }

  renderAllShelves();
  renderWishlist();
}

// ------------------------------------------------------
// SEARCH (auto-search minimalista)
// ------------------------------------------------------

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();

  if (q.length < 2) {
    restoreShelvesView();
    return;
  }

  const results = books.filter((b) => {
    const t = `${b.title || ""} ${b.author || ""} ${b.genre || ""} ${
      b.summary || ""
    }`.toLowerCase();
    return t.includes(q);
  });

  showSearchResults(results);
});

function showSearchResults(results) {
  shelvesContainer.innerHTML = `
    <div class="search-results-card">
      <h3>${results.length} book(s) found</h3>
      <button id="backToShelves" class="btn-back">← Back</button>
      <div class="search-results-list"></div>
    </div>
  `;

  const list = document.querySelector(".search-results-list");

  results.forEach((book) => {
    const item = document.createElement("div");
    item.className = "result-item";

    item.innerHTML = `
      ${book.coverData ? `<img src="${book.coverData}" class="result-cover" />` : ""}
      <div>
        <div class="result-title">${book.title}</div>
        <div class="result-author">${book.author || ""}</div>
        <div class="result-shelf">${prettyShelf(book.shelf)}</div>
      </div>
    `;

    item.addEventListener("click", () => openBookModal(book));
    list.appendChild(item);
  });

  // Botón Back: limpia el search y restaura
  document.getElementById("backToShelves").onclick = () => {
    searchInput.value = "";
    restoreShelvesView();
  };
}

function restoreShelvesView() {
  shelvesContainer.innerHTML = `
    <div class="shelf-card" data-shelf="read">
      <div class="shelf-main" data-shelf-toggle>
        <img src="img/shelf-read.png" class="shelf-icon" />
        <div class="shelf-text">
          <div class="shelf-title">Read</div>
          <div class="shelf-meta"><span id="count-read">0</span> books</div>
        </div>
        <div class="shelf-chevron">▾</div>
      </div>
      <div class="shelf-books" id="shelf-read-books"></div>
    </div>

    <div class="shelf-card" data-shelf="havent">
      <div class="shelf-main" data-shelf-toggle>
        <img src="img/shelf-havent.png" class="shelf-icon" />
        <div class="shelf-text">
          <div class="shelf-title">Haven't read</div>
          <div class="shelf-meta"><span id="count-havent">0</span> books</div>
        </div>
        <div class="shelf-chevron">▾</div>
      </div>
      <div class="shelf-books" id="shelf-havent-books"></div>
    </div>
  `;

  // Re-activar toggles de los shelves
  initShelfToggles();

  renderAllShelves();
}

// ------------------------------------------------------
// GLOBAL EVENT LISTENERS (botones que se habían perdido)
// ------------------------------------------------------

if (addBookFab) {
  addBookFab.addEventListener("click", openAddModal);
}

if (closeAddModalBtn) {
  closeAddModalBtn.addEventListener("click", closeAddModal);
}

if (addModal) {
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) closeAddModal();
  });
}

if (closeBookModalBtn) {
  closeBookModalBtn.addEventListener("click", closeBookModal);
}

if (bookModal) {
  bookModal.addEventListener("click", (e) => {
    if (e.target === bookModal) closeBookModal();
  });
}

if (addBookBtn) {
  addBookBtn.addEventListener("click", () => {
    handleAddBook().catch((err) => {
      console.error(err);
      alert("Unexpected error adding book.");
    });
  });
}

if (addCover) {
  addCover.addEventListener("change", () => {
    if (addCover.files.length > 0) {
      coverSelectedMsg.style.display = "block";
      coverSelectedMsg.textContent = "Cover selected!";
      scannedCoverUrl = null; // prefer manual upload
    } else {
      coverSelectedMsg.style.display = "none";
    }
  });
}

if (randomPickBtn) {
  randomPickBtn.addEventListener("click", randomPick);
}

if (wishlistBtn) {
  wishlistBtn.addEventListener("click", () => {
    renderWishlist();
    wishlistPanel.classList.add("open");
    bookModal.classList.add("hidden");
  });
}

if (closeWishlist) {
  closeWishlist.addEventListener("click", () =>
    wishlistPanel.classList.remove("open")
  );
}

// ------------------------------------------------------
// INIT
// ------------------------------------------------------

initShelfToggles();
loadBooksFromSupabase();