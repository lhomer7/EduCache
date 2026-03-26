const DEFAULT_QUESTION_COUNT = 10;
const MAX_STATIC_QUESTION_PAGES = 20;
const DRAFT_LIBRARY_STORAGE_KEY = "qr-hunt-library-draft";
const PROGRESS_STORAGE_PREFIX = "qr-hunt-progress";

document.addEventListener("DOMContentLoaded", () => {
  const publishedLibrary = getPublishedLibrary();

  setupTeacherHome(publishedLibrary);
  setupHuntEditor(publishedLibrary);
  setupQuestionPage(publishedLibrary);
});

function setupTeacherHome(publishedLibrary) {
  const home = document.querySelector("[data-teacher-home]");

  if (!home) {
    return;
  }

  const state = {
    publishedLibrary: cloneData(publishedLibrary),
    library: loadTeacherLibrary(publishedLibrary),
  };

  const elements = {
    status: document.querySelector("[data-home-status]"),
    saveStatus: document.querySelector("[data-home-save-status]"),
    huntList: document.querySelector("[data-home-hunt-list]"),
    createHunt: document.querySelector("[data-create-hunt]"),
    downloadLibrary: document.querySelector("[data-download-library]"),
    resetDrafts: document.querySelector("[data-reset-drafts]"),
  };

  elements.createHunt.addEventListener("click", () => {
    const newHunt = createBlankHunt(state.library.hunts);
    state.library.hunts.push(newHunt);
    commitTeacherLibrary(state.library);
    window.location.href = `hunt-editor.html?hunt=${encodeURIComponent(newHunt.id)}`;
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
    renderTeacherHome(state, elements);
  });

  elements.huntList.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-hunt]");

    if (!openButton) {
      return;
    }

    window.location.href = `hunt-editor.html?hunt=${encodeURIComponent(
      openButton.dataset.openHunt
    )}`;
  });

  renderTeacherHome(state, elements);
}

