// --------------------
// LibraryHub - Book Borrowing System (Firebase CDN)
// --------------------

// Add these script tags to your HTML before this file:
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBLamszJpA8aqXFsji5t4QTil2yeuQCayg",
  authDomain: "foundit-app-86059.firebaseapp.com",
  projectId: "foundit-app-86059",
  storageBucket: "foundit-app-86059.firebasestorage.app",
  messagingSenderId: "33358051152",
  appId: "1:33358051152:web:1bacd4874c0439f82e1e55",
  measurementId: "G-F32KP2S6VK"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global State ---
let currentUser = null;
let currentUserRole = null;
let editingBookId = null;
let allBooks = [];
let currentCategory = "";

// --- Bootstrap Modal Instances ---
let bookModalInstance = null;
let viewModalInstance = null;
let profileModalInstance = null;

// --- DOM Elements ---
const authPage = document.getElementById("authPage");
const mainApp = document.getElementById("mainApp");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const adminLoginTab = document.getElementById("adminLoginTab");
const browseSection = document.getElementById("browseSection");
const myBooksSection = document.getElementById("myBooksSection");
const adminPanel = document.getElementById("adminPanel");
const bookModal = document.getElementById("bookModal");
const viewModal = document.getElementById("viewModal");
const profileModal = document.getElementById("profileModal");
const bookForm = document.getElementById("bookForm");

// --- Initialize Bootstrap Modals ---
document.addEventListener('DOMContentLoaded', () => {
  if (typeof bootstrap !== 'undefined') {
    bookModalInstance = new bootstrap.Modal(bookModal);
    viewModalInstance = new bootstrap.Modal(viewModal);
    profileModalInstance = new bootstrap.Modal(profileModal);
  }
});

// --------------------
// AUTH STATE LISTENER
// --------------------
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (user) {
    authPage.classList.add("hidden");
    mainApp.classList.remove("hidden");

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      currentUserRole = userData?.role || "user";

      const currentUserElement = document.getElementById("currentUser");
      if (currentUserElement) currentUserElement.textContent = userData?.name || user.email;

      const navAdminItem = document.getElementById("navAdminItem");
      const navMyBooksItem = document.getElementById("navMyBooksItem");
      
      if (currentUserRole === "admin") {
        navAdminItem?.classList.remove("hidden");
        navMyBooksItem?.classList.add("hidden");
        
        browseSection.classList.add("hidden");
        myBooksSection.classList.add("hidden");
        adminPanel.classList.remove("hidden");
        loadAdminPanel();
      } else {
        navAdminItem?.classList.add("hidden");
        navMyBooksItem?.classList.remove("hidden");
        
        browseSection.classList.remove("hidden");
        myBooksSection.classList.add("hidden");
        adminPanel.classList.add("hidden");
        loadBooks();
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  } else {
    authPage.classList.remove("hidden");
    mainApp.classList.add("hidden");
    currentUserRole = null;
  }
});

// --------------------
// LOGIN / SIGNUP TAB SWITCHING
// --------------------
loginTab.addEventListener("click", () => {
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  adminLoginForm.classList.add("hidden");
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  adminLoginTab.classList.remove("active");
});

signupTab.addEventListener("click", () => {
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  adminLoginForm.classList.add("hidden");
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  adminLoginTab.classList.remove("active");
});

adminLoginTab.addEventListener("click", () => {
  adminLoginForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  signupForm.classList.add("hidden");
  adminLoginTab.classList.add("active");
  loginTab.classList.remove("active");
  signupTab.classList.remove("active");
});

