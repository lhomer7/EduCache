const DEFAULT_QUESTION_COUNT = 10;
const MAX_STATIC_QUESTION_PAGES = 20;
const LEGACY_DRAFT_STORAGE_KEY = "qr-hunt-library-draft";
const PROGRESS_STORAGE_PREFIX = "qr-hunt-progress";
const resetVersionCache = {};

const supabaseClient = createSupabaseClient();

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    showConfigurationError();
    return;
  }

  if (document.querySelector("[data-teacher-home]")) {
    await setupTeacherHome();
  }

  if (document.querySelector("[data-hunt-editor-page]")) {
    await setupHuntEditor();
  }

  if (document.querySelector("[data-question-number]")) {
    await setupQuestionPage();
  }
});

async function setupTeacherHome() {
  const elements = {
    authView: document.querySelector("[data-auth-view]"),
    dashboardView: document.querySelector("[data-dashboard-view]"),
    loginForm: document.querySelector("[data-login-form]"),
    loginEmail: document.querySelector("[data-login-email]"),
    loginPassword: document.querySelector("[data-login-password]"),
    authStatus: document.querySelector("[data-auth-status]"),
    userEmail: document.querySelector("[data-user-email]"),
    homeStatus: document.querySelector("[data-home-status]"),
    homeSaveStatus: document.querySelector("[data-home-save-status]"),
    huntList: document.querySelector("[data-home-hunt-list]"),
    createHunt: document.querySelector("[data-create-hunt]"),
    signOut: document.querySelector("[data-sign-out]"),
  };

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    elements.authStatus.textContent = "Signing in...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: elements.loginEmail.value.trim(),
      password: elements.loginPassword.value,
    });

    if (error) {
      elements.authStatus.textContent = error.message;
      return;
    }

    elements.loginPassword.value = "";
    await renderTeacherHome(elements);
  });

  elements.createHunt.addEventListener("click", async () => {
    const user = await getCurrentUser();

    if (!user) {
      await renderTeacherHome(elements);
      return;
    }

    const createdHunt = await createHuntOnline(
      user.id,
      "New Hunt",
      "Add teacher notes or class details here."
    );

    if (!createdHunt) {
      elements.homeSaveStatus.textContent = "Could not create a new hunt online.";
      return;
    }

    window.location.href = `hunt-editor.html?hunt=${encodeURIComponent(createdHunt.id)}`;
  });

  elements.signOut.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    await renderTeacherHome(elements);
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

  supabaseClient.auth.onAuthStateChange(() => {
    renderTeacherHome(elements);
  });

  await renderTeacherHome(elements);
}

