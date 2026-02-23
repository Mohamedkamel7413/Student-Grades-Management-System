// =======================================================
// CONFIGURATION
// -------------------------------------------------------
// STORAGE_KEY
// اسم المفتاح اللي بنحفظ تحته بيانات الطلاب في localStorage
// =======================================================
const STORAGE_KEY = "grades_manager_students_v1";


// =======================================================
// APPLICATION STATE
// -------------------------------------------------------
// allStudents        : القائمة الأساسية لكل الطلاب (البيانات الحقيقية)
// displayedStudents  : القائمة اللي بتظهر في الجدول بعد search و sort
// studentIdBeingEdited : ID الطالب اللي بنعدله حاليًا
// =======================================================
let allStudents = [];
let displayedStudents = [];
let studentIdBeingEdited = null;


// =======================================================
// PAGE ELEMENTS
// -------------------------------------------------------
// هنا بنمسك كل عناصر الـ HTML اللي هنستخدمها في JavaScript
// =======================================================
const studentForm = document.getElementById("studentForm");

const studentNameInput = document.getElementById("nameInput");
const mathGradeInput = document.getElementById("mathInput");
const englishGradeInput = document.getElementById("englishInput");
const scienceGradeInput = document.getElementById("scienceInput");

const addStudentErrorText = document.getElementById("errorMsg");
const studentsTableBody = document.getElementById("studentsTbody");

const clearFormButton = document.getElementById("clearBtn");
const resetAllButton = document.getElementById("resetAllBtn");

const searchByNameInput = document.getElementById("searchInput");
const sortModeSelect = document.getElementById("sortSelect");
const tableStatsLine = document.getElementById("statsLine");


// =======================================================
// EDIT MODAL ELEMENTS
// -------------------------------------------------------
// عناصر المودال اللي بنستخدمها في تعديل الطالب
// =======================================================
const editStudentModalElement = document.getElementById("editModal");
const editStudentModal = new bootstrap.Modal(editStudentModalElement);

const editStudentNameInput = document.getElementById("editName");
const editMathGradeInput = document.getElementById("editMath");
const editEnglishGradeInput = document.getElementById("editEnglish");
const editScienceGradeInput = document.getElementById("editScience");

const editStudentErrorText = document.getElementById("editError");
const saveEditButton = document.getElementById("saveEditBtn");


// =======================================================
// VALIDATION & CALCULATION FUNCTIONS
// =======================================================

/*
  isGradeValid
  ----------------
  بتتأكد إن الدرجة:
  - رقم حقيقي
  - بين 0 و 100
*/
function isGradeValid(gradeValue) {
  return Number.isFinite(gradeValue) && gradeValue >= 0 && gradeValue <= 100;
}

/*
  getLetterGrade
  ----------------
  بتحول المتوسط الرقمي إلى Grade حرفي (A, B, C, D, F)
*/
function getLetterGrade(averageGrade) {
  if (averageGrade >= 90) return "A";
  if (averageGrade >= 80) return "B";
  if (averageGrade >= 70) return "C";
  if (averageGrade >= 60) return "D";
  return "F";
}

/*
  getBadgeClassForLetterGrade
  ---------------------------
  بترجع Class من Bootstrap حسب حرف التقدير
*/
function getBadgeClassForLetterGrade(letterGrade) {
  switch (letterGrade) {
    case "A": return "bg-success";
    case "B": return "bg-primary";
    case "C": return "bg-warning text-dark";
    case "D": return "bg-danger";
    default:  return "bg-dark";
  }
}


// =======================================================
// UI HELPER FUNCTIONS
// =======================================================

/*
  showAddStudentError
  -------------------
  بتعرض رسالة خطأ تحت فورم إضافة الطالب
*/
function showAddStudentError(messageText) {
  addStudentErrorText.textContent = messageText;
}

/*
  clearAddStudentError
  --------------------
  بتمسح رسالة الخطأ من فورم الإضافة
*/
function clearAddStudentError() {
  addStudentErrorText.textContent = "";
}

