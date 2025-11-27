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
let scannedCoverUrl = null; // URL from Google Books or OpenLibrary

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

// ------------------------------------------------------
// WISHLIST BUTTON
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

  let wishlistButtonHTML = "";
  if (!book.shelf || book.shelf === "none" || book.shelf === "") {
    const label = book.isWishlisted
      ? "♥ Remove from Wishlist"
      : "♡ Add to Wishlist";
    wishlistButtonHTML = `<button class="wishlist-toggle-btn" id="wishlistToggleBtn">${label}</button>`;
  }

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
          ${wishlistButtonHTML}
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

    addFormWishlist = !!book.isWishlisted;
    wishlistFormBtn.textContent = book.isWishlisted
      ? "♥ Wishlisted!"
      : "♡ Add to Wishlist";
    wishlistFormBtn.style.background = book.isWishlisted ? "#4c1d95" : "#1e1b4b";

    addBookBtn.setAttribute("data-edit-id", book.id);

    scannedCoverUrl = null;
    coverSelectedMsg.style.display = "none";

    addModal.classList.remove("hidden");
  };

  // Wishlist toggle (for pure wishlist items)
  const toggleBtn = document.getElementById("wishlistToggleBtn");
  if (toggleBtn) {
    toggleBtn.onclick = async () => {
      const newValue = !book.isWishlisted;

      const { data, error } = await sb
        .from("books")
        .update({ isWishlisted: newValue })
        .eq("id", book.id)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Error updating wishlist.");
        return;
      }

      Object.assign(book, data);
      renderWishlist();
      openBookModal(book);
    };
  }

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
// RENDERING
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
  const container = document.getElementById(`shelf-${shelfId}-books`);
  const countSpan = document.getElementById(`count-${shelfId}`);

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

// ------------------------------------------------------
// COVER LOOKUP HELPERS (GOOGLE + OPENLIBRARY)
// ------------------------------------------------------

function isEmpty(value) {
  return !value || !value.trim || !value.trim();
}

async function fillFromGoogleBooks(isbn) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(
    isbn
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Google Books request failed");

  const json = await res.json();
  if (!json.items || !json.items.length) throw new Error("No Google Books items");

  const volume = json.items[0].volumeInfo || {};

  // Title
  if (isEmpty(addTitle.value) && volume.title) {
    addTitle.value = volume.title;
  }

  // Author
  if (isEmpty(addAuthor.value) && volume.authors && volume.authors.length) {
    addAuthor.value = volume.authors.join(", ");
  }

  // Description
  if (isEmpty(addSummary.value) && volume.description) {
    addSummary.value = volume.description;
  }

  // Cover
  scannedCoverUrl = null;
  if (volume.imageLinks) {
    scannedCoverUrl =
      volume.imageLinks.thumbnail ||
      volume.imageLinks.smallThumbnail ||
      null;
  }

  if (scannedCoverUrl) {
    coverSelectedMsg.textContent = "Cover selected (Google Books)!";
    coverSelectedMsg.style.display = "block";
  }
}

async function fillFromOpenLibrary(isbn) {
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!res.ok) throw new Error("OpenLibrary request failed");

  const data = await res.json();

  // Title
  if (isEmpty(addTitle.value) && data.title) addTitle.value = data.title;

  // Author
  if (isEmpty(addAuthor.value) && data.authors?.length) {
    try {
      const key = data.authors[0].key; // "/authors/OLxxx"
      const aRes = await fetch(`https://openlibrary.org${key}.json`);
      if (aRes.ok) {
        const a = await aRes.json();
        if (a.name) addAuthor.value = a.name;
      }
    } catch (e) {
      console.warn("OpenLibrary author lookup failed", e);
    }
  }

  // Description
  if (isEmpty(addSummary.value)) {
    if (typeof data.description === "string") {
      addSummary.value = data.description;
    } else if (data.description?.value) {
      addSummary.value = data.description.value;
    }
  }

  // Cover
  if (!scannedCoverUrl && data.covers?.length) {
    scannedCoverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
  }

  if (scannedCoverUrl) {
    coverSelectedMsg.textContent = "Cover selected (OpenLibrary)!";
    coverSelectedMsg.style.display = "block";
  }
}