// --------------------
// AUTH FUNCTIONS
// --------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById("loginError").textContent = "";
  } catch (err) {
    document.getElementById("loginError").textContent = err.message;
  }
});

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminLoginEmail").value;
  const password = document.getElementById("adminLoginPassword").value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const userDoc = await db.collection("users").doc(userCredential.user.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== "admin") {
      await auth.signOut();
      document.getElementById("adminLoginError").textContent = "Access denied. Admin credentials required.";
      return;
    }

    document.getElementById("adminLoginError").textContent = "";
  } catch (err) {
    document.getElementById("adminLoginError").textContent = err.message;
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const phone = document.getElementById("signupPhone").value;
  const memberId = document.getElementById("signupMemberId").value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(userCredential.user.uid).set({
      name, email, phone, memberId, role: "user", borrowedBooks: [], createdAt: new Date().toISOString()
    });
    document.getElementById("signupError").textContent = "";
  } catch (err) {
    document.getElementById("signupError").textContent = err.message;
  }
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  if (profileModalInstance) {
    profileModalInstance.hide();
  }
  auth.signOut();
});

// --------------------
// CATEGORY FILTER FUNCTIONALITY
// --------------------
const categoryFilter = document.getElementById("categoryFilter");

if (categoryFilter) {
  categoryFilter.addEventListener("change", (e) => {
    currentCategory = e.target.value;
    filterAndDisplayBooks();
  });
}

function filterAndDisplayBooks() {
  if (currentCategory === "") {
    displayBooks(allBooks);
    return;
  }

  const filteredBooks = allBooks.filter(book => {
    return book.category === currentCategory;
  });

  displayBooks(filteredBooks);
}

function displayBooks(books) {
  const grid = document.getElementById("booksGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (books.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px;">
      <h3 style="color:#666;">${currentCategory ? `No books found in "${currentCategory}" category` : 'No books available'}</h3>
      ${currentCategory ? `<p style="color:#999; margin-top: 10px;">Try selecting a different category</p>` : ''}
    </div>`;
    return;
  }

  books.forEach(async book => {
    const card = await createBookCard(book.id, book);
    grid.appendChild(card);
  });
}

// Profile button click handler
document.getElementById("student-profile")?.addEventListener("click", async () => {
  if (!currentUser) return;
  
  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.data();
    
    const profileContent = document.getElementById("profileContent");
    if (profileContent) {
      profileContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #333;">
            <strong>Full Name:</strong> ${userData?.name || 'N/A'}
          </p>
          <p style="font-size: 16px; margin-bottom: 8px; color: #555;">
            <strong>Email:</strong> ${userData?.email || currentUser.email}
          </p>
          <p style="font-size: 16px; margin-bottom: 8px; color: #555;">
            <strong>Password:</strong> ••••••••
          </p>
          <p style="font-size: 16px; margin-bottom: 8px; color: #555;">
            <strong>Phone:</strong> ${userData?.phone || 'N/A'}
          </p>
          <p style="font-size: 16px; margin-bottom: 0; color: #555;">
            <strong>Student ID:</strong> ${userData?.memberId || 'N/A'}
          </p>
        </div>
      `;
    }
    
    if (profileModalInstance) {
      profileModalInstance.show();
    } else {
      const modal = new bootstrap.Modal(profileModal);
      modal.show();
    }
  } catch (err) {
    console.error("Error loading profile:", err);
    alert("Error loading profile: " + err.message);
  }
});

// --------------------
// NAVIGATION
// --------------------
document.getElementById("navBrowse")?.addEventListener("click", (e) => {
  e.preventDefault();
  browseSection.classList.remove("hidden");
  myBooksSection.classList.add("hidden");
  adminPanel.classList.add("hidden");
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) categoryFilter.value = "";
  currentCategory = "";
  loadBooks();
});

document.getElementById("navMyBooks")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (currentUserRole !== "admin") {
    browseSection.classList.add("hidden");
    myBooksSection.classList.remove("hidden");
    adminPanel.classList.add("hidden");
    loadMyBooks();
  }
});

document.getElementById("navAdmin")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (currentUserRole === "admin") {
    browseSection.classList.add("hidden");
    myBooksSection.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loadAdminPanel();
  }
});