/*
  clearAddStudentForm
  -------------------
  بتمسح كل خانات فورم الإضافة
  وترجع المؤشر على خانة الاسم
*/
function clearAddStudentForm() {
  studentNameInput.value = "";
  mathGradeInput.value = "";
  englishGradeInput.value = "";
  scienceGradeInput.value = "";
  studentNameInput.focus();
}

/*
  escapeHtml
  -----------
  بتحمي الجدول من إدخال كود HTML أو JavaScript في الاسم
*/
function escapeHtml(textValue) {
  return String(textValue)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =======================================================
// ID HELPER FUNCTION
// =======================================================

/*
  getNextStudentId
  ----------------
  بترجع ID رقمي بسيط:
  - لو مفيش طلاب → 0
  - غير كده → أكبر ID موجود + 1
*/
function getNextStudentId() {
  if (allStudents.length === 0) return 0;

  let maxId = -1;
  for (const student of allStudents) {
    const idAsNumber = Number(student.id);
    if (Number.isFinite(idAsNumber) && idAsNumber > maxId) {
      maxId = idAsNumber;
    }
  }
  return maxId + 1;
}


// =======================================================
// STUDENT OBJECT CREATION
// =======================================================

/*
  createStudentObject
  -------------------
  بتبني Object طالب كامل ومنظم
  (سواء طالب جديد أو تعديل طالب موجود)
*/
function createStudentObject(name, mathGrade, englishGrade, scienceGrade, existingStudent) {
  const totalGrade = mathGrade + englishGrade + scienceGrade;
  const averageGrade = totalGrade / 3;
  const letterGrade = getLetterGrade(averageGrade);

  return {
    id: existingStudent?.id ?? getNextStudentId(),
    createdAt: existingStudent?.createdAt ?? Date.now(),

    name,
    mathGrade,
    englishGrade,
    scienceGrade,

    totalGrade,
    averageGrade,
    letterGrade,
  };
}


// =======================================================
// LOCAL STORAGE FUNCTIONS
// =======================================================

/*
  saveStudentsToLocalStorage
  --------------------------
  بتحفظ كل الطلاب في localStorage
*/
function saveStudentsToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allStudents));
}

/*
  loadStudentsFromLocalStorage
  ----------------------------
  بتقرأ الطلاب من localStorage
  وبتظبطهم في شكل سليم
*/
function loadStudentsFromLocalStorage() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY);
    if (!savedText) return [];

    const savedArray = JSON.parse(savedText);
    if (!Array.isArray(savedArray)) return [];

    return savedArray.map((student) =>
      createStudentObject(
        student.name,
        Number(student.mathGrade),
        Number(student.englishGrade),
        Number(student.scienceGrade),
        student
      )
    );
  } catch {
    return [];
  }
}


// =======================================================
// SEARCH & SORT LOGIC
// =======================================================

/*
  getDisplayedStudentsList
  ------------------------
  بترجع الطلاب بعد تطبيق:
  - البحث بالاسم
  - الترتيب
*/
function getDisplayedStudentsList() {
  const searchText = searchByNameInput.value.trim().toLowerCase();
  const selectedSortMode = sortModeSelect.value;

  let listToDisplay = [...allStudents];

  if (searchText) {
    listToDisplay = listToDisplay.filter((student) =>
      student.name.toLowerCase().includes(searchText)
    );
  }

  switch (selectedSortMode) {
    case "newest":
      listToDisplay.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "oldest":
      listToDisplay.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case "avgHigh":
      listToDisplay.sort((a, b) => b.averageGrade - a.averageGrade);
      break;
    case "avgLow":
      listToDisplay.sort((a, b) => a.averageGrade - b.averageGrade);
      break;
    case "nameAZ":
      listToDisplay.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "nameZA":
      listToDisplay.sort((a, b) => b.name.localeCompare(a.name));
      break;
  }

  return listToDisplay;
}


