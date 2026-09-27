const STORAGE_KEY = 'scrap-io-state-v1';
const DEFAULT_LANGUAGE = 'javascript';
const DEFAULT_CODE = {
  python: '# Write your interview solution here\n',
  javascript: '// Write your interview solution here\n',
  typescript: '// Write your interview solution here\n',
  cpp: '// Write your interview solution here\n',
  java: '// Write your interview solution here\n',
  go: '// Write your interview solution here\n',
  rust: '// Write your interview solution here\n',
  sql: '-- Write your interview solution here\n'
};

const languageSelect = document.getElementById('languageSelect');
const fontSizeInput = document.getElementById('fontSizeInput');
const fontSizeValue = document.getElementById('fontSizeValue');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const copyFeedback = document.getElementById('copyFeedback');
const timerDisplay = document.getElementById('timerDisplay');
const timerStartBtn = document.getElementById('timerStartBtn');
const timerPauseBtn = document.getElementById('timerPauseBtn');
const timerResetBtn = document.getElementById('timerResetBtn');

const tabSizeInputs = Array.from(document.querySelectorAll('input[name="tabSize"]'));

let editor;
let currentState = {
  language: DEFAULT_LANGUAGE,
  code: DEFAULT_CODE[DEFAULT_LANGUAGE],
  fontSize: 14,
  tabSize: 4
};

let timerElapsedMs = 0;
let timerStartMs = null;
let timerInterval = null;
const REQUIRE_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js';

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const language = typeof parsed.language === 'string' ? parsed.language : DEFAULT_LANGUAGE;
    const code = typeof parsed.code === 'string' ? parsed.code : DEFAULT_CODE[language] || '';
    const fontSize = Number.isFinite(parsed.fontSize) ? parsed.fontSize : 14;
    const tabSize = parsed.tabSize === 2 ? 2 : 4;

    currentState = { language, code, fontSize, tabSize };
  } catch (error) {
    currentState = {
      language: DEFAULT_LANGUAGE,
      code: DEFAULT_CODE[DEFAULT_LANGUAGE],
      fontSize: 14,
      tabSize: 4
    };
  }
}

function persistState() {
  if (!editor) {
    return;
  }

  const nextState = {
    language: currentState.language,
    code: editor.getValue(),
    fontSize: currentState.fontSize,
    tabSize: currentState.tabSize
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function syncControls() {
  languageSelect.value = currentState.language;
  fontSizeInput.value = String(currentState.fontSize);
  fontSizeValue.textContent = `${currentState.fontSize}px`;

  tabSizeInputs.forEach((input) => {
    input.checked = Number(input.value) === currentState.tabSize;
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderTimer() {
  const runningElapsed = timerStartMs ? Date.now() - timerStartMs : 0;
  timerDisplay.textContent = formatDuration(timerElapsedMs + runningElapsed);
}

function startTimer() {
  if (timerStartMs) {
    return;
  }

  timerStartMs = Date.now();
  timerInterval = setInterval(renderTimer, 200);
  renderTimer();
}

function pauseTimer() {
  if (!timerStartMs) {
    return;
  }

  timerElapsedMs += Date.now() - timerStartMs;
  timerStartMs = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  renderTimer();
}

function resetTimer() {
  timerElapsedMs = 0;
  timerStartMs = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  renderTimer();
}

function showCopiedFeedback() {
  copyFeedback.classList.add('visible');
  setTimeout(() => {
    copyFeedback.classList.remove('visible');
  }, 900);
}

function updateLanguage(language) {
  currentState.language = language;
  monaco.editor.setModelLanguage(editor.getModel(), language);
  persistState();
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function setupMonaco() {
  loadState();
  syncControls();

  if (!window.require) {
    try {
      await loadScript(REQUIRE_JS_URL);
    } catch (error) {
      return;
    }
  }

  window.require.config({
    paths: {
      vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs'
    }
  });

  window.require(['vs/editor/editor.main'], () => {
    editor = monaco.editor.create(document.getElementById('editor'), {
      value: currentState.code,
      language: currentState.language,
      theme: 'vs-dark',
      fontSize: currentState.fontSize,
      tabSize: currentState.tabSize,
      lineNumbers: 'on',
      minimap: { enabled: false },
      automaticLayout: true,
      matchBrackets: 'always',
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoClosingDelete: 'always',
      autoClosingOvertype: 'always',
      autoIndent: 'advanced'
    });

    editor.onDidChangeModelContent(() => {
      persistState();
    });

    languageSelect.addEventListener('change', (event) => {
      updateLanguage(event.target.value);
    });

    fontSizeInput.addEventListener('input', (event) => {
      const fontSize = Number(event.target.value);
      currentState.fontSize = fontSize;
      fontSizeValue.textContent = `${fontSize}px`;
      editor.updateOptions({ fontSize });
      persistState();
    });

    tabSizeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) {
          return;
        }

        const tabSize = Number(input.value);
        currentState.tabSize = tabSize;
        editor.getModel().updateOptions({ tabSize, insertSpaces: true });
        persistState();
      });
    });

    clearBtn.addEventListener('click', () => {
      editor.setValue(DEFAULT_CODE[currentState.language] || '');
      persistState();
    });

    copyBtn.addEventListener('click', async () => {
      const text = editor.getValue();

      try {
        await navigator.clipboard.writeText(text);
        showCopiedFeedback();
      } catch (error) {
        showCopiedFeedback();
      }
    });

    timerStartBtn.addEventListener('click', startTimer);
    timerPauseBtn.addEventListener('click', pauseTimer);
    timerResetBtn.addEventListener('click', resetTimer);

    renderTimer();
  });
}

setupMonaco();
