const state = {
  subjects: [],
  lessons: [],
};

const elements = {
  status: document.getElementById('status'),
  scheduleBody: document.getElementById('scheduleBody'),
  subjectsContainer: document.getElementById('subjectsContainer'),
  totalCurrent: document.getElementById('totalCurrent'),
  totalProjected: document.getElementById('totalProjected'),
  template: document.getElementById('subjectTemplate'),
  loadDemoBtn: document.getElementById('loadDemoBtn'),
  loadRemoteBtn: document.getElementById('loadRemoteBtn'),
};

const DEMO_DATA = {
  subjects: [
    { id: 'math', name: 'Высшая математика', tk: 12, max: 100 },
    { id: 'prog', name: 'Программирование', tk: 18, max: 100 },
    { id: 'phys', name: 'Физика', tk: 8, max: 100 },
  ],
  lessons: [
    { id: 'l1', subjectId: 'math', title: 'Лекция', date: isoDayOffset(0), start: '09:00', end: '10:30', points: 3, completed: false, attendPlanned: true },
    { id: 'l2', subjectId: 'prog', title: 'Практика', date: isoDayOffset(0), start: '10:40', end: '12:10', points: 4, completed: false, attendPlanned: true },
    { id: 'l3', subjectId: 'phys', title: 'Лаба', date: isoDayOffset(0), start: '13:00', end: '14:30', points: 5, completed: false, attendPlanned: true },
    { id: 'l4', subjectId: 'math', title: 'Семинар', date: isoDayOffset(-1), start: '10:00', end: '11:30', points: 4, completed: true, attendPlanned: true },
    { id: 'l5', subjectId: 'prog', title: 'Лекция', date: isoDayOffset(-2), start: '09:00', end: '10:30', points: 5, completed: true, attendPlanned: true },
  ],
};

function isoDayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function loadData(data) {
  state.subjects = structuredClone(data.subjects);
  state.lessons = structuredClone(data.lessons);
  render();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function pointsBySubject(subjectId) {
  const subject = state.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return { current: 0, projected: 0, max: 100 };
  }

  const currentFromLessons = state.lessons
    .filter((lesson) => lesson.subjectId === subjectId && lesson.completed)
    .reduce((sum, lesson) => sum + lesson.points, 0);

  const possibleToday = state.lessons
    .filter((lesson) => lesson.subjectId === subjectId && lesson.date === todayIso() && !lesson.completed && lesson.attendPlanned)
    .reduce((sum, lesson) => sum + lesson.points, 0);

  const current = clamp(subject.tk + currentFromLessons, 0, subject.max);
  const projected = clamp(current + possibleToday, 0, subject.max);
  return { current, projected, max: subject.max };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function render() {
  renderSchedule();
  renderSubjects();
  renderTotals();
}

function renderSchedule() {
  const today = todayIso();
  const todayLessons = state.lessons
    .filter((lesson) => lesson.date === today)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (todayLessons.length === 0) {
    elements.scheduleBody.innerHTML = '<tr><td colspan="5">На сегодня занятий нет.</td></tr>';
    return;
  }

  elements.scheduleBody.innerHTML = '';
  todayLessons.forEach((lesson) => {
    const subject = state.subjects.find((item) => item.id === lesson.subjectId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${lesson.start}–${lesson.end}</td>
      <td>${subject?.name ?? lesson.subjectId}</td>
      <td>${lesson.title}</td>
      <td>${lesson.points}</td>
      <td><input type="checkbox" data-lesson-id="${lesson.id}" ${lesson.attendPlanned ? 'checked' : ''}></td>
    `;

    const checkbox = tr.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (event) => {
      lesson.attendPlanned = event.target.checked;
      render();
    });

    elements.scheduleBody.appendChild(tr);
  });
}

function renderSubjects() {
  elements.subjectsContainer.innerHTML = '';

  state.subjects.forEach((subject) => {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector('.subject-card');

    const name = card.querySelector('.subject-name');
    const tkInput = card.querySelector('.tk-input');
    const currentNode = card.querySelector('.current-points');
    const projectedNode = card.querySelector('.projected-points');
    const maxNode = card.querySelector('.max-points');
    const currentBar = card.querySelector('.progress-current');
    const projectedBar = card.querySelector('.progress-projected');

    const { current, projected, max } = pointsBySubject(subject.id);

    name.textContent = subject.name;
    tkInput.value = subject.tk;
    currentNode.textContent = current.toFixed(1);
    projectedNode.textContent = projected.toFixed(1);
    maxNode.textContent = max.toFixed(0);

    const currentPercent = (current / max) * 100;
    const projectedPercent = (projected / max) * 100;
    currentBar.style.width = `${currentPercent}%`;
    projectedBar.style.width = `${projectedPercent}%`;
    projectedBar.style.clipPath = `inset(0 ${100 - projectedPercent}% 0 ${currentPercent}%)`;

    tkInput.addEventListener('input', (event) => {
      subject.tk = Number(event.target.value) || 0;
      render();
    });

    elements.subjectsContainer.appendChild(fragment);
  });
}

function renderTotals() {
  const totals = state.subjects.reduce(
    (acc, subject) => {
      const points = pointsBySubject(subject.id);
      acc.current += points.current;
      acc.projected += points.projected;
      return acc;
    },
    { current: 0, projected: 0 },
  );

  elements.totalCurrent.textContent = totals.current.toFixed(1);
  elements.totalProjected.textContent = totals.projected.toFixed(1);
}

async function loadFromAttendance() {
  elements.status.textContent = 'Пробую получить данные с attendance-app.mirea.ru...';

  const candidates = [
    'https://attendance-app.mirea.ru/api/schedule',
    'https://attendance-app.mirea.ru/api/lessons',
    'https://attendance-app.mirea.ru/api/v1/schedule/today',
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const normalized = normalizeRemoteData(json);
      if (normalized.subjects.length > 0) {
        loadData(normalized);
        elements.status.textContent = `Данные успешно загружены из ${url}.`;
        return;
      }
    } catch (error) {
      // пробуем следующий endpoint
    }
  }

  elements.status.textContent = 'Не удалось получить данные автоматически. Загружено демо.';
  loadData(DEMO_DATA);
}

function normalizeRemoteData(json) {
  const subjectsMap = new Map();
  const lessons = [];
  const list = Array.isArray(json) ? json : json?.items ?? json?.lessons ?? [];

  list.forEach((item, index) => {
    const subjectName = item.subjectName ?? item.discipline ?? item.title ?? `Дисциплина ${index + 1}`;
    const subjectId = String(item.subjectId ?? item.disciplineId ?? subjectName);
    if (!subjectsMap.has(subjectId)) {
      subjectsMap.set(subjectId, {
        id: subjectId,
        name: subjectName,
        tk: Number(item.tk ?? 0),
        max: Number(item.max ?? 100),
      });
    }

    lessons.push({
      id: String(item.id ?? `${subjectId}-${index}`),
      subjectId,
      title: item.type ?? item.lessonType ?? 'Занятие',
      date: String(item.date ?? todayIso()).slice(0, 10),
      start: String(item.start ?? item.timeStart ?? '09:00').slice(0, 5),
      end: String(item.end ?? item.timeEnd ?? '10:30').slice(0, 5),
      points: Number(item.points ?? item.score ?? 0),
      completed: Boolean(item.completed ?? false),
      attendPlanned: true,
    });
  });

  return {
    subjects: [...subjectsMap.values()],
    lessons,
  };
}

elements.loadDemoBtn.addEventListener('click', () => {
  elements.status.textContent = 'Загружены демо-данные.';
  loadData(DEMO_DATA);
});

elements.loadRemoteBtn.addEventListener('click', () => {
  loadFromAttendance();
});

loadData(DEMO_DATA);
elements.status.textContent = 'Загружены демо-данные. Вы можете менять ТК и отмечать посещение занятий.';
