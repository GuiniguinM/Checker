const STORAGE_KEY = 'exam-paper-checker-subjects';

const state = {
  subjects: [],
  selectedId: null,
};

const subjectListEl = document.getElementById('subject-list');
const emptyStateEl = document.getElementById('empty-state');
const checkerPanelEl = document.getElementById('checker-panel');
const selectedSubjectNameEl = document.getElementById('selected-subject-name');
const keyAnswerListEl = document.getElementById('key-answer-list');
const studentAnswersEl = document.getElementById('student-answers');
const matchListEl = document.getElementById('match-list');
const unmatchListEl = document.getElementById('unmatch-list');
const missingListEl = document.getElementById('missing-list');
const matchCountEl = document.getElementById('match-count');
const unmatchCountEl = document.getElementById('unmatch-count');
const missingCountEl = document.getElementById('missing-count');

const subjectForm = document.getElementById('new-subject-form');
const subjectNameEl = document.getElementById('subject-name');
const subjectKeyAnswersEl = document.getElementById('subject-key-answers');
const subjectContextMenuEl = document.getElementById('subject-context-menu');
const deleteSubjectActionEl = document.getElementById('delete-subject-action');

let contextMenuSubjectId = null;

function createId() {
  return `subject-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseAnswers(input = '') {
  return input
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSelectedSubject() {
  return state.subjects.find((subject) => subject.id === state.selectedId) || null;
}

function saveSubjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.subjects));
}

function buildDefaultSubjects() {
  return [
    {
      id: createId(),
      name: 'Biology',
      keyAnswers: ['Cell', 'Nucleus', 'DNA', 'Membrane', 'Photosynthesis'],
    },
    {
      id: createId(),
      name: 'English Literature',
      keyAnswers: ['Metaphor', 'Theme', 'Symbolism', 'Imagery', 'Narrator'],
    },
  ];
}

function loadSubjects() {
  const storedSubjects = localStorage.getItem(STORAGE_KEY);

  if (!storedSubjects) {
    state.subjects = buildDefaultSubjects();
    state.selectedId = state.subjects[0].id;
    saveSubjects();
    return;
  }

  try {
    const parsed = JSON.parse(storedSubjects);
    state.subjects = Array.isArray(parsed) ? parsed : buildDefaultSubjects();
    state.selectedId = state.subjects[0]?.id || null;
  } catch (error) {
    state.subjects = buildDefaultSubjects();
    state.selectedId = state.subjects[0]?.id || null;
    saveSubjects();
  }
}

function renderKeyAnswers(subject) {
  keyAnswerListEl.innerHTML = '';

  if (!subject || !subject.keyAnswers.length) {
    keyAnswerListEl.innerHTML = '<span class="empty-result">No key answers added yet.</span>';
    return;
  }

  subject.keyAnswers.forEach((answer) => {
    const pill = document.createElement('span');
    pill.className = 'tag';
    pill.textContent = answer;
    keyAnswerListEl.appendChild(pill);
  });
}

function renderSubjectList() {
  subjectListEl.innerHTML = '';

  state.subjects.forEach((subject) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `subject-item ${subject.id === state.selectedId ? 'active' : ''}`;
    button.innerHTML = `
      <span class="subject-item-title">${subject.name}</span>
      <span class="subject-item-meta">${subject.keyAnswers.length} key answer${subject.keyAnswers.length === 1 ? '' : 's'}</span>
    `;

    button.addEventListener('click', () => {
      state.selectedId = subject.id;
      render();
    });

    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      contextMenuSubjectId = subject.id;
      subjectContextMenuEl.classList.remove('hidden');
      subjectContextMenuEl.style.left = `${Math.min(event.clientX, window.innerWidth - subjectContextMenuEl.offsetWidth)}px`;
      subjectContextMenuEl.style.top = `${Math.min(event.clientY, window.innerHeight - subjectContextMenuEl.offsetHeight)}px`;
      deleteSubjectActionEl.focus();
    });

    subjectListEl.appendChild(button);
  });
}

function closeSubjectContextMenu() {
  subjectContextMenuEl.classList.add('hidden');
  contextMenuSubjectId = null;
}

deleteSubjectActionEl.addEventListener('click', () => {
  const subject = state.subjects.find((item) => item.id === contextMenuSubjectId);
  if (!subject) {
    closeSubjectContextMenu();
    return;
  }

  if (!confirm(`Delete "${subject.name}"? This cannot be undone.`)) {
    closeSubjectContextMenu();
    return;
  }

  state.subjects = state.subjects.filter((item) => item.id !== subject.id);
  if (state.selectedId === subject.id) {
    state.selectedId = state.subjects[0]?.id || null;
  }
  saveSubjects();
  closeSubjectContextMenu();
  render();
});

document.addEventListener('click', (event) => {
  if (!subjectContextMenuEl.contains(event.target)) {
    closeSubjectContextMenu();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSubjectContextMenu();
  }
});

function renderList(listEl, items) {
  listEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-result';
    empty.textContent = 'None';
    listEl.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  });
}

function compareAnswers(keyAnswers, studentAnswers) {
  const normalizedKey = keyAnswers
    .map(normalizeText)
    .filter(Boolean);

  const normalizedStudent = studentAnswers
    .map(normalizeText)
    .filter(Boolean);

  const keySet = new Set(normalizedKey);
  const studentSet = new Set(normalizedStudent);

  const match = [...studentSet].filter((answer) => keySet.has(answer)).sort();
  const unmatch = [...studentSet].filter((answer) => !keySet.has(answer)).sort();
  const missing = [...keySet].filter((answer) => !studentSet.has(answer)).sort();

  return {
    match,
    unmatch,
    missing,
  };
}

function renderResults() {
  const subject = getSelectedSubject();

  if (!subject) {
    return;
  }

  const studentAnswers = parseAnswers(studentAnswersEl.value);
  const { match, unmatch, missing } = compareAnswers(subject.keyAnswers, studentAnswers);

  matchCountEl.textContent = String(match.length);
  unmatchCountEl.textContent = String(unmatch.length);
  missingCountEl.textContent = String(missing.length);

  renderList(matchListEl, match);
  renderList(unmatchListEl, unmatch);
  renderList(missingListEl, missing);
}

function render() {
  renderSubjectList();

  const subject = getSelectedSubject();
  if (!subject) {
    emptyStateEl.classList.remove('hidden');
    checkerPanelEl.classList.add('hidden');
    return;
  }

  emptyStateEl.classList.add('hidden');
  checkerPanelEl.classList.remove('hidden');
  selectedSubjectNameEl.textContent = subject.name;
  renderKeyAnswers(subject);
  renderResults();
}

subjectForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = subjectNameEl.value.trim();
  const keyAnswers = parseAnswers(subjectKeyAnswersEl.value);

  if (!name || !keyAnswers.length) {
    alert('Please provide a subject name and at least one key answer.');
    return;
  }

  const newSubject = {
    id: createId(),
    name,
    keyAnswers,
  };

  state.subjects.push(newSubject);
  state.selectedId = newSubject.id;
  saveSubjects();
  render();

  subjectForm.reset();
  subjectNameEl.focus();
});

studentAnswersEl.addEventListener('input', renderResults);

loadSubjects();
render();