async function renderTeacherHome(elements) {
  const user = await getCurrentUser();

  if (!user) {
    elements.authView.classList.remove("is-hidden");
    elements.dashboardView.classList.add("is-hidden");
    elements.authStatus.textContent = "Sign in to load your online hunts.";
    return;
  }

  elements.authView.classList.add("is-hidden");
  elements.dashboardView.classList.remove("is-hidden");
  elements.userEmail.textContent = user.email || "Signed in";

  const hunts = await fetchTeacherHunts();
  elements.homeStatus.textContent = `${hunts.length} hunt${
    hunts.length === 1 ? "" : "s"
  } saved online.`;
  elements.homeSaveStatus.textContent = "Your hunts are now saved online in Supabase.";

  if (hunts.length === 0) {
    elements.huntList.innerHTML = `
      <article class="hunt-home-card">
        <div class="hunt-home-copy">
          <p class="hunt-home-tag">No hunts yet</p>
          <h3>Create your first online hunt</h3>
          <p>Use the Open Hunt Manager button to start building a QR code hunt in Supabase.</p>
        </div>
      </article>
    `;
    return;
  }

  elements.huntList.innerHTML = hunts
    .map((hunt) => {
      return `
        <article class="hunt-home-card">
          <div class="hunt-home-copy">
            <p class="hunt-home-tag">Online hunt</p>
            <h3>${escapeHtml(hunt.name)}</h3>
            <p>${escapeHtml(hunt.description || "No teacher notes added yet.")}</p>
            <p class="hunt-home-meta">${hunt.questionCount} question${
              hunt.questionCount === 1 ? "" : "s"
            }</p>
          </div>
          <div class="hero-actions">
            <button class="primary-action" type="button" data-open-hunt="${escapeHtml(
              hunt.id
            )}">
              Open hunt
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function setupHuntEditor() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const elements = {
    editorUser: document.querySelector("[data-editor-user]"),
    huntList: document.querySelector("[data-hunt-list]"),
    selectedHuntName: document.querySelector("[data-selected-hunt-name]"),
    selectedHuntNote: document.querySelector("[data-selected-hunt-note]"),
    huntName: document.querySelector("[data-hunt-name]"),
    huntCode: document.querySelector("[data-hunt-code]"),
    huntDescription: document.querySelector("[data-hunt-description]"),
    saveStatus: document.querySelector("[data-save-status]"),
    createHunt: document.querySelector("[data-create-hunt]"),
    duplicateHunt: document.querySelector("[data-duplicate-hunt]"),
    deleteHunt: document.querySelector("[data-delete-hunt]"),
    signOut: document.querySelector("[data-sign-out]"),
    addQuestion: document.querySelector("[data-add-question]"),
    removeQuestion: document.querySelector("[data-remove-question]"),
    resetProgress: document.querySelector("[data-reset-progress]"),
    questionEditor: document.querySelector("[data-question-editor]"),
    previewLinks: document.querySelector("[data-preview-links]"),
    qrHuntLabel: document.querySelector("[data-qr-hunt-label]"),
    qrBaseUrl: document.querySelector("[data-qr-base-url]"),
    qrQuestionSelect: document.querySelector("[data-qr-question-select]"),
    qrQuestionTitle: document.querySelector("[data-qr-question-title]"),
    qrQuestionClue: document.querySelector("[data-qr-question-clue]"),
    qrSize: document.querySelector("[data-qr-size]"),
    qrGenerate: document.querySelector("[data-generate-qr]"),
    qrDownload: document.querySelector("[data-download-qr]"),
    openPreviewQuestion: document.querySelector("[data-open-preview-question]"),
    qrStatus: document.querySelector("[data-qr-status]"),
    qrModeHelp: document.querySelector("[data-qr-mode-help]"),
    qrOutputUrl: document.querySelector("[data-qr-output-url]"),
    qrPreview: document.querySelector("[data-qr-preview]"),
  };

  const state = {
    user,
    hunts: [],
    selectedHuntId: null,
    selectedQuestions: [],
    saveTimers: new Map(),
  };

  elements.editorUser.textContent = user.email || "Signed in";
  initializeBaseUrl(elements.qrBaseUrl);

  elements.huntList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-select-hunt]");

    if (!button) {
      return;
    }

    state.selectedHuntId = button.dataset.selectHunt;
    syncSelectedHuntInUrl(state.selectedHuntId);
    await refreshEditorState(state, elements);
  });

  elements.createHunt.addEventListener("click", async () => {
    const createdHunt = await createHuntOnline(
      state.user.id,
      "New Hunt",
      "Add teacher notes or class details here."
    );

    if (!createdHunt) {
      elements.saveStatus.textContent = "Could not create a new hunt online.";
      return;
    }

    state.selectedHuntId = createdHunt.id;
    syncSelectedHuntInUrl(state.selectedHuntId);
    await refreshEditorState(state, elements);
  });

  elements.duplicateHunt.addEventListener("click", async () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    elements.saveStatus.textContent = `Duplicating "${selectedHunt.name}" online...`;
    const duplicatedHunt = await duplicateHuntOnline(
      selectedHunt,
      state.selectedQuestions,
      state.user.id
    );

    if (!duplicatedHunt) {
      elements.saveStatus.textContent = "Could not duplicate this hunt.";
      return;
    }

    state.selectedHuntId = duplicatedHunt.id;
    syncSelectedHuntInUrl(state.selectedHuntId);
    await refreshEditorState(state, elements);
  });

  elements.deleteHunt.addEventListener("click", async () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${selectedHunt.name}" from Supabase?`);

    if (!shouldDelete) {
      return;
    }

    const { error } = await supabaseClient.from("hunts").delete().eq("id", selectedHunt.id);

    if (error) {
      elements.saveStatus.textContent = error.message;
      return;
    }

    state.selectedHuntId = null;
    await refreshEditorState(state, elements);
  });

  elements.signOut.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  elements.huntName.addEventListener("input", async () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.name = elements.huntName.value;
    scheduleSave(
      state,
      "hunt-name",
      async () => {
        const { error } = await supabaseClient
          .from("hunts")
          .update({ name: selectedHunt.name || "Untitled Hunt" })
          .eq("id", selectedHunt.id);

        if (error) {
          throw error;
        }
      },
      elements,
      `Saved "${selectedHunt.name || "Untitled Hunt"}" online.`
    );
    await renderSelectedHunt(state, elements);
  });

  elements.huntDescription.addEventListener("input", () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    selectedHunt.description = elements.huntDescription.value;
    scheduleSave(
      state,
      "hunt-description",
      async () => {
        const { error } = await supabaseClient
          .from("hunts")
          .update({ description: selectedHunt.description })
          .eq("id", selectedHunt.id);

        if (error) {
          throw error;
        }
      },
      elements,
      "Teacher notes saved online."
    );
  });

  elements.questionEditor.addEventListener("input", (event) => {
    const question = getQuestionFromEvent(state, event);

    if (!question) {
      return;
    }

    applyQuestionFieldChange(question, event.target.dataset.questionField, event.target.value);
    renderSelectedQuestionPreview(state, elements);

    scheduleSave(
      state,
      `question-${question.id}`,
      async () => {
        const { error } = await supabaseClient
          .from("questions")
          .update({
            question: question.question,
            answers: question.answers,
            clue_title: question.clue_title,
            clue: question.clue,
          })
          .eq("id", question.id);

        if (error) {
          throw error;
        }
      },
      elements,
      `Question ${question.number} saved online.`
    );
  });

  elements.addQuestion.addEventListener("click", async () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    if (state.selectedQuestions.length >= MAX_STATIC_QUESTION_PAGES) {
      elements.saveStatus.textContent =
        `This site currently has static question pages up to q${MAX_STATIC_QUESTION_PAGES}.`;
      return;
    }

    const nextNumber = state.selectedQuestions.length + 1;
    const { data, error } = await supabaseClient
      .from("questions")
      .insert({
        hunt_id: selectedHunt.id,
        number: nextNumber,
        question: `Add the question for step ${nextNumber}.`,
        answers: [],
        clue_title: "Clue unlocked",
        clue: "Add the clue for the next QR code location.",
      })
      .select()
      .single();

    if (error) {
      elements.saveStatus.textContent = error.message;
      return;
    }

    state.selectedQuestions.push(normalizeRemoteQuestion(data));
    await renderSelectedHunt(state, elements);
    renderPreviewLinks(elements.previewLinks, state.selectedQuestions, selectedHunt.id);
    populateQuestionSelect(elements.qrQuestionSelect, state.selectedQuestions.length);
    renderQrForSelectedHunt(state, elements);
    elements.saveStatus.textContent = `Question ${nextNumber} added online.`;
  });

  elements.removeQuestion.addEventListener("click", async () => {
    const selectedHunt = getSelectedHunt(state);
    const lastQuestion = state.selectedQuestions[state.selectedQuestions.length - 1];

    if (!selectedHunt || !lastQuestion || state.selectedQuestions.length <= 1) {
      return;
    }

    const { error } = await supabaseClient.from("questions").delete().eq("id", lastQuestion.id);

    if (error) {
      elements.saveStatus.textContent = error.message;
      return;
    }

    state.selectedQuestions.pop();
    await renderSelectedHunt(state, elements);
    renderPreviewLinks(elements.previewLinks, state.selectedQuestions, selectedHunt.id);
    populateQuestionSelect(elements.qrQuestionSelect, state.selectedQuestions.length);
    renderQrForSelectedHunt(state, elements);
    elements.saveStatus.textContent = `Question ${lastQuestion.number} removed online.`;
  });

  elements.resetProgress.addEventListener("click", async () => {
    const selectedHunt = getSelectedHunt(state);

    if (!selectedHunt) {
      return;
    }

    elements.resetProgress.disabled = true;
    elements.saveStatus.textContent = `Resetting saved progress for "${selectedHunt.name}"...`;

    const didReset = await clearProgressForHunt(selectedHunt.id);

    await renderSelectedHunt(state, elements);
    elements.resetProgress.disabled = false;
    elements.saveStatus.textContent = didReset
      ? `Saved progress reset for "${selectedHunt.name}" on every device.`
      : `Could not reset saved progress for "${selectedHunt.name}".`;
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

  await refreshEditorState(state, elements);
}

async function refreshEditorState(state, elements) {
  state.hunts = await fetchTeacherHunts();

  if (state.hunts.length === 0) {
    elements.huntList.innerHTML = `
      <button class="hunt-list-item is-selected" type="button">
        <span class="hunt-list-name">No hunts yet</span>
        <span class="hunt-list-meta">Create a new online hunt from the sidebar</span>
      </button>
    `;
    elements.questionEditor.innerHTML = "";
    elements.previewLinks.innerHTML = "";
    elements.saveStatus.textContent = "Create your first hunt to start editing online.";
    return;
  }

  if (!state.selectedHuntId || !state.hunts.some((hunt) => hunt.id === state.selectedHuntId)) {
    state.selectedHuntId = getSelectedHuntIdFromUrl(state.hunts) || state.hunts[0].id;
    syncSelectedHuntInUrl(state.selectedHuntId);
  }

  state.selectedQuestions = await fetchQuestionsForHunt(state.selectedHuntId);
  await renderHuntEditorPage(state, elements);
}

async function renderHuntEditorPage(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  renderSidebarHunts(state.hunts, state.selectedHuntId, elements.huntList);

  if (!selectedHunt) {
    return;
  }

  await renderSelectedHunt(state, elements);
  renderPreviewLinks(elements.previewLinks, state.selectedQuestions, selectedHunt.id);
  populateQuestionSelect(elements.qrQuestionSelect, state.selectedQuestions.length);
  renderQrForSelectedHunt(state, elements);
}

function renderSidebarHunts(hunts, selectedHuntId, huntList) {
  huntList.innerHTML = hunts
    .map((hunt) => {
      return `
        <button
          class="hunt-list-item${hunt.id === selectedHuntId ? " is-selected" : ""}"
          type="button"
          data-select-hunt="${escapeHtml(hunt.id)}"
        >
          <span class="hunt-list-name">${escapeHtml(hunt.name)}</span>
          <span class="hunt-list-meta">${hunt.questionCount} questions online</span>
        </button>
      `;
    })
    .join("");
}

async function renderSelectedHunt(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt) {
    return;
  }

  elements.selectedHuntName.textContent = selectedHunt.name;
  elements.selectedHuntNote.textContent =
    `Students open links like q1.html?hunt=${selectedHunt.id}.`;
  elements.huntName.value = selectedHunt.name;
  elements.huntCode.value = selectedHunt.id;
  elements.huntDescription.value = selectedHunt.description || "";
  elements.deleteHunt.disabled = state.hunts.length <= 1;
  elements.removeQuestion.disabled = state.selectedQuestions.length <= 1;
  elements.addQuestion.disabled = state.selectedQuestions.length >= MAX_STATIC_QUESTION_PAGES;
  elements.resetProgress.disabled = false;
  elements.qrHuntLabel.textContent =
    `QR codes currently point to "${selectedHunt.name}".`;
  elements.questionEditor.innerHTML = state.selectedQuestions
    .map((question) => questionEditorMarkup(question))
    .join("");
}