// --------------------
// LOAD BOOKS
// --------------------
function loadBooks() {
  db.collection("books").onSnapshot((snapshot) => {
    const grid = document.getElementById("booksGrid");
    if (!grid) return;
    
    allBooks = [];
    
    snapshot.forEach(docSnap => {
      allBooks.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (currentCategory) {
      filterAndDisplayBooks();
    } else {
      displayBooks(allBooks);
    }
  });
}

// --------------------
// CREATE BOOK CARD
// --------------------
async function createBookCard(id, book) {
  const card = document.createElement("div");
  card.className = "book-card";
  const availableCopies = (book.totalCopies || 0) - (book.borrowedCopies || 0);
  const isAvailable = availableCopies > 0;
  const isAdmin = currentUserRole === "admin";

  card.innerHTML = `
    <div class="book-details">
      <h3 class="fw-bolder">${book.title}</h3>
      <div> <p><span class = "fw-semibold" style = "color: #000000;">Author</span>: ${book.author}</p>
      <p><span class = "fw-semibold" style = "color: #000000;">Category:</span> ${book.category}</p>
      <p><span class = "fw-semibold" style = "color: #000000;">Available</span>: ${availableCopies} / ${book.totalCopies || 0}</p>
      </div>
     
      <div class="book-actions mt-3">
        <button class="view-btn" data-id="${id}">View Details</button>
        ${!isAdmin && isAvailable ? `<button class="btn borrow-btn" data-id="${id}">Borrow</button>` : ''}
        ${isAdmin && !isAvailable ? `<span style="color: #dc3545; font-size: 12px;">All copies borrowed</span>` : ''}
        ${isAdmin && isAvailable ? `<span style="color: #28a745; font-size: 12px;">${availableCopies} available</span>` : ''}
      </div>
    </div>
  `;

  const viewBtn = card.querySelector(".view-btn");
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      viewBook(id);
    });
  }
  
  if (!isAdmin && isAvailable) {
    const borrowBtn = card.querySelector(".borrow-btn");
    if (borrowBtn) {
      borrowBtn.addEventListener("click", () => {
        borrowBook(id, book);
      });
    }
  }

  return card;
}

// --------------------
// VIEW BOOK DETAILS
// --------------------
async function viewBook(id) {
  try {
    const bookDoc = await db.collection("books").doc(id).get();
    
    if (!bookDoc.exists) {
      alert("Book not found!");
      return;
    }
    
    const book = bookDoc.data();
    const availableCopies = (book.totalCopies || 0) - (book.borrowedCopies || 0);
    
    const viewContent = document.getElementById("viewBookContent");
    if (!viewContent) {
      console.error("viewBookContent element not found!");
      return;
    }
    
    viewContent.innerHTML = `
      <div style="line-height: 1.8;">
        <h2 class="fw-bolder" style="color: #556B2F; margin-bottom: 20px; border-bottom: 2px solid #b5b5b5ff; padding-bottom: 10px;">
          ${book.title}
        </h2>
        <p><strong style="color: #000000ff;">Author:</strong> ${book.author || 'N/A'}</p>
        <p><strong style="color: #000000ff;">Category:</strong> ${book.category || 'N/A'}</p>
        <p><strong style="color: #000000ff;">ISBN:</strong> ${book.isbn || 'N/A'}</p>
        <p><strong style="color: #000000ff;">Publisher:</strong> ${book.publisher || 'N/A'}</p>
        <p><strong style="color: #000000ff;">Publication Year:</strong> ${book.year || 'N/A'}</p>
        <p><strong style="color: #000000ff;">Available Copies:</strong> 
          <span style="color: ${availableCopies > 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
            ${availableCopies} / ${book.totalCopies || 0}
          </span>
        </p>
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <strong style="color: #000000ff;">Description:</strong>
          <p style="margin-top: 10px; color: #333;">${book.description || 'No description available'}</p>
        </div>
      </div>
    `;
    
    if (viewModalInstance) {
      viewModalInstance.show();
    } else {
      const modal = new bootstrap.Modal(viewModal);
      modal.show();
    }
    
  } catch (err) {
    console.error("Error viewing book:", err);
    alert("Error loading book details: " + err.message);
  }
}