function renderTeacherHome(state, elements) {
  const huntCount = state.library.hunts.length;
  const hasDraftChanges = !librariesMatch(state.library, state.publishedLibrary);

  elements.status.textContent = `${huntCount} hunt${huntCount === 1 ? "" : "s"} available in this browser.`;
  elements.saveStatus.textContent = hasDraftChanges
    ? "You have local unpublished edits. Download hunt-data.js and upload it to GitHub when you are ready to publish."
    : "This browser matches the published hunt-data.js file.";

  elements.huntList.innerHTML = state.library.hunts
    .map((hunt) => {
      const isDefault = hunt.id === state.library.activeHuntId;

      return `
        <article class="hunt-home-card">
          <div class="hunt-home-copy">
            <p class="hunt-home-tag">${isDefault ? "Default hunt" : "Saved hunt"}</p>
            <h3>${escapeHtml(hunt.name)}</h3>
            <p>${escapeHtml(hunt.description || "No teacher notes added yet.")}</p>
            <p class="hunt-home-meta">
              ${hunt.questions.length} question${hunt.questions.length === 1 ? "" : "s"} | ID: ${escapeHtml(hunt.id)}
            </p>
          </div>
          <div class="hero-actions">
            <button class="primary-action" type="button" data-open-hunt="${escapeHtml(hunt.id)}">
              Open hunt
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function setupHuntEditor(publishedLibrary) {
  const editorPage = document.querySelector("[data-hunt-editor-page]");

  if (!editorPage) {
    return;
  }

  const state = {
    publishedLibrary: cloneData(publishedLibrary),
    library: loadTeacherLibrary(publishedLibrary),
    selectedHuntId: "",
  };

  state.selectedHuntId = getSelectedHuntIdFromUrl(state.library);

  const elements = {
    huntList: document.querySelector("[data-hunt-list]"),
    selectedHuntName: document.querySelector("[data-selected-hunt-name]"),
    selectedHuntNote: document.querySelector("[data-selected-hunt-note]"),
    huntName: document.querySelector("[data-hunt-name]"),
    huntId: document.querySelector("[data-hunt-id]"),
    huntDescription: document.querySelector("[data-hunt-description]"),
    saveStatus: document.querySelector("[data-save-status]"),
    setActiveHunt: document.querySelector("[data-set-active-hunt]"),
    createHunt: document.querySelector("[data-create-hunt]"),
    duplicateHunt: document.querySelector("[data-duplicate-hunt]"),
    deleteHunt: document.querySelector("[data-delete-hunt]"),
    downloadLibrary: document.querySelector("[data-download-library]"),
    addQuestion: document.querySelector("[data-add-question]"),
    removeQuestion: document.querySelector("[data-remove-question]"),
    resetProgress: document.querySelector("[data-reset-progress]"),
    questionEditor: document.querySelector("[data-question-editor]"),
    previewLinks: document.querySelector("[data-preview-links]"),
    qrHuntLabel: document.querySelector("[data-qr-hunt-label]"),
    qrBaseUrl: document.querySelector("[data-qr-base-url]"),
    qrQuestionSelect: document.querySelector("[data-qr-question-select]"),
    qrSize: document.querySelector("[data-qr-size]"),
    qrGenerate: document.querySelector("[data-generate-qr]"),
    qrDownload: document.querySelector("[data-download-qr]"),
    qrStatus: document.querySelector("[data-qr-status]"),
    qrOutputUrl: document.querySelector("[data-qr-output-url]"),
    qrPreview: document.querySelector("[data-qr-preview]"),
  };

  initializeBaseUrl(elements.qrBaseUrl);

  elements.huntList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-hunt]");

    if (!button) {
      return;
    }

    state.selectedHuntId = button.dataset.selectHunt;
    syncSelectedHuntInUrl(state.selectedHuntId);
    renderHuntEditor(state, elements);
  });

  elements.createHunt.addEventListener("click", () => {
    const newHunt = createBlankHunt(state.library.hunts);
    state.library.hunts.push(newHunt);
    state.selectedHuntId = newHunt.id;
    commitTeacherLibrary(state.library);
    syncSelectedHuntInUrl(state.selectedHuntId);
    renderHuntEditor(state, elements);
  });

  elements.duplicateHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    const copy = cloneData(selectedHunt);
    copy.name = `${selectedHunt.name} Copy`;
    copy.id = generateUniqueHuntId(`${selectedHunt.id}-copy`, state.library.hunts);
    state.library.hunts.push(copy);
    state.selectedHuntId = copy.id;
    commitTeacherLibrary(state.library);
    syncSelectedHuntInUrl(state.selectedHuntId);
    renderHuntEditor(state, elements);
  });

  elements.deleteHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt || state.library.hunts.length <= 1) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${selectedHunt.name}"?`);

    if (!shouldDelete) {
      return;
    }

    state.library.hunts = state.library.hunts.filter((hunt) => hunt.id !== selectedHunt.id);

    if (state.library.activeHuntId === selectedHunt.id) {
      state.library.activeHuntId = state.library.hunts[0].id;
    }

    state.selectedHuntId = state.library.hunts[0].id;
    commitTeacherLibrary(state.library);
    syncSelectedHuntInUrl(state.selectedHuntId);
    renderHuntEditor(state, elements);
  });

  elements.setActiveHunt.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    state.library.activeHuntId = selectedHunt.id;
    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.downloadLibrary.addEventListener("click", () => {
    downloadTextFile("hunt-data.js", buildHuntDataFile(state.library));
  });

  elements.huntName.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.name = event.target.value.trim() || "Untitled Hunt";
    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.huntId.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    const nextId = generateUniqueHuntId(event.target.value, state.library.hunts, selectedHunt.id);

    renameProgressKeys(selectedHunt.id, nextId, selectedHunt.questions.length);

    if (state.library.activeHuntId === selectedHunt.id) {
      state.library.activeHuntId = nextId;
    }

    selectedHunt.id = nextId;
    state.selectedHuntId = nextId;
    commitTeacherLibrary(state.library);
    syncSelectedHuntInUrl(state.selectedHuntId);
    renderHuntEditor(state, elements);
  });

  elements.huntDescription.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.description = event.target.value;
    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.questionEditor.addEventListener("change", (event) => {
    const selectedHunt = getSelectedHunt(state);
    const field = event.target.dataset.questionField;
    const questionNumber = Number(event.target.dataset.questionNumber);

    if (!selectedHunt || !field || !questionNumber) {
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

    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.addQuestion.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    if (selectedHunt.questions.length >= MAX_STATIC_QUESTION_PAGES) {
      elements.saveStatus.textContent =
        `This site currently has static question pages up to q${MAX_STATIC_QUESTION_PAGES}.`;
      return;
    }

    selectedHunt.questions.push(createQuestion(selectedHunt.questions.length + 1));
    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.removeQuestion.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt || selectedHunt.questions.length <= 1) {
      return;
    }

    selectedHunt.questions.pop();
    commitTeacherLibrary(state.library);
    renderHuntEditor(state, elements);
  });

  elements.resetProgress.addEventListener("click", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt || getSolvedCount(selectedHunt.id, selectedHunt.questions.length) === 0) {
      return;
    }

    const shouldReset = window.confirm(
      `Clear saved progress for "${selectedHunt.name}" on this device?`
    );

    if (!shouldReset) {
      return;
    }

    clearProgressForHunt(selectedHunt.id, selectedHunt.questions.length);
    renderHuntEditor(state, elements);
  });

  elements.qrGenerate.addEventListener("click", () => {
    renderQrForSelectedHunt(state, elements);
  });

  elements.qrDownload.addEventListener("click", () => {
    downloadQrCode(elements);
  });

  elements.qrSize.addEventListener("change", () => {
    renderQrForSelectedHunt(state, elements);
  });

  elements.qrQuestionSelect.addEventListener("change", () => {
    renderQrForSelectedHunt(state, elements);
  });

  renderHuntEditor(state, elements);
}