function renderPreviewLinks(previewLinks, questions, huntId) {
  previewLinks.innerHTML = questions
    .map((question) => {
      return `<a class="page-link" href="${escapeHtml(
        buildPreviewUrl(huntId, question.number)
      )}">Question ${question.number}</a>`;
    })
    .join("");
}

function renderSelectedQuestionPreview(state, elements) {
  const questionNumber = Number(elements.qrQuestionSelect.value || "1");
  const selectedQuestion = state.selectedQuestions.find((question) => question.number === questionNumber);
  const selectedHunt = getSelectedHunt(state);

  if (!selectedQuestion || !selectedHunt) {
    return;
  }

  elements.qrQuestionTitle.textContent = selectedQuestion.question;
  elements.qrQuestionClue.textContent =
    selectedQuestion.clue || "Add the clue or hint for the next QR code.";
  elements.openPreviewQuestion.href = buildPreviewUrl(selectedHunt.id, questionNumber);
}

function renderQrForSelectedHunt(state, elements) {
  const selectedHunt = getSelectedHunt(state);

  if (!selectedHunt || state.selectedQuestions.length === 0) {
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
  renderSelectedQuestionPreview(state, elements);
  elements.qrModeHelp.textContent =
    "Each QR code is tied to this hunt, so students will always open the matching hunt questions.";
  elements.qrStatus.textContent =
    `QR ready for "${selectedHunt.name}". Student pages use the live Supabase data for this hunt.`;
}

async function setupQuestionPage() {
  const card = document.querySelector("[data-question-number]");
  const questionNumber = Number(card.dataset.questionNumber);
  const searchParams = new URLSearchParams(window.location.search);
  const huntId = searchParams.get("hunt");
  const previewMode = searchParams.get("preview") === "1";
  const questionData = await loadQuestionPageData(huntId, previewMode);

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

  if (!questionData.hunt || questionData.questions.length === 0) {
    renderMissingQuestion(card, elements, "No hunt was found for this QR link.");
    return;
  }

  const currentQuestion = questionData.questions.find((question) => question.number === questionNumber);

  if (!currentQuestion) {
    renderMissingQuestion(card, elements, "This question number does not exist for the selected hunt.");
    return;
  }

  const chrome = buildQuestionChrome(questionData.hunt.id);
  elements.cardBody.insertBefore(chrome.wrapper, elements.cardBody.firstChild);
  elements.progressLabel = chrome.progressLabel;
  elements.progressBar = chrome.progressBar;

  renderQuestion(
    questionData.hunt,
    currentQuestion,
    questionData.questions.length,
    elements,
    previewMode
  );
  await syncProgress(
    elements.progressLabel,
    elements.progressBar,
    questionData.hunt.id,
    questionData.questions.length
  );

  if (await isQuestionSolved(questionData.hunt.id, questionNumber)) {
    await markSolved(elements, questionData.hunt.id, questionData.questions.length);
  } else {
    elements.input.focus();
  }

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submittedAnswer = normalizeAnswer(elements.input.value);
    const acceptedAnswers = currentQuestion.answers.map(normalizeAnswer);

    if (!submittedAnswer) {
      setFeedback(elements.feedback, "Enter an answer first.", "is-error");
      return;
    }

    if (acceptedAnswers.includes(submittedAnswer)) {
      await markQuestionSolved(questionData.hunt.id, questionNumber);
      await markSolved(elements, questionData.hunt.id, questionData.questions.length);
      return;
    }

    setFeedback(elements.feedback, "Not quite. Try again.", "is-error");
  });
}