// --------------------
// BORROW BOOK
// --------------------
async function borrowBook(bookId, book) {
  if (!confirm(`Borrow "${book.title}"?`)) return;
  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    const userData = userDoc.data();

    await db.collection("borrowings").add({
      bookId,
      bookTitle: book.title,
      userId: currentUser.uid,
      userName: userData?.name || currentUser.email,
      borrowDate: firebase.firestore.Timestamp.now(),
      dueDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 14*24*60*60*1000)),
      status: "borrowed"
    });

    await db.collection("books").doc(bookId).update({ 
      borrowedCopies: firebase.firestore.FieldValue.increment(1) 
    });
    
    alert("Book borrowed successfully! Due date: " + new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString());
  } catch (err) {
    console.error(err);
    alert("Error borrowing book: " + err.message);
  }
}

// --------------------
// MY BOOKS
// --------------------
async function loadMyBooks() {
  const myBooksList = document.getElementById("borrowedBooksList");
  if (!myBooksList || !currentUser) return;

  db.collection("borrowings")
    .where("userId", "==", currentUser.uid)
    .onSnapshot((snapshot) => {
      myBooksList.innerHTML = "";

      if (snapshot.empty) {
        myBooksList.innerHTML = `<div class="borrowed-list" style="text-align:center; padding: 40px; color:#666;">
          <h3>You haven't borrowed any books yet</h3></div>`;
        return;
      }

      snapshot.forEach(docSnap => {
        const borrowing = { id: docSnap.id, ...docSnap.data() };
        const item = document.createElement("div");
        item.className = "borrowed-list";
        
        const borrowDate = borrowing.borrowDate?.toDate().toLocaleDateString() || "N/A";
        const dueDate = borrowing.dueDate?.toDate().toLocaleDateString() || "N/A";
        const isOverdue = borrowing.dueDate?.toDate() < new Date() && borrowing.status === "borrowed";

        item.innerHTML = `
          <div class="borrowed-item">
            <div class="borrowed-info">
              <h4 class="fw-bolder pb-3 fs-4">${borrowing.bookTitle}</h4>
              <p class="fs-6 fw-bold">Borrowed: ${borrowDate}</p>
              <p class="fs-6 fw-bold" style="color: ${isOverdue ? '#dc3545' : '#666'}; font-weight: ${isOverdue ? 'bold' : 'normal'};">
                Due: ${dueDate} ${isOverdue ? '(OVERDUE!)' : ''}
              </p>
            </div>
          </div>
        `;

        myBooksList.appendChild(item);
      });
    });
}

