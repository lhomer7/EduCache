const QUESTION_COUNT = 10;
const DRAFT_LIBRARY_STORAGE_KEY = "qr-hunt-library-draft";
const PROGRESS_STORAGE_PREFIX = "qr-hunt-progress";

document.addEventListener("DOMContentLoaded", () => {
  const publishedLibrary = getPublishedLibrary();

  setupTeacherDashboard(publishedLibrary);
  setupQuestionPage(publishedLibrary);
});

function setupTeacherDashboard(publishedLibrary) {
  const manager = document.querySelector("[data-hunt-manager]");

  if (!manager) {
    return;
  }

  const initialLibrary = loadTeacherLibrary(publishedLibrary);
  const state = {
    publishedLibrary: cloneData(publishedLibrary),
    library: initialLibrary,
    selectedHuntId: initialLibrary.activeHuntId || initialLibrary.hunts[0]?.id || "",
  };

  const elements = {
    progressSummary: document.querySelector("[data-progress-summary]"),
    previewFirst: document.querySelector("[data-preview-first]"),
    resetProgressButtons: Array.from(document.querySelectorAll("[data-reset-progress]")),
    huntList: document.querySelector("[data-hunt-list]"),
    selectedHuntName: document.querySelector("[data-selected-hunt-name]"),
    selectedHuntNote: document.querySelector("[data-selected-hunt-note]"),
    huntName: document.querySelector("[data-hunt-name]"),
    huntId: document.querySelector("[data-hunt-id]"),
    huntDescription: document.querySelector("[data-hunt-description]"),
    saveStatus: document.querySelector("[data-save-status]"),
    questionEditor: document.querySelector("[data-question-editor]"),
    previewLinks: document.querySelector("[data-preview-links]"),
    createHunt: document.querySelector("[data-create-hunt]"),
    duplicateHunt: document.querySelector("[data-duplicate-hunt]"),
    deleteHunt: document.querySelector("[data-delete-hunt]"),
    setActiveHunt: document.querySelector("[data-set-active-hunt]"),
    downloadLibrary: document.querySelector("[data-download-library]"),
    resetDrafts: document.querySelector("[data-reset-drafts]"),
    qrHuntLabel: document.querySelector("[data-qr-hunt-label]"),
    qrMode: document.querySelector("[data-qr-mode]"),
    qrQuestionFields: document.querySelector("[data-qr-question-fields]"),
    qrCustomFields: document.querySelector("[data-qr-custom-fields]"),
    qrBaseUrl: document.querySelector("[data-qr-base-url]"),
    qrQuestionSelect: document.querySelector("[data-qr-question-select]"),
    qrCustomValue: document.querySelector("[data-qr-custom-value]"),
    qrSize: document.querySelector("[data-qr-size]"),
    qrGenerate: document.querySelector("[data-generate-qr]"),
    qrDownload: document.querySelector("[data-download-qr]"),
    qrStatus: document.querySelector("[data-qr-status]"),
    qrOutputUrl: document.querySelector("[data-qr-output-url]"),
    qrPreview: document.querySelector("[data-qr-preview]"),
  };

  populateQuestionSelect(elements.qrQuestionSelect);
  initializeBaseUrl(elements.qrBaseUrl);

  elements.resetProgressButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!hasAnySavedProgress()) {
        return;
      }

      const shouldReset = window.confirm(
        "Clear all saved hunt progress on this device?"
      );

      if (!shouldReset) {
        return;
      }

      clearAllProgress();
      renderDashboard(state, elements);
    });
  });

  elements.createHunt.addEventListener("click", () => {
    const newHunt = createBlankHunt(state.library.hunts);
    state.library.hunts.push(newHunt);
    state.selectedHuntId = newHunt.id;
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.duplicateHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    const duplicatedHunt = cloneData(selectedHunt);
    duplicatedHunt.name = `${selectedHunt.name} Copy`;
    duplicatedHunt.id = generateUniqueHuntId(
      sanitizeHuntId(`${selectedHunt.id}-copy`),
      state.library.hunts
    );

    state.library.hunts.push(duplicatedHunt);
    state.selectedHuntId = duplicatedHunt.id;
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.deleteHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt || state.library.hunts.length <= 1) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${selectedHunt.name}" from this dashboard?`
    );

    if (!shouldDelete) {
      return;
    }

    state.library.hunts = state.library.hunts.filter((hunt) => hunt.id !== selectedHunt.id);

    if (state.library.activeHuntId === selectedHunt.id) {
      state.library.activeHuntId = state.library.hunts[0]?.id || "";
    }

    state.selectedHuntId = state.library.activeHuntId || state.library.hunts[0]?.id || "";
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.setActiveHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    state.library.activeHuntId = selectedHunt.id;
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.downloadLibrary.addEventListener("click", () => {
    downloadTextFile("hunt-data.js", buildHuntDataFile(state.library));
  });

  elements.resetDrafts.addEventListener("click", () => {
    const shouldReset = window.confirm(
      "Reset your local dashboard edits back to the published hunt-data.js file?"
    );

    if (!shouldReset) {
      return;
    }

    window.localStorage.removeItem(DRAFT_LIBRARY_STORAGE_KEY);
    state.library = cloneData(state.publishedLibrary);
    state.selectedHuntId =
      state.library.activeHuntId || state.library.hunts[0]?.id || "";
    renderDashboard(state, elements);
  });

  elements.huntList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-hunt]");

    if (!button) {
      return;
    }

    state.selectedHuntId = button.dataset.selectHunt;
    renderDashboard(state, elements);
  });

  elements.huntName.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.name = event.target.value || "Untitled Hunt";
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.huntId.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    const nextId = generateUniqueHuntId(
      sanitizeHuntId(event.target.value) || "hunt",
      state.library.hunts,
      selectedHunt.id
    );

    if (state.library.activeHuntId === selectedHunt.id) {
      state.library.activeHuntId = nextId;
    }

    selectedHunt.id = nextId;
    state.selectedHuntId = nextId;
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.huntDescription.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.description = event.target.value;
    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.questionEditor.addEventListener("change", (event) => {
    const field = event.target.dataset.questionField;
    const questionNumber = Number(event.target.dataset.questionNumber);
    const selectedHunt = getSelectedHunt(state);

    if (!field || !questionNumber || !selectedHunt) {
      return;
    }

    const question = selectedHunt.questions.find((item) => item.number === questionNumber);

    if (!question) {
      return;
    }

    if (field === "answers") {
      question.answers = splitAnswers(event.target.value);
    } else {
      question[field] = event.target.value;
    }

    commitTeacherLibrary(state);
    renderDashboard(state, elements);
  });

  elements.qrMode.addEventListener("change", () => {
    updateQrMode(elements);
  });

  elements.qrGenerate.addEventListener("click", () => {
    generateQrCode(state, elements);
  });

  elements.qrDownload.addEventListener("click", () => {
    downloadQrCode(elements);
  });

  elements.qrSize.addEventListener("change", () => {
    generateQrCode(state, elements);
  });

  renderDashboard(state, elements);
}