async function loadQuestionPageData(huntId, previewMode) {
  let huntQuery = supabaseClient.from("hunts").select("id, name, description");

  if (huntId) {
    huntQuery = huntQuery.eq("id", huntId);
  } else {
    huntQuery = huntQuery.order("created_at", { ascending: true }).limit(1);
  }

  if (!previewMode) {
    huntQuery = huntQuery.eq("is_published", true);
  }

  const { data: huntRows } = await huntQuery;
  const hunt = huntRows && huntRows.length ? huntRows[0] : null;

  if (!hunt) {
    return { hunt: null, questions: [] };
  }

  const { data: questions } = await supabaseClient
    .from("questions")
    .select("id, hunt_id, number, question, answers, clue_title, clue")
    .eq("hunt_id", hunt.id)
    .order("number", { ascending: true });

  return {
    hunt,
    questions: (questions || []).map(normalizeRemoteQuestion),
  };
}

function renderQuestion(hunt, question, totalQuestions, elements, previewMode) {
  document.title = `Question ${question.number}`;
  elements.stepLabel.textContent = `Question ${question.number} of ${totalQuestions}`;
  elements.questionText.textContent = question.question;
  elements.questionHelp.textContent = previewMode
    ? `${hunt.name} | Teacher preview mode`
    : `${hunt.name} | Answers are not case-sensitive. Type the answer and tap unlock.`;
  elements.clueTitle.textContent = question.clue_title || "Clue unlocked";
  elements.clueText.textContent = question.clue;
}