function renderHuntEditor(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt) {
    return;
  }

  renderSidebarHunts(state, elements.huntList);
  renderSelectedHunt(state, elements, selectedHunt);
  renderPreviewLinks(elements.previewLinks, selectedHunt);
  populateQuestionSelect(elements.qrQuestionSelect, selectedHunt.questions.length);
  renderQrForSelectedHunt(state, elements);
}

function renderSidebarHunts(state, huntList) {
  huntList.innerHTML = state.library.hunts
    .map((hunt) => {
      const isSelected = hunt.id === state.selectedHuntId;
      const isDefault = hunt.id === state.library.activeHuntId;

      return `
        <button
          class="hunt-list-item${isSelected ? " is-selected" : ""}"
          type="button"
          data-select-hunt="${escapeHtml(hunt.id)}"
        >
          <span class="hunt-list-name">${escapeHtml(hunt.name)}</span>
          <span class="hunt-list-meta">
            ${isDefault ? "Default hunt" : "Saved hunt"} | ${hunt.questions.length} questions
          </span>
        </button>
      `;
    })
    .join("");
}

function renderSelectedHunt(state, elements, selectedHunt) {
  const solvedCount = getSolvedCount(selectedHunt.id, selectedHunt.questions.length);
  const hasDraftChanges = !librariesMatch(state.library, state.publishedLibrary);

  elements.selectedHuntName.textContent = `${selectedHunt.name}`;
  elements.selectedHuntNote.textContent =
    `Students open links like q1.html?hunt=${selectedHunt.id}.`;
  elements.huntName.value = selectedHunt.name;
  elements.huntId.value = selectedHunt.id;
  elements.huntDescription.value = selectedHunt.description || "";
  elements.setActiveHunt.disabled = selectedHunt.id === state.library.activeHuntId;
  elements.deleteHunt.disabled = state.library.hunts.length <= 1;
  elements.removeQuestion.disabled = selectedHunt.questions.length <= 1;
  elements.addQuestion.disabled = selectedHunt.questions.length >= MAX_STATIC_QUESTION_PAGES;
  elements.resetProgress.disabled = solvedCount === 0;
  elements.saveStatus.textContent = hasDraftChanges
    ? `Local edits are saved in this browser. ${solvedCount} of ${selectedHunt.questions.length} questions have saved progress on this device.`
    : `This hunt matches the published file. ${solvedCount} of ${selectedHunt.questions.length} questions have saved progress on this device.`;
  elements.qrHuntLabel.textContent =
    `QR codes currently point to "${selectedHunt.name}" using hunt ID "${selectedHunt.id}".`;
  elements.questionEditor.innerHTML = selectedHunt.questions
    .map((question) => questionEditorMarkup(question))
    .join("");
}