// =======================================================
// RENDER TABLE
// =======================================================

/*
  renderStudentsTable
  -------------------
  مسؤولة عن رسم جدول الطلاب في الصفحة
*/
function renderStudentsTable(studentsToRender) {
  if (studentsToRender.length === 0) {
    studentsTableBody.innerHTML = `
      <tr class="text-center text-muted">
        <td colspan="6" class="py-4">No students yet.</td>
      </tr>
    `;
    tableStatsLine.textContent = "";
    return;
  }

  studentsTableBody.innerHTML = studentsToRender
    .map((student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${student.totalGrade}</td>
        <td>${student.averageGrade.toFixed(2)}</td>
        <td><span class="badge ${getBadgeClassForLetterGrade(student.letterGrade)}">${student.letterGrade}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${student.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${student.id}">Delete</button>
        </td>
      </tr>
    `)
    .join("");

  tableStatsLine.textContent =
    `Showing ${studentsToRender.length} of ${allStudents.length} student(s).`;
}

/*
  refreshTableView
  ----------------
  بتعمل تحديث كامل للجدول
*/
function refreshTableView() {
  displayedStudents = getDisplayedStudentsList();
  renderStudentsTable(displayedStudents);
}


// =======================================================
// EVENTS: ADD / CLEAR / RESET / SEARCH / SORT / EDIT / DELETE
// =======================================================

// إضافة طالب
studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearAddStudentError();

  const name = studentNameInput.value.trim();
  const math = Number(mathGradeInput.value);
  const english = Number(englishGradeInput.value);
  const science = Number(scienceGradeInput.value);

  if (!name) return showAddStudentError("Please enter a student name.");
  if (!isGradeValid(math) || !isGradeValid(english) || !isGradeValid(science)) {
    return showAddStudentError("Grades must be between 0 and 100.");
  }

  allStudents.push(createStudentObject(name, math, english, science));
  saveStudentsToLocalStorage();
  refreshTableView();
  clearAddStudentForm();
});

// مسح الفورم
clearFormButton.addEventListener("click", () => {
  clearAddStudentError();
  clearAddStudentForm();
});

// مسح كل الطلاب
resetAllButton.addEventListener("click", () => {
  if (!confirm("Delete ALL students?")) return;
  allStudents = [];
  saveStudentsToLocalStorage();
  refreshTableView();
});

// البحث والترتيب
searchByNameInput.addEventListener("input", refreshTableView);
sortModeSelect.addEventListener("change", refreshTableView);

// Edit / Delete
studentsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);

  if (action === "delete") {
    allStudents = allStudents.filter((s) => s.id !== id);
    saveStudentsToLocalStorage();
    refreshTableView();
  }

  if (action === "edit") {
    studentIdBeingEdited = id;
    const student = allStudents.find((s) => s.id === id);
    if (!student) return;

    editStudentNameInput.value = student.name;
    editMathGradeInput.value = student.mathGrade;
    editEnglishGradeInput.value = student.englishGrade;
    editScienceGradeInput.value = student.scienceGrade;

    editStudentModal.show();
  }
});

// حفظ التعديل
saveEditButton.addEventListener("click", () => {
  const name = editStudentNameInput.value.trim();
  const math = Number(editMathGradeInput.value);
  const english = Number(editEnglishGradeInput.value);
  const science = Number(editScienceGradeInput.value);

  if (!name || !isGradeValid(math) || !isGradeValid(english) || !isGradeValid(science)) {
    editStudentErrorText.textContent = "Invalid data.";
    return;
  }

  const index = allStudents.findIndex((s) => s.id === studentIdBeingEdited);
  if (index === -1) return;

  allStudents[index] = createStudentObject(
    name,
    math,
    english,
    science,
    allStudents[index]
  );

  saveStudentsToLocalStorage();
  refreshTableView();
  editStudentModal.hide();
});


// =======================================================
// APP START
// =======================================================
allStudents = loadStudentsFromLocalStorage();
refreshTableView();