function renderMissingQuestion(card, elements, message) {
  document.title = "Question not found";
  card.classList.add("is-missing");

  if (elements.stepLabel) {
    elements.stepLabel.textContent = "Question unavailable";
  }

  if (elements.questionText) {
    elements.questionText.textContent = "This question is not available right now.";
  }

  if (elements.questionHelp) {
    elements.questionHelp.textContent = message;
  }

  if (elements.form) {
    elements.form.style.display = "none";
  }

  if (elements.feedback) {
    setFeedback(elements.feedback, message, "is-error");
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

async function markSolved(elements, huntId, totalQuestions) {
  elements.input.value = "";
  elements.input.readOnly = true;
  elements.submitButton.disabled = true;
  elements.submitButton.textContent = "Unlocked";
  elements.cluePanel.classList.add("is-visible");
  setFeedback(elements.feedback, "Correct! Your clue is now unlocked.", "is-success");
  await syncProgress(elements.progressLabel, elements.progressBar, huntId, totalQuestions);
  elements.cluePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function syncProgress(progressLabel, progressBar, huntId, totalQuestions) {
  const solvedCount = await getSolvedCount(huntId, totalQuestions);
  const percentage = totalQuestions ? (solvedCount / totalQuestions) * 100 : 0;

  progressLabel.textContent = `${solvedCount} of ${totalQuestions} questions unlocked on this device`;
  progressBar.style.width = `${percentage}%`;
}

function setFeedback(feedback, message, className) {
  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-success");
  feedback.classList.add(className);
}

function storageKey(huntId, questionNumber, version = 0) {
  return `${PROGRESS_STORAGE_PREFIX}::${huntId}::v${version}::q${questionNumber}`;
}

async function getResetVersion(huntId) {
  if (resetVersionCache[huntId] != null) {
    return resetVersionCache[huntId];
  }

  const { data, error } = await supabaseClient
    .from("hunts")
    .select("reset_version")
    .eq("id", huntId)
    .single();

  if (error) {
    console.error(error);
  }

  const version = data?.reset_version || 0;
  resetVersionCache[huntId] = version;
  return version;
}

async function markQuestionSolved(huntId, questionNumber) {
  const version = await getResetVersion(huntId);

  window.localStorage.setItem(storageKey(huntId, questionNumber, version), "solved");
}

async function isQuestionSolved(huntId, questionNumber) {
  const version = await getResetVersion(huntId);

  return window.localStorage.getItem(storageKey(huntId, questionNumber, version)) === "solved";
}

async function getSolvedCount(huntId, totalQuestions) {
  const version = await getResetVersion(huntId);
  let solvedCount = 0;

  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    if (window.localStorage.getItem(storageKey(huntId, questionNumber, version)) === "solved") {
      solvedCount += 1;
    }
  }

  return solvedCount;
}

async function clearProgressForHunt(huntId) {
  const currentVersion = await getResetVersion(huntId);

  const { error } = await supabaseClient
    .from("hunts")
    .update({ reset_version: currentVersion + 1 })
    .eq("id", huntId);

  if (error) {
    console.error(error);
    return false;
  }

  resetVersionCache[huntId] = currentVersion + 1;
  return true;
}

async function fetchTeacherHunts() {
  const { data: hunts, error } = await supabaseClient
    .from("hunts")
    .select("id, name, description, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error || !hunts) {
    return [];
  }

  const { data: questions } = await supabaseClient
    .from("questions")
    .select("hunt_id, number");

  const countMap = new Map();

  (questions || []).forEach((question) => {
    const currentCount = countMap.get(question.hunt_id) || 0;
    countMap.set(question.hunt_id, currentCount + 1);
  });

  return hunts.map((hunt) => ({
    ...hunt,
    questionCount: countMap.get(hunt.id) || 0,
  }));
}

async function fetchQuestionsForHunt(huntId) {
  const { data: questions, error } = await supabaseClient
    .from("questions")
    .select("id, hunt_id, number, question, answers, clue_title, clue")
    .eq("hunt_id", huntId)
    .order("number", { ascending: true });

  if (error || !questions) {
    return [];
  }

  return questions.map(normalizeRemoteQuestion);
}

function normalizeRemoteQuestion(question) {
  return {
    ...question,
    answers: Array.isArray(question.answers) ? question.answers : [],
  };
}

async function createHuntOnline(ownerId, name, description) {
  const { data: hunt, error } = await supabaseClient
    .from("hunts")
    .insert({
      owner_id: ownerId,
      name,
      description,
      is_default: false,
      is_published: true,
    })
    .select()
    .single();

  if (error || !hunt) {
    return null;
  }

  const questions = Array.from({ length: DEFAULT_QUESTION_COUNT }, (_, index) => {
    const questionNumber = index + 1;
    return {
      hunt_id: hunt.id,
      number: questionNumber,
      question: `Add the question for step ${questionNumber}.`,
      answers: [],
      clue_title: "Clue unlocked",
      clue: "Add the clue for the next QR code location.",
    };
  });

  const { error: questionsError } = await supabaseClient.from("questions").insert(questions);

  if (questionsError) {
    return null;
  }

  return hunt;
}

async function duplicateHuntOnline(selectedHunt, questions, ownerId) {
  const createdHunt = await createHuntOnline(
    ownerId,
    `${selectedHunt.name} Copy`,
    selectedHunt.description || ""
  );

  if (!createdHunt) {
    return null;
  }

  const duplicatedQuestions = questions.map((question) => ({
    hunt_id: createdHunt.id,
    number: question.number,
    question: question.question,
    answers: question.answers,
    clue_title: question.clue_title,
    clue: question.clue,
  }));

  await supabaseClient.from("questions").delete().eq("hunt_id", createdHunt.id);
  const { error } = await supabaseClient.from("questions").insert(duplicatedQuestions);

  if (error) {
    return null;
  }

  return createdHunt;
}

function getCurrentUser() {
  return supabaseClient.auth.getUser().then(({ data }) => data.user);
}

function getSelectedHunt(state) {
  return state.hunts.find((hunt) => hunt.id === state.selectedHuntId) || null;
}

function getSelectedHuntIdFromUrl(hunts) {
  const requestedHuntId = new URLSearchParams(window.location.search).get("hunt");

  if (hunts.some((hunt) => hunt.id === requestedHuntId)) {
    return requestedHuntId;
  }

  return hunts[0]?.id || null;
}

function syncSelectedHuntInUrl(huntId) {
  const url = new URL(window.location.href);
  url.searchParams.set("hunt", huntId);
  window.history.replaceState({}, "", url.toString());
}

function applyQuestionFieldChange(question, field, value) {
  if (field === "answers") {
    question.answers = splitAnswers(value);
    return;
  }

  question[field] = value;
}

function getQuestionFromEvent(state, event) {
  const questionNumber = Number(event.target.dataset.questionNumber);
  const field = event.target.dataset.questionField;

  if (!field || !questionNumber) {
    return null;
  }

  return state.selectedQuestions.find((question) => question.number === questionNumber) || null;
}

function scheduleSave(state, key, saveFn, elements, successMessage) {
  window.clearTimeout(state.saveTimers.get(key));

  const timer = window.setTimeout(async () => {
    try {
      await saveFn();
      elements.saveStatus.textContent = successMessage;
    } catch (error) {
      elements.saveStatus.textContent = error.message || "Could not save changes online.";
    }
  }, 500);

  state.saveTimers.set(key, timer);
}

function getLegacyLocalLibrary() {
  const rawDraft = window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);

  if (!rawDraft) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawDraft);
    return normalizeLegacyLibrary(parsed);
  } catch (error) {
    return null;
  }
}

