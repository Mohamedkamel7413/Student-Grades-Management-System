// ===================
// Config
// ===================
const STORAGE_KEY = "grades_manager_students_v1";

// ===================
// State
// ===================
let students = [];          // master list (saved)
let viewStudents = [];      // filtered + sorted list for rendering

// ===================
// Elements
// ===================
const studentForm = document.getElementById("studentForm");
const nameInput = document.getElementById("nameInput");
const mathInput = document.getElementById("mathInput");
const englishInput = document.getElementById("englishInput");
const scienceInput = document.getElementById("scienceInput");
const errorMsg = document.getElementById("errorMsg");
const tbody = document.getElementById("studentsTbody");
const clearBtn = document.getElementById("clearBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const statsLine = document.getElementById("statsLine");

// Modal Elements
const editModalEl = document.getElementById("editModal");
const editModal = new bootstrap.Modal(editModalEl);

const editName = document.getElementById("editName");
const editMath = document.getElementById("editMath");
const editEnglish = document.getElementById("editEnglish");
const editScience = document.getElementById("editScience");
const editError = document.getElementById("editError");
const saveEditBtn = document.getElementById("saveEditBtn");

let editingId = null;

// ===================
// Helpers
// ===================
function isValidGrade(n) {
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

function calcGrade(avg) {
  if (avg >= 90) return "A";
  if (avg >= 80) return "B";
  if (avg >= 70) return "C";
  if (avg >= 60) return "D";
  return "F";
}

function gradeBadgeClass(letter) {
  switch (letter) {
    case "A": return "bg-success";
    case "B": return "bg-primary";
    case "C": return "bg-warning text-dark";
    case "D": return "bg-danger";
    default: return "bg-dark";
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
}

function clearError() {
  errorMsg.textContent = "";
}

function clearForm() {
  nameInput.value = "";
  mathInput.value = "";
  englishInput.value = "";
  scienceInput.value = "";
  nameInput.focus();
}

function normalizeStudent(raw) {
  // Backward-safe normalization if storage changes later
  const math = Number(raw.math);
  const english = Number(raw.english);
  const science = Number(raw.science);

  const total = math + english + science;
  const avg = total / 3;
  const grade = calcGrade(avg);

  return {
    id: raw.id || crypto.randomUUID(),
    name: String(raw.name || "").trim(),
    math,
    english,
    science,
    total,
    avg,
    grade,
    createdAt: Number(raw.createdAt || Date.now()),
  };
}

// ===================
// LocalStorage
// ===================
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function loadFromStorage() {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return [];
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeStudent).filter(s => s.name);
  } catch {
    return [];
  }
}

// ===================
// Filtering + Sorting
// ===================
function getFilteredSortedList() {
  const q = searchInput.value.trim().toLowerCase();
  const sortMode = sortSelect.value;

  let list = [...students];

  // Search
  if (q) {
    list = list.filter(s => s.name.toLowerCase().includes(q));
  }

  // Sort
  switch (sortMode) {
    case "newest":
      list.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      list.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "avgHigh":
      list.sort((a, b) => b.avg - a.avg);
      break;
    case "avgLow":
      list.sort((a, b) => a.avg - b.avg);
      break;
    case "nameAZ":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "nameZA":
      list.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      break;
  }

  return list;
}

// ===================
// Render
// ===================
function renderStudents(list) {
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr class="text-center text-muted">
        <td colspan="6" class="py-4">No results. Try adding students or changing search/sort.</td>
      </tr>
    `;
    statsLine.textContent = "";
    return;
  }

  tbody.innerHTML = list
    .map((s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td class="fw-semibold">${escapeHtml(s.name)}</td>
        <td>${s.total}</td>
        <td>${s.avg.toFixed(2)}</td>
        <td><span class="badge ${gradeBadgeClass(s.grade)}">${s.grade}</span></td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${s.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${s.id}">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  const totalCount = students.length;
  const shownCount = list.length;
  statsLine.textContent = `Showing ${shownCount} of ${totalCount} student(s).`;
}

function escapeHtml(str) {
  // Prevent HTML injection in table
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refreshView() {
  viewStudents = getFilteredSortedList();
  renderStudents(viewStudents);
}

// ===================
// Add Student
// ===================
studentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError();

  const name = nameInput.value.trim();
  const math = Number(mathInput.value);
  const english = Number(englishInput.value);
  const science = Number(scienceInput.value);

  if (!name) return showError("Please enter a student name.");
  if (!isValidGrade(math) || !isValidGrade(english) || !isValidGrade(science)) {
    return showError("Grades must be numbers between 0 and 100.");
  }

  const total = math + english + science;
  const avg = total / 3;
  const grade = calcGrade(avg);

  const student = {
    id: crypto.randomUUID(),
    name,
    math,
    english,
    science,
    total,
    avg,
    grade,
    createdAt: Date.now(),
  };

  students.push(student);
  saveToStorage();
  refreshView();
  clearForm();
});

// ===================
// Clear Form
// ===================
clearBtn.addEventListener("click", () => {
  clearError();
  clearForm();
});

// ===================
// Reset All
// ===================
resetAllBtn.addEventListener("click", () => {
  const ok = confirm("Are you sure you want to delete ALL students?");
  if (!ok) return;

  students = [];
  saveToStorage();
  refreshView();
  clearError();
  clearForm();
});

// ===================
// Search + Sort
// ===================
searchInput.addEventListener("input", () => {
  refreshView();
});

sortSelect.addEventListener("change", () => {
  refreshView();
});

// ===================
// Table Actions (Edit/Delete)
// ===================
tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "delete") {
    students = students.filter((s) => s.id !== id);
    saveToStorage();
    refreshView();
    return;
  }

  if (action === "edit") {
    clearError();
    editError.textContent = "";
    editingId = id;

    const student = students.find((s) => s.id === id);
    if (!student) return;

    editName.value = student.name;
    editMath.value = student.math;
    editEnglish.value = student.english;
    editScience.value = student.science;

    editModal.show();
    return;
  }
});

// ===================
// Save Edit
// ===================
saveEditBtn.addEventListener("click", () => {
  editError.textContent = "";

  const name = editName.value.trim();
  const math = Number(editMath.value);
  const english = Number(editEnglish.value);
  const science = Number(editScience.value);

  if (!name) {
    editError.textContent = "Please enter a student name.";
    return;
  }
  if (!isValidGrade(math) || !isValidGrade(english) || !isValidGrade(science)) {
    editError.textContent = "Grades must be numbers between 0 and 100.";
    return;
  }

  const idx = students.findIndex((s) => s.id === editingId);
  if (idx === -1) return;

  const total = math + english + science;
  const avg = total / 3;
  const grade = calcGrade(avg);

  students[idx] = {
    ...students[idx],
    name,
    math,
    english,
    science,
    total,
    avg,
    grade,
  };

  saveToStorage();
  refreshView();
  editModal.hide();
});

// ===================
// Init
// ===================
students = loadFromStorage();
refreshView();