function renderPreviewLinks(previewLinks, selectedHunt) {
  previewLinks.innerHTML = selectedHunt.questions
    .map((question) => {
      return `<a class="page-link" href="${escapeHtml(
        buildPreviewUrl(selectedHunt.id, question.number)
      )}">Question ${question.number}</a>`;
    })
    .join("");
}

function renderQrForSelectedHunt(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt) {
    return;
  }

  const rawValue = elements.qrBaseUrl.value.trim();

  if (!rawValue) {
    elements.qrStatus.textContent = "Enter the public site URL first.";
    elements.qrDownload.disabled = true;
    return;
  }

  const questionNumber = Number(elements.qrQuestionSelect.value || "1");
  const value = resolveQuestionQrValue(rawValue, selectedHunt.id, questionNumber);

  renderQrImage(elements.qrPreview, value, Number(elements.qrSize.value || "240"));
  elements.qrOutputUrl.textContent = value;
  elements.qrDownload.disabled = false;
  elements.qrStatus.textContent = window.QRCode
    ? "QR code ready. Download the PNG when you are happy with it."
    : "QR code ready. A fallback online generator was used for this image.";
}

function setupQuestionPage(publishedLibrary) {
  const card = document.querySelector("[data-question-number]");

  if (!card) {
    return;
  }

  const library = getQuestionPageLibrary(publishedLibrary);
  const searchParams = new URLSearchParams(window.location.search);
  const questionNumber = Number(card.dataset.questionNumber);
  const requestedHuntId = searchParams.get("hunt");
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
  syncProgress(
    elements.progressLabel,
    elements.progressBar,
    selectedHunt.id,
    selectedHunt.questions.length
  );

  if (
    window.localStorage.getItem(storageKey(selectedHunt.id, questionNumber)) === "solved"
  ) {
    markSolved(elements, selectedHunt.id, selectedHunt.questions.length);
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
      markSolved(elements, selectedHunt.id, selectedHunt.questions.length);
      return;
    }

    setFeedback(elements.feedback, "Not quite. Try again.", "is-error");
  });
}

function renderQuestion(hunt, question, elements) {
  document.title = `Question ${question.number}`;
  elements.stepLabel.textContent = `Question ${question.number} of ${hunt.questions.length}`;
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
      "Check the selected hunt and make sure this question number exists.";
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

function clearProgressForHunt(huntId, totalQuestions) {
  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    window.localStorage.removeItem(storageKey(huntId, questionNumber));
  }
}

function renameProgressKeys(oldHuntId, newHuntId, totalQuestions) {
  if (oldHuntId === newHuntId) {
    return;
  }

  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    const oldKey = storageKey(oldHuntId, questionNumber);
    const value = window.localStorage.getItem(oldKey);

    if (value !== null) {
      window.localStorage.setItem(storageKey(newHuntId, questionNumber), value);
      window.localStorage.removeItem(oldKey);
    }
  }
}