// --------------------
// ADMIN PANEL
// --------------------
async function loadAdminPanel() {
  const adminPanel = document.getElementById("adminPanel");
  if (!adminPanel) return;

  const booksSnap = await db.collection("books").get();
  const borrowingsSnap = await db.collection("borrowings").get();
  
  const totalBooks = booksSnap.size;
  const activeBorrowings = borrowingsSnap.docs.filter(doc => doc.data().status === "borrowed").length;
  const totalBorrowings = borrowingsSnap.size;

  adminPanel.innerHTML = `
    <button id="addBookBtn" class="btn fw-semibold" style="margin-bottom: 20px;">+ Add New Book</button>
    <h2 style="margin-bottom: 30px; color: #556B2F; font-weight: bold;">Admin Panel - Library Overview</h2>
    <div class="admin-stats">
      <div class="stat-card">
        <h3 class="fs-4 fw-bold" style="color:#556B2F">Total Books</h3>
        <p>${totalBooks}</p>
      </div>
      <div class="stat-card">
        <h3 class="fs-4 fw-bold" style="color:#556B2F">Active Borrowings</h3>
        <p>${activeBorrowings}</p>
      </div>
      <div class="stat-card">
        <h3 class="fs-4 fw-bold" style="color:#556B2F">Total Borrowings</h3>
        <p>${totalBorrowings}</p>
      </div>
    </div>

    <div class="admin-table">
      <h3>All Books in Library</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; min-width: 800px;">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>ISBN</th>
              <th>Total Copies</th>
              <th>Borrowed</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="booksTableBody"></tbody>
        </table>
      </div>
    </div>

    <div class="admin-table" style="margin-top: 40px;">
      <h3>All Borrowings</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; min-width: 800px;">
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Borrower</th>
              <th>Borrow Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="borrowingsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const addBookBtn = document.getElementById("addBookBtn");
  if (addBookBtn) {
    addBookBtn.addEventListener("click", () => {
      editingBookId = null;
      bookForm.reset();
      const modalTitle = document.getElementById("modalTitle");
      if (modalTitle) {
        modalTitle.textContent = "Add New Book";
      }
      if (bookModalInstance) {
        bookModalInstance.show();
      } else {
        const modal = new bootstrap.Modal(bookModal);
        modal.show();
      }
    });
  }

  db.collection("books").onSnapshot((snapshot) => {
    const tbody = document.getElementById("booksTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color:#666;">No books found</td></tr>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const book = { id: docSnap.id, ...docSnap.data() };
      const availableCopies = (book.totalCopies || 0) - (book.borrowedCopies || 0);
      const row = document.createElement("tr");
      
      row.innerHTML = `
        <td><strong>${book.title}</strong></td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td>${book.isbn}</td>
        <td>${book.totalCopies || 0}</td>
        <td>${book.borrowedCopies || 0}</td>
        <td style="color: ${availableCopies > 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
          ${availableCopies}
        </td>
        <td>
          <button class="btn btn-warning btn-sm edit-book-btn" data-id="${book.id}" style="margin-right: 5px;">Edit</button>
          <button class="btn btn-danger btn-sm delete-book-btn" data-id="${book.id}">Delete</button>
        </td>
      `;

      tbody.appendChild(row);
    });

    document.querySelectorAll(".edit-book-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const bookId = e.target.dataset.id;
        const bookDoc = await db.collection("books").doc(bookId).get();
        if (bookDoc.exists) {
          editBook(bookId, bookDoc.data());
        }
      });
    });

    document.querySelectorAll(".delete-book-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const bookId = e.target.dataset.id;
        const bookDoc = await db.collection("books").doc(bookId).get();
        if (bookDoc.exists) {
          deleteBook(bookId, bookDoc.data());
        }
      });
    });
  });

  db.collection("borrowings").onSnapshot((snapshot) => {
    const tbody = document.getElementById("borrowingsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color:#666;">No borrowings found</td></tr>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const borrowing = { id: docSnap.id, ...docSnap.data() };
      const row = document.createElement("tr");
      
      const borrowDate = borrowing.borrowDate?.toDate().toLocaleDateString() || "N/A";
      const dueDate = borrowing.dueDate?.toDate().toLocaleDateString() || "N/A";
      const isOverdue = borrowing.dueDate?.toDate() < new Date() && borrowing.status === "borrowed";

      row.innerHTML = `
        <td><strong>${borrowing.bookTitle}</strong></td>
        <td>${borrowing.userName}</td>
        <td>${borrowDate}</td>
        <td style="color: ${isOverdue ? '#dc3545' : '#333'}; font-weight: ${isOverdue ? 'bold' : 'normal'};">
          ${dueDate} ${isOverdue ? '(OVERDUE)' : ''}
        </td>
        <td><span class="book-status status-${borrowing.status}">${borrowing.status}</span></td>
        <td>
          ${borrowing.status === "borrowed" ? 
            `<button class="btn btn-success btn-sm return-btn" data-id="${borrowing.id}" data-book-id="${borrowing.bookId}">
              Mark Returned
            </button>` : 
            '<span style="color: #28a745;">✓ Returned</span>'}
        </td>
      `;

      tbody.appendChild(row);
    });

    document.querySelectorAll(".return-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const borrowingId = e.target.dataset.id;
        const bookId = e.target.dataset.bookId;
        await markAsReturned(borrowingId, bookId);
      });
    });
  });
}

async function markAsReturned(borrowingId, bookId) {
  if (!confirm("Mark this book as returned?")) return;
  try {
    await db.collection("borrowings").doc(borrowingId).update({
      status: "returned",
      returnDate: firebase.firestore.Timestamp.now()
    });
    await db.collection("books").doc(bookId).update({
      borrowedCopies: firebase.firestore.FieldValue.increment(-1)
    });
    alert("Book marked as returned successfully!");
  } catch (err) {
    console.error("Error returning book:", err);
    alert("Error marking book as returned: " + err.message);
  }
}

// --------------------
// EDIT BOOK
// --------------------
async function editBook(id, book) {
  editingBookId = id;
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) {
    modalTitle.textContent = "Edit Book";
  }
  document.getElementById("bookTitle").value = book.title || "";
  document.getElementById("bookAuthor").value = book.author || "";
  document.getElementById("bookISBN").value = book.isbn || "";
  document.getElementById("bookCategory").value = book.category || "";
  document.getElementById("bookPublisher").value = book.publisher || "";
  document.getElementById("bookYear").value = book.year || "";
  document.getElementById("bookCopies").value = book.totalCopies || 1;
  document.getElementById("bookDescription").value = book.description || "";
  
  if (bookModalInstance) {
    bookModalInstance.show();
  } else {
    const modal = new bootstrap.Modal(bookModal);
    modal.show();
  }
}

// --------------------
// DELETE BOOK
// --------------------
async function deleteBook(id, book) {
  if (!confirm(`Delete "${book.title}"? This action cannot be undone.`)) return;
  try {
    await db.collection("books").doc(id).delete();
    alert("Book deleted successfully!");
  } catch (err) {
    console.error("Error deleting book:", err);
    alert("Error deleting book: " + err.message);
  }
}

// --------------------
// BOOK FORM SUBMISSION
// --------------------
if (bookForm) {
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bookData = {
      title: document.getElementById("bookTitle").value.trim(),
      author: document.getElementById("bookAuthor").value.trim(),
      isbn: document.getElementById("bookISBN").value.trim(),
      category: document.getElementById("bookCategory").value,
      publisher: document.getElementById("bookPublisher").value.trim(),
      year: parseInt(document.getElementById("bookYear").value) || new Date().getFullYear(),
      totalCopies: parseInt(document.getElementById("bookCopies").value) || 1,
      description: document.getElementById("bookDescription").value.trim(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingBookId) {
        const currentBookDoc = await db.collection("books").doc(editingBookId).get();
        const currentBook = currentBookDoc.data();
        bookData.borrowedCopies = currentBook?.borrowedCopies || 0;
        
        await db.collection("books").doc(editingBookId).update(bookData);
        alert("Book updated successfully!");
      } else {
        bookData.borrowedCopies = 0;
        bookData.createdAt = new Date().toISOString();
        await db.collection("books").add(bookData);
        alert("Book added successfully!");
      }
      
      if (bookModalInstance) {
        bookModalInstance.hide();
      } else {
        const modal = bootstrap.Modal.getInstance(bookModal);
        if (modal) modal.hide();
      }
      
      bookForm.reset();
      editingBookId = null;
    } catch (err) {
      console.error("Error saving book:", err);
      alert("Error saving book: " + err.message);
    }
  });
}

// --------------------
// MODAL EVENT LISTENERS
// --------------------
bookModal.addEventListener('hidden.bs.modal', function () {
  bookForm.reset();
  editingBookId = null;
});