function normalizeLegacyLibrary(rawLibrary) {
  const hunts = Array.isArray(rawLibrary?.hunts) ? rawLibrary.hunts : [];

  return {
    activeHuntId: rawLibrary?.activeHuntId || "",
    hunts: hunts.map((hunt, huntIndex) => ({
      name: hunt?.name?.trim() || `Imported Hunt ${huntIndex + 1}`,
      description: hunt?.description?.trim() || "",
      questions: Array.isArray(hunt?.questions)
        ? hunt.questions
            .map((question, index) => ({
              number: Number(question?.number) || index + 1,
              question: question?.question || `Imported question ${index + 1}`,
              answers: Array.isArray(question?.answers) ? question.answers : [],
              clue_title: question?.clueTitle || "Clue unlocked",
              clue: question?.clue || "",
            }))
            .sort((first, second) => first.number - second.number)
        : [],
    })),
  };
}

async function importLegacyLibrary(ownerId, legacyLibrary) {
  let importedCount = 0;

  for (const legacyHunt of legacyLibrary.hunts) {
    const { data: hunt, error } = await supabaseClient
      .from("hunts")
      .insert({
        owner_id: ownerId,
        name: legacyHunt.name,
        description: legacyHunt.description,
        is_default: false,
        is_published: true,
      })
      .select()
      .single();

    if (error || !hunt) {
      continue;
    }

    const questions = legacyHunt.questions
      .filter((question) => question.number <= MAX_STATIC_QUESTION_PAGES)
      .map((question) => ({
        hunt_id: hunt.id,
        number: question.number,
        question: question.question,
        answers: question.answers,
        clue_title: question.clue_title,
        clue: question.clue,
      }));

    await supabaseClient.from("questions").insert(questions);
    importedCount += 1;
  }

  return importedCount;
}