function renderDashboard(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt) {
    return;
  }

  renderProgressSummary(state, elements.progressSummary, selectedHunt);
  renderHuntList(state, elements.huntList);
  renderHuntEditor(state, elements, selectedHunt);
  renderPreviewLinks(state, elements.previewLinks, selectedHunt);
  renderQrMeta(elements, selectedHunt);
  updateQrMode(elements);
  generateQrCode(state, elements);
}

function renderProgressSummary(state, progressSummary, selectedHunt) {
  if (!progressSummary) {
    return;
  }

  const solvedCount = getSolvedCount(selectedHunt.id, QUESTION_COUNT);
  progressSummary.textContent =
    `${state.library.hunts.length} hunts in the dashboard. ` +
    `${solvedCount} of ${QUESTION_COUNT} questions solved on this device for "${selectedHunt.name}".`;
}

function renderHuntList(state, huntList) {
  const activeHuntId = state.library.activeHuntId;

  huntList.innerHTML = state.library.hunts
    .map((hunt) => {
      const isSelected = hunt.id === state.selectedHuntId;
      const isActive = hunt.id === activeHuntId;

      return `
        <button
          class="hunt-list-item${isSelected ? " is-selected" : ""}"
          type="button"
          data-select-hunt="${escapeHtml(hunt.id)}"
        >
          <span class="hunt-list-name">${escapeHtml(hunt.name)}</span>
          <span class="hunt-list-meta">
            ${isActive ? "Default hunt" : "Saved hunt"} | ${escapeHtml(hunt.id)}
          </span>
        </button>
      `;
    })
    .join("");
}