function getQuestionPageLibrary(publishedLibrary) {
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewMode = searchParams.get("preview") === "1";

  if (isPreviewMode) {
    return loadTeacherLibrary(publishedLibrary);
  }

  return cloneData(publishedLibrary);
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

function commitTeacherLibrary(library) {
  window.localStorage.setItem(
    DRAFT_LIBRARY_STORAGE_KEY,
    JSON.stringify(normalizeLibraryData(library))
  );
}

function getSelectedHuntIdFromUrl(library) {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedHuntId = searchParams.get("hunt");

  if (library.hunts.some((hunt) => hunt.id === requestedHuntId)) {
    return requestedHuntId;
  }

  return library.activeHuntId || library.hunts[0]?.id || "";
}

function syncSelectedHuntInUrl(huntId) {
  const url = new URL(window.location.href);
  url.searchParams.set("hunt", huntId);
  window.history.replaceState({}, "", url.toString());
}

function getSelectedHunt(state) {
  return (
    state.library.hunts.find((hunt) => hunt.id === state.selectedHuntId) ||
    state.library.hunts.find((hunt) => hunt.id === state.library.activeHuntId) ||
    state.library.hunts[0]
  );
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
  const id = sanitizeHuntId(rawHunt?.id || rawHunt?.name || `hunt-${index + 1}`);
  const rawQuestions = Array.isArray(rawHunt?.questions) ? rawHunt.questions : [];
  const questionCount = Math.max(rawQuestions.length, DEFAULT_QUESTION_COUNT, 1);
  const questions = Array.from(
    { length: Math.min(questionCount, MAX_STATIC_QUESTION_PAGES) },
    (_, indexNumber) => {
      const questionNumber = indexNumber + 1;
      const rawQuestion = rawQuestions.find((item) => Number(item.number) === questionNumber);
      return normalizeQuestion(rawQuestion, questionNumber);
    }
  );

  return {
    id: id || `hunt-${index + 1}`,
    name: rawHunt?.name?.trim() || `Hunt ${index + 1}`,
    description: rawHunt?.description?.trim() || "",
    questions,
  };
}

function normalizeQuestion(rawQuestion, questionNumber) {
  return {
    number: questionNumber,
    question: rawQuestion?.question ?? `Add the question for step ${questionNumber}.`,
    answers: Array.isArray(rawQuestion?.answers)
      ? rawQuestion.answers.map((answer) => String(answer).trim()).filter(Boolean)
      : [],
    clueTitle: rawQuestion?.clueTitle ?? "Clue unlocked",
    clue: rawQuestion?.clue ?? "Add the clue for the next QR code location.",
  };
}

function createBlankHunt(existingHunts) {
  return {
    id: generateUniqueHuntId("new-hunt", existingHunts),
    name: "New Hunt",
    description: "Add teacher notes or class details here.",
    questions: Array.from({ length: DEFAULT_QUESTION_COUNT }, (_, index) =>
      createQuestion(index + 1)
    ),
  };
}

function createQuestion(questionNumber) {
  return normalizeQuestion(null, questionNumber);
}

function ensureUniqueHuntIds(hunts) {
  const seen = [];

  return hunts.map((hunt) => {
    const nextHunt = {
      ...hunt,
      id: generateUniqueHuntId(hunt.id, seen),
    };

    seen.push(nextHunt);
    return nextHunt;
  });
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
        <span class="label">Hint or clue for the next QR code</span>
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

function populateQuestionSelect(questionSelect, questionCount) {
  questionSelect.innerHTML = Array.from({ length: questionCount }, (_, index) => {
    const number = index + 1;
    return `<option value="${number}">Question ${number}</option>`;
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

  baseUrlInput.value = normalizeBaseUrl(window.location.href.replace(/hunt-editor\.html?$/i, ""));
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function resolveQuestionQrValue(rawValue, huntId, questionNumber) {
  const trimmed = rawValue.trim();
  let value = trimmed;

  if (/\/q\d+\.html?$/i.test(trimmed)) {
    value = trimmed.replace(/q\d+\.html?$/i, `q${questionNumber}.html`);
  } else if (/\/index\.html?$/i.test(trimmed) || /\/hunt-editor\.html?$/i.test(trimmed)) {
    value = trimmed.replace(/(index|hunt-editor)\.html?$/i, `q${questionNumber}.html`);
  } else {
    value = `${normalizeBaseUrl(trimmed)}q${questionNumber}.html`;
  }

  return upsertSearchParam(value, "hunt", huntId);
}

function upsertSearchParam(rawValue, key, value) {
  try {
    const url = new URL(rawValue);
    url.searchParams.set(key, value);
    url.searchParams.delete("preview");
    return url.toString();
  } catch (error) {
    const withoutPreview = rawValue
      .replace(/([?&])preview=1(&|$)/, "$1")
      .replace(/[?&]$/, "");
    const cleaned = withoutPreview
      .replace(new RegExp(`([?&])${key}=[^&]*`), "$1")
      .replace(/[?&]$/, "");
    const separator = cleaned.includes("?") ? "&" : "?";
    return `${cleaned}${separator}${key}=${encodeURIComponent(value)}`;
  }
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
  const link = document.createElement("a");
  const fileLabel = `q${elements.qrQuestionSelect.value || "1"}`;

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