function createSupabaseClient() {
  if (!window.supabase || !window.APP_CONFIG?.supabaseUrl || !window.APP_CONFIG?.supabasePublishableKey) {
    return null;
  }

  return window.supabase.createClient(
    window.APP_CONFIG.supabaseUrl,
    window.APP_CONFIG.supabasePublishableKey
  );
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

function buildPreviewUrl(huntId, questionNumber) {
  const baseUrl = window.location.protocol === "file:"
    ? "https://lhomer7.github.io/EduCache/"
    : normalizeBaseUrl(window.location.href.replace(/hunt-editor\.html?.*$/i, ""));
  const studentUrl = resolveQuestionQrValue(baseUrl, huntId, questionNumber);
  return upsertSearchParam(studentUrl, "preview", "1");
}

function upsertSearchParam(rawValue, key, value) {
  try {
    const url = new URL(rawValue, window.location.href);
    url.searchParams.set(key, value);
    return url.toString();
  } catch (error) {
    const separator = rawValue.includes("?") ? "&" : "?";
    return `${rawValue}${separator}${key}=${encodeURIComponent(value)}`;
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
          value="${escapeHtml(question.clue_title)}"
          data-question-field="clue_title"
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

function populateQuestionSelect(questionSelect, questionCount) {
  questionSelect.innerHTML = Array.from({ length: questionCount }, (_, index) => {
    const number = index + 1;
    return `<option value="${number}">Question ${number}</option>`;
  }).join("");
}

function splitAnswers(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showConfigurationError() {
  const target = document.querySelector("[data-home-status]") || document.querySelector("[data-save-status]");

  if (target) {
    target.textContent = "Supabase is not configured correctly on this page.";
  }
}