async function lookupIsbn(isbn) {
  // Reset previous cover
  scannedCoverUrl = null;
  coverSelectedMsg.style.display = "none";

  // Clean input
  isbn = isbn.trim();

  // ----------------------------
  // 1) TRY AMAZON (via proxy)
  // ----------------------------
  try {
    const amazonURL = `https://www.amazon.com/dp/${isbn}`;
    const proxy = `https://cors.isomorphic-git.org/${amazonURL}`;

    const amazonRes = await fetch(proxy);
    const html = await amazonRes.text();

    // Amazon cover usually appears in: id="landingImage"
    const match = html.match(/id="landingImage".*?src="(https.*?)"/);

    if (match && match[1]) {
      scannedCoverUrl = match[1].replace("http://", "https://");

      coverSelectedMsg.textContent = "Cover selected (Amazon)";
      coverSelectedMsg.style.display = "block";

      console.log("Amazon cover found:", scannedCoverUrl);
    }
  } catch (e) {
    console.warn("Amazon lookup failed:", e);
  }

  // ----------------------------------------
  // If Amazon SUCCESS → fill only title/author
  // ----------------------------------------
  if (scannedCoverUrl) {
    // We still get title/author from OpenLibrary because Amazon blocks text extracting
    try {
      const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (res.ok) {
        const data = await res.json();

        if (!addTitle.value && data.title) addTitle.value = data.title;

        if (!addAuthor.value && data.authors?.length) {
          const aRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
          const a = await aRes.json();
          if (a.name) addAuthor.value = a.name;
        }

        if (!addSummary.value) {
          const d = data.description;
          if (typeof d === "string") addSummary.value = d;
          else if (d?.value) addSummary.value = d.value;
        }
      }
    } catch (err) {
      console.warn("OpenLibrary metadata fallback failed:", err);
    }

    return; // AMAZON SUCCESS, stop here
  }

  // ------------------------------------------------
  // 2) AMAZON FAILED → USE OPENLIBRARY COMPLETELY
  // ------------------------------------------------
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);

    if (!res.ok) {
      console.warn("No book found in OpenLibrary.");
      return;
    }

    const data = await res.json();

    // -------- TITLE --------
    if (!addTitle.value && data.title) addTitle.value = data.title;

    // -------- AUTHOR --------
    if (!addAuthor.value && data.authors?.length) {
      try {
        const aRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
        const a = await aRes.json();
        if (a.name) addAuthor.value = a.name;
      } catch (e) {
        console.warn("Author lookup error:", e);
      }
    }

    // -------- SUMMARY --------
    if (!addSummary.value) {
      const d = data.description;
      if (typeof d === "string") addSummary.value = d;
      else if (d?.value) addSummary.value = d.value;
    }

    // -------- COVER --------
    scannedCoverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    coverSelectedMsg.textContent = "Cover selected (OpenLibrary)";
    coverSelectedMsg.style.display = "block";

    console.log("OpenLibrary cover:", scannedCoverUrl);

  } catch (err) {
    console.error("OpenLibrary error:", err);
  }
}

// When user types ISBN → auto-fetch info
addIsbn.addEventListener("input", () => {
  const raw = addIsbn.value.replace(/[^\dX]/gi, "");
  if (raw.length === 10 || raw.length === 13) {
    lookupIsbn(raw);
  }
});

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
      const blob = await fetch(safeUrl).then(r => r.blob());
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

    const idx = books.findIndex((b) => b.id === editingId);
    if (idx !== -1) books[idx] = data;

    renderAllShelves();
    renderWishlist();

    addBookBtn.removeAttribute("data-edit-id");
    closeAddModal();
    return;
  }

  // INSERT
  const { data, error } = await sb
    .from("books")
    .insert(payload)
    .select()
    .single();

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
  const { data, error } = await sb
    .from("books")
    .select("*")
    .order("dateAdded", { ascending: true });

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
// EVENT LISTENERS
// ------------------------------------------------------

addBookFab.addEventListener("click", openAddModal);
closeAddModalBtn.addEventListener("click", closeAddModal);

addModal.addEventListener("click", (e) => {
  if (e.target === addModal) closeAddModal();
});

addBookBtn.addEventListener("click", () => {
  handleAddBook().catch((err) => {
    console.error(err);
    alert("Unexpected error adding book.");
  });
});

addCover.addEventListener("change", () => {
  if (addCover.files.length > 0) {
    coverSelectedMsg.style.display = "block";
    coverSelectedMsg.textContent = "Cover selected!";
    scannedCoverUrl = null; // prefer manual upload
  } else {
    coverSelectedMsg.style.display = "none";
  }
});

closeBookModalBtn.addEventListener("click", closeBookModal);
bookModal.addEventListener("click", (e) => {
  if (e.target === bookModal) closeBookModal();
});

randomPickBtn.addEventListener("click", randomPick);

wishlistBtn.addEventListener("click", () => {
  renderWishlist();
  wishlistPanel.classList.add("open");

  bookModal.classList.add("hidden");
});

closeWishlist.addEventListener("click", () =>
  wishlistPanel.classList.remove("open")
);

// Expand shelf toggle
document.querySelectorAll("[data-shelf-toggle]").forEach((el) => {
  el.addEventListener("click", () => {
    const parent = el.closest(".shelf-card");
    const openNow = parent.classList.contains("open");

    document.querySelectorAll(".shelf-card").forEach((c) =>
      c.classList.remove("open")
    );

    if (!openNow) parent.classList.add("open");
  });
});

// ------------------------------------------------------
// INIT
// ------------------------------------------------------

loadBooksFromSupabase();