function renderHuntEditor(state, elements, selectedHunt) {
  elements.selectedHuntName.textContent = `${selectedHunt.name} editor`;
  elements.selectedHuntNote.textContent =
    `Students reach this hunt with links that include ?hunt=${selectedHunt.id}.`;
  elements.huntName.value = selectedHunt.name;
  elements.huntId.value = selectedHunt.id;
  elements.huntDescription.value = selectedHunt.description || "";
  elements.previewFirst.href = buildPreviewUrl(selectedHunt.id, 1);
  elements.setActiveHunt.disabled = selectedHunt.id === state.library.activeHuntId;
  elements.deleteHunt.disabled = state.library.hunts.length <= 1;
  elements.saveStatus.textContent = librariesMatch(state.library, state.publishedLibrary)
    ? "This dashboard matches the published hunt-data.js file."
    : "You have unpublished local edits. Download hunt-data.js and upload it to GitHub when you want students to see the changes.";

  elements.questionEditor.innerHTML = selectedHunt.questions
    .map((question) => questionEditorMarkup(question))
    .join("");
}

function renderPreviewLinks(state, previewLinks, selectedHunt) {
  previewLinks.innerHTML = selectedHunt.questions
    .map((question) => {
      const href = buildPreviewUrl(selectedHunt.id, question.number);

      return `<a class="page-link" href="${escapeHtml(href)}">Question ${question.number}</a>`;
    })
    .join("");
}

function renderQrMeta(elements, selectedHunt) {
  elements.qrHuntLabel.textContent =
    `QR codes will point to "${selectedHunt.name}" using hunt ID "${selectedHunt.id}".`;
}

function updateQrMode(elements) {
  const isQuestionMode = elements.qrMode.value === "question";
  elements.qrQuestionFields.classList.toggle("is-hidden", !isQuestionMode);
  elements.qrCustomFields.classList.toggle("is-hidden", isQuestionMode);
}

function generateQrCode(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt) {
    return;
  }

  const isQuestionMode = elements.qrMode.value === "question";
  let value = "";

  if (isQuestionMode) {
    const rawValue = elements.qrBaseUrl.value.trim();

    if (!rawValue) {
      elements.qrStatus.textContent = "Enter the public site URL first.";
      elements.qrDownload.disabled = true;
      return;
    }

    value = resolveQuestionQrValue(
      rawValue,
      selectedHunt.id,
      Number(elements.qrQuestionSelect.value || "1")
    );
  } else {
    value = elements.qrCustomValue.value.trim();

    if (!value) {
      elements.qrStatus.textContent = "Enter a custom link or some text first.";
      elements.qrDownload.disabled = true;
      return;
    }
  }

  renderQrImage(elements.qrPreview, value, Number(elements.qrSize.value || "240"));
  elements.qrOutputUrl.textContent = value;
  elements.qrDownload.disabled = false;
  elements.qrStatus.textContent = window.QRCode
    ? "QR code ready. Download the PNG when you are happy with it."
    : "QR code ready. A fallback online generator was used for this image.";
}

function renderQrImage(preview, value, size) {
  preview.innerHTML = "";

  if (window.QRCode) {
    new window.QRCode(preview, {
      text: value,
      width: size,
      height: size,
      colorDark: "#10333f",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
    return;
  }

  const image = document.createElement("img");
  image.alt = "Generated QR code";
  image.width = size;
  image.height = size;
  image.src = buildQrFallbackUrl(value, size);
  preview.append(image);
}

function downloadQrCode(elements) {
  const canvas = elements.qrPreview.querySelector("canvas");
  const image = elements.qrPreview.querySelector("img");
  const fileLabel = elements.qrMode.value === "question"
    ? `q${elements.qrQuestionSelect.value || "1"}`
    : "custom";
  const link = document.createElement("a");

  if (canvas) {
    link.href = canvas.toDataURL("image/png");
  } else if (image) {
    link.href = image.src;
  } else {
    elements.qrStatus.textContent = "Generate the QR code first.";
    return;
  }

  link.download = `qr-code-${fileLabel}.png`;
  link.click();
}

function setupQuestionPage(publishedLibrary) {
  const card = document.querySelector("[data-question-number]");

  if (!card) {
    return;
  }

  const library = getQuestionPageLibrary(publishedLibrary);
  const questionNumber = Number(card.dataset.questionNumber);
  const requestedHuntId = new URLSearchParams(window.location.search).get("hunt");
  const selectedHunt =
    library.hunts.find((hunt) => hunt.id === requestedHuntId) ||
    library.hunts.find((hunt) => hunt.id === library.activeHuntId) ||
    library.hunts[0];
  const currentQuestion = selectedHunt?.questions.find(
    (item) => item.number === questionNumber
  );

  const elements = {
    stepLabel: card.querySelector("[data-step-label]"),
    questionText: card.querySelector("[data-question-text]"),
    questionHelp: card.querySelector("[data-question-help]"),
    form: card.querySelector("[data-answer-form]"),
    input: card.querySelector("[data-answer-input]"),
    submitButton: card.querySelector(".submit-button"),
    feedback: card.querySelector("[data-feedback]"),
    cluePanel: card.querySelector("[data-clue]"),
    clueTitle: card.querySelector("[data-clue-title]"),
    clueText: card.querySelector("[data-clue-text]"),
    cardBody: card.querySelector(".card-body"),
  };

  if (
    !selectedHunt ||
    !currentQuestion ||
    Object.values(elements).some((element) => !element)
  ) {
    renderMissingQuestion(card, elements);
    return;
  }

  const chrome = buildQuestionChrome(selectedHunt.id);
  elements.cardBody.insertBefore(chrome.wrapper, elements.cardBody.firstChild);
  elements.progressLabel = chrome.progressLabel;
  elements.progressBar = chrome.progressBar;

  renderQuestion(selectedHunt, currentQuestion, elements);
  syncProgress(elements.progressLabel, elements.progressBar, selectedHunt.id, QUESTION_COUNT);

  if (window.localStorage.getItem(storageKey(selectedHunt.id, questionNumber)) === "solved") {
    markSolved(elements, selectedHunt.id, QUESTION_COUNT);
  } else {
    elements.input.focus();
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const submittedAnswer = normalizeAnswer(elements.input.value);
    const acceptedAnswers = currentQuestion.answers.map(normalizeAnswer);

    if (!submittedAnswer) {
      setFeedback(elements.feedback, "Enter an answer first.", "is-error");
      return;
    }

    if (acceptedAnswers.includes(submittedAnswer)) {
      window.localStorage.setItem(storageKey(selectedHunt.id, questionNumber), "solved");
      markSolved(elements, selectedHunt.id, QUESTION_COUNT);
      return;
    }

    setFeedback(elements.feedback, "Not quite. Try again.", "is-error");
  });
}

function renderQuestion(hunt, question, elements) {
  document.title = `Question ${question.number}`;
  elements.stepLabel.textContent = `Question ${question.number} of ${QUESTION_COUNT}`;
  elements.questionText.textContent = question.question;
  elements.questionHelp.textContent =
    `${hunt.name} | Answers are not case-sensitive. Type the answer and tap unlock.`;
  elements.clueTitle.textContent = question.clueTitle || "Clue unlocked";
  elements.clueText.textContent = question.clue;
}

function renderMissingQuestion(card, elements) {
  document.title = "Question not found";
  card.classList.add("is-missing");

  if (elements.stepLabel) {
    elements.stepLabel.textContent = "Question unavailable";
  }

  if (elements.questionText) {
    elements.questionText.textContent = "This question has not been set up yet.";
  }

  if (elements.questionHelp) {
    elements.questionHelp.textContent =
      "Check the selected hunt data and make sure this question exists.";
  }

  if (elements.form) {
    elements.form.style.display = "none";
  }

  if (elements.feedback) {
    setFeedback(elements.feedback, "No question data was found for this page.", "is-error");
  }
}

function buildQuestionChrome(huntId) {
  const wrapper = document.createElement("div");
  wrapper.className = "question-utility";

  const progressBlock = document.createElement("div");
  progressBlock.className = "progress-card";

  const progressLabel = document.createElement("p");
  progressLabel.className = "progress-label";
  progressLabel.textContent = "Checking progress...";

  const progressTrack = document.createElement("div");
  progressTrack.className = "progress-track";

  const progressBar = document.createElement("span");
  progressBar.className = "progress-fill";
  progressBar.dataset.huntId = huntId;

  progressTrack.append(progressBar);
  progressBlock.append(progressLabel, progressTrack);
  wrapper.append(progressBlock);

  return {
    wrapper,
    progressLabel,
    progressBar,
  };
}

function markSolved(elements, huntId, totalQuestions) {
  elements.input.value = "";
  elements.input.readOnly = true;
  elements.submitButton.disabled = true;
  elements.submitButton.textContent = "Unlocked";
  elements.cluePanel.classList.add("is-visible");
  setFeedback(elements.feedback, "Correct! Your clue is now unlocked.", "is-success");
  syncProgress(elements.progressLabel, elements.progressBar, huntId, totalQuestions);
  elements.cluePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function syncProgress(progressLabel, progressBar, huntId, totalQuestions) {
  const solvedCount = getSolvedCount(huntId, totalQuestions);
  const percentage = totalQuestions ? (solvedCount / totalQuestions) * 100 : 0;

  progressLabel.textContent = `${solvedCount} of ${totalQuestions} questions unlocked on this device`;
  progressBar.style.width = `${percentage}%`;
}

function setFeedback(feedback, message, className) {
  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-success");
  feedback.classList.add(className);
}

function storageKey(huntId, questionNumber) {
  return `${PROGRESS_STORAGE_PREFIX}::${huntId}::q${questionNumber}`;
}

function getSolvedCount(huntId, totalQuestions) {
  let solvedCount = 0;

  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    if (window.localStorage.getItem(storageKey(huntId, questionNumber)) === "solved") {
      solvedCount += 1;
    }
  }

  return solvedCount;
}

function hasAnySavedProgress() {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(PROGRESS_STORAGE_PREFIX)) {
      return true;
    }
  }

  return false;
}

function clearAllProgress() {
  const progressKeys = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(PROGRESS_STORAGE_PREFIX)) {
      progressKeys.push(key);
    }
  }

  progressKeys.forEach((key) => {
    window.localStorage.removeItem(key);
  });
}

function getQuestionPageLibrary(publishedLibrary) {
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get("preview") === "1";

  if (!isPreviewMode) {
    return cloneData(publishedLibrary);
  }

  return loadTeacherLibrary(publishedLibrary);
}

function loadTeacherLibrary(publishedLibrary) {
  const rawDraft = window.localStorage.getItem(DRAFT_LIBRARY_STORAGE_KEY);

  if (!rawDraft) {
    return cloneData(publishedLibrary);
  }

  try {
    return normalizeLibraryData(JSON.parse(rawDraft));
  } catch (error) {
    return cloneData(publishedLibrary);
  }
}

function commitTeacherLibrary(state) {
  state.library = normalizeLibraryData(state.library);
  window.localStorage.setItem(
    DRAFT_LIBRARY_STORAGE_KEY,
    JSON.stringify(state.library)
  );
}

function getPublishedLibrary() {
  if (window.HUNT_LIBRARY) {
    return normalizeLibraryData(window.HUNT_LIBRARY);
  }

  if (Array.isArray(window.HUNT_DATA)) {
    return normalizeLibraryData({
      activeHuntId: "demo-hunt",
      hunts: [
        {
          id: "demo-hunt",
          name: "Demo Hunt",
          description: "Imported from the legacy single-hunt format.",
          questions: window.HUNT_DATA,
        },
      ],
    });
  }

  return normalizeLibraryData({
    activeHuntId: "demo-hunt",
    hunts: [createBlankHunt([])],
  });
}

function normalizeLibraryData(rawLibrary) {
  const rawHunts = Array.isArray(rawLibrary?.hunts) ? rawLibrary.hunts : [];
  const hunts = rawHunts.length
    ? rawHunts.map((hunt, index) => normalizeHunt(hunt, index))
    : [createBlankHunt([])];
  const uniqueHunts = ensureUniqueHuntIds(hunts);
  const activeHuntId = uniqueHunts.some((hunt) => hunt.id === rawLibrary?.activeHuntId)
    ? rawLibrary.activeHuntId
    : uniqueHunts[0].id;

  return {
    activeHuntId,
    hunts: uniqueHunts,
  };
}

function normalizeHunt(rawHunt, index) {
  const huntId = sanitizeHuntId(rawHunt?.id || rawHunt?.name || `hunt-${index + 1}`);
  const questions = Array.from({ length: QUESTION_COUNT }, (_, itemIndex) => {
    const questionNumber = itemIndex + 1;
    const existingQuestion = Array.isArray(rawHunt?.questions)
      ? rawHunt.questions.find((question) => Number(question.number) === questionNumber)
      : null;

    return normalizeQuestion(existingQuestion, questionNumber);
  });

  return {
    id: huntId || `hunt-${index + 1}`,
    name: rawHunt?.name?.trim() || `Hunt ${index + 1}`,
    description: rawHunt?.description?.trim() || "",
    questions,
  };
}

function normalizeQuestion(rawQuestion, questionNumber) {
  return {
    number: questionNumber,
    question:
      rawQuestion?.question ??
      `Add the question for step ${questionNumber}.`,
    answers: Array.isArray(rawQuestion?.answers)
      ? rawQuestion.answers.map((answer) => String(answer).trim()).filter(Boolean)
      : [],
    clueTitle: rawQuestion?.clueTitle ?? "Clue unlocked",
    clue: rawQuestion?.clue ?? "Add the clue for the next QR code location.",
  };
}

function ensureUniqueHuntIds(hunts) {
  return hunts.map((hunt, index, allHunts) => ({
    ...hunt,
    id: generateUniqueHuntId(hunt.id || `hunt-${index + 1}`, allHunts.slice(0, index)),
  }));
}

function getSelectedHunt(state) {
  return (
    state.library.hunts.find((hunt) => hunt.id === state.selectedHuntId) ||
    state.library.hunts.find((hunt) => hunt.id === state.library.activeHuntId) ||
    state.library.hunts[0]
  );
}

function createBlankHunt(existingHunts) {
  const id = generateUniqueHuntId("new-hunt", existingHunts);

  return {
    id,
    name: "New Hunt",
    description: "Add teacher notes or the class name here.",
    questions: Array.from({ length: QUESTION_COUNT }, (_, index) =>
      normalizeQuestion(null, index + 1)
    ),
  };
}

function questionEditorMarkup(question) {
  return `
    <article class="question-editor-card">
      <div class="question-editor-head">
        <span class="question-chip">Question ${question.number}</span>
      </div>

      <label class="field-group">
        <span class="label">Question text</span>
        <textarea
          class="qr-textarea"
          rows="3"
          data-question-field="question"
          data-question-number="${question.number}"
        >${escapeHtml(question.question)}</textarea>
      </label>

      <label class="field-group">
        <span class="label">Accepted answers</span>
        <input
          class="answer-input"
          type="text"
          value="${escapeHtml(question.answers.join(", "))}"
          data-question-field="answers"
          data-question-number="${question.number}"
        />
      </label>

      <label class="field-group">
        <span class="label">Clue title</span>
        <input
          class="answer-input"
          type="text"
          value="${escapeHtml(question.clueTitle)}"
          data-question-field="clueTitle"
          data-question-number="${question.number}"
        />
      </label>

      <label class="field-group">
        <span class="label">Clue or hint for the next QR code</span>
        <textarea
          class="qr-textarea"
          rows="3"
          data-question-field="clue"
          data-question-number="${question.number}"
        >${escapeHtml(question.clue)}</textarea>
      </label>
    </article>
  `;
}

function buildPreviewUrl(huntId, questionNumber) {
  return `q${questionNumber}.html?hunt=${encodeURIComponent(huntId)}&preview=1`;
}

function resolveQuestionQrValue(rawValue, huntId, questionNumber) {
  const trimmed = rawValue.trim();
  let value = trimmed;

  if (/\/q\d+\.html?$/i.test(trimmed)) {
    value = trimmed.replace(/q\d+\.html?$/i, `q${questionNumber}.html`);
  } else if (/\/index\.html?$/i.test(trimmed)) {
    value = trimmed.replace(/index\.html?$/i, `q${questionNumber}.html`);
  } else {
    const normalizedBaseUrl = normalizeBaseUrl(trimmed);

    if (normalizedBaseUrl) {
      value = `${normalizedBaseUrl}q${questionNumber}.html`;
    }
  }

  return upsertSearchParam(value, "hunt", huntId);
}

function upsertSearchParam(rawValue, key, value) {
  try {
    const url = new URL(rawValue);
    url.searchParams.set(key, value);
    return url.toString();
  } catch (error) {
    const delimiter = rawValue.includes("?") ? "&" : "?";
    const withoutExisting = rawValue.replace(
      new RegExp(`([?&])${key}=[^&]*`),
      "$1"
    ).replace(/[?&]$/, "");
    const finalDelimiter = withoutExisting.includes("?") ? "&" : "?";
    return `${withoutExisting}${finalDelimiter}${key}=${encodeURIComponent(value)}`;
  }
}

function populateQuestionSelect(questionSelect) {
  questionSelect.innerHTML = Array.from({ length: QUESTION_COUNT }, (_, index) => {
    const questionNumber = index + 1;
    return `<option value="${questionNumber}">Question ${questionNumber}</option>`;
  }).join("");
}

function initializeBaseUrl(baseUrlInput) {
  if (baseUrlInput.value.trim()) {
    return;
  }

  if (window.location.protocol === "file:") {
    baseUrlInput.value = "https://lhomer7.github.io/EduCache/";
    return;
  }

  baseUrlInput.value = normalizeBaseUrl(window.location.href.replace(/index\.html?$/i, ""));
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function buildQrFallbackUrl(value, size) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

function buildHuntDataFile(library) {
  const normalizedLibrary = normalizeLibraryData(library);
  const libraryJson = JSON.stringify(normalizedLibrary, null, 2);

  return `window.HUNT_LIBRARY = ${libraryJson};

(function syncLegacyActiveHunt() {
  const library = window.HUNT_LIBRARY;
  const activeHunt =
    library.hunts.find((hunt) => hunt.id === library.activeHuntId) || library.hunts[0];

  window.HUNT_DATA = activeHunt ? activeHunt.questions : [];
})();
`;
}

function librariesMatch(firstLibrary, secondLibrary) {
  return JSON.stringify(normalizeLibraryData(firstLibrary)) ===
    JSON.stringify(normalizeLibraryData(secondLibrary));
}

function splitAnswers(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeHuntId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueHuntId(baseId, hunts, excludeId) {
  const safeBaseId = sanitizeHuntId(baseId) || "hunt";
  const takenIds = new Set(
    hunts
      .map((hunt) => hunt.id)
      .filter((huntId) => huntId && huntId !== excludeId)
  );

  if (!takenIds.has(safeBaseId)) {
    return safeBaseId;
  }

  let suffix = 2;

  while (takenIds.has(`${safeBaseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${safeBaseId}-${suffix}`;
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: "text/javascript;charset=utf-8" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
