document.addEventListener("DOMContentLoaded", () => {
  const huntData = getHuntData();

  setupHomePage(huntData);
  setupQuestionPage(huntData);
});

function setupHomePage(huntData) {
  const progressSummary = document.querySelector("[data-progress-summary]");
  const resetButtons = Array.from(document.querySelectorAll("[data-reset-progress]"));

  if (!progressSummary && resetButtons.length === 0) {
    return;
  }

  const renderHomeState = () => {
    const totalQuestions = huntData.length;
    const solvedCount = getSolvedCount(huntData);

    if (progressSummary) {
      progressSummary.textContent = totalQuestions
        ? `${solvedCount} of ${totalQuestions} questions solved on this device`
        : "Add your questions in hunt-data.js to start building the hunt.";
    }

    resetButtons.forEach((button) => {
      button.disabled = solvedCount === 0;
    });
  };

  resetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (getSolvedCount(huntData) === 0) {
        return;
      }

      const shouldReset = window.confirm(
        "Clear the saved hunt progress on this device?"
      );

      if (!shouldReset) {
        return;
      }

      clearProgress(huntData);
      renderHomeState();
    });
  });

  renderHomeState();
}

function setupQuestionPage(huntData) {
  const card = document.querySelector("[data-question-number]");

  if (!card) {
    return;
  }

  const questionNumber = Number(card.dataset.questionNumber);
  const currentQuestion = huntData.find((item) => item.number === questionNumber);

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

  if (!currentQuestion || Object.values(elements).some((element) => !element)) {
    renderMissingQuestion(card, elements);
    return;
  }

  const chrome = buildQuestionChrome(questionNumber, huntData.length);
  elements.cardBody.insertBefore(chrome.wrapper, elements.cardBody.firstChild);

  elements.resetButton = chrome.resetButton;
  elements.progressLabel = chrome.progressLabel;
  elements.progressBar = chrome.progressBar;

  renderQuestion(currentQuestion, huntData.length, elements);
  syncProgress(elements.progressLabel, elements.progressBar, huntData.length);

  elements.resetButton.addEventListener("click", () => {
    if (getSolvedCount(huntData) === 0) {
      return;
    }

    const shouldReset = window.confirm(
      "Clear the saved hunt progress on this device?"
    );

    if (!shouldReset) {
      return;
    }

    clearProgress(huntData);
    window.location.reload();
  });

  if (window.localStorage.getItem(storageKey(questionNumber)) === "solved") {
    markSolved(elements, huntData.length);
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
      window.localStorage.setItem(storageKey(questionNumber), "solved");
      markSolved(elements, huntData.length);
      return;
    }

    setFeedback(elements.feedback, "Not quite. Try again.", "is-error");
  });
}

function buildQuestionChrome(questionNumber, totalQuestions) {
  const wrapper = document.createElement("div");
  wrapper.className = "question-utility";

  const topRow = document.createElement("div");
  topRow.className = "utility-row";

  const homeLink = document.createElement("a");
  homeLink.className = "secondary-link";
  homeLink.href = "index.html";
  homeLink.textContent = "Back to home";

  const resetButton = document.createElement("button");
  resetButton.className = "ghost-button";
  resetButton.type = "button";
  resetButton.textContent = "Reset progress";

  topRow.append(homeLink, resetButton);

  const progressBlock = document.createElement("div");
  progressBlock.className = "progress-card";

  const progressLabel = document.createElement("p");
  progressLabel.className = "progress-label";
  progressLabel.textContent = `Question ${questionNumber} of ${totalQuestions}`;

  const progressTrack = document.createElement("div");
  progressTrack.className = "progress-track";

  const progressBar = document.createElement("span");
  progressBar.className = "progress-fill";

  progressTrack.append(progressBar);
  progressBlock.append(progressLabel, progressTrack);
  wrapper.append(topRow, progressBlock);

  return {
    wrapper,
    resetButton,
    progressLabel,
    progressBar,
  };
}

function renderQuestion(question, totalQuestions, elements) {
  document.title = `Question ${question.number}`;
  elements.stepLabel.textContent = `Question ${question.number} of ${totalQuestions}`;
  elements.questionText.textContent = question.question;
  elements.questionHelp.textContent =
    "Answers are not case-sensitive. Type the answer and tap unlock.";
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
      "Check hunt-data.js and make sure this page number exists.";
  }

  if (elements.form) {
    elements.form.style.display = "none";
  }

  if (elements.feedback) {
    setFeedback(
      elements.feedback,
      "No question data was found for this page.",
      "is-error"
    );
  }
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function storageKey(questionNumber) {
  return `qr-hunt-q${questionNumber}`;
}

function markSolved(elements, totalQuestions) {
  elements.input.value = "";
  elements.input.readOnly = true;
  elements.submitButton.disabled = true;
  elements.submitButton.textContent = "Unlocked";
  elements.cluePanel.classList.add("is-visible");
  setFeedback(elements.feedback, "Correct! Your clue is now unlocked.", "is-success");
  syncProgress(elements.progressLabel, elements.progressBar, totalQuestions);
  elements.cluePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setFeedback(feedback, message, className) {
  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-success");
  feedback.classList.add(className);
}

function getHuntData() {
  return Array.isArray(window.HUNT_DATA) ? window.HUNT_DATA : [];
}

function getSolvedCount(huntData) {
  return huntData.reduce((count, item) => {
    return count + (window.localStorage.getItem(storageKey(item.number)) === "solved" ? 1 : 0);
  }, 0);
}

function clearProgress(huntData) {
  huntData.forEach((item) => {
    window.localStorage.removeItem(storageKey(item.number));
  });
}

function syncProgress(progressLabel, progressBar, totalQuestions) {
  const solvedCount = getSolvedCount(getHuntData());
  const percentage = totalQuestions ? (solvedCount / totalQuestions) * 100 : 0;

  progressLabel.textContent = `${solvedCount} of ${totalQuestions} questions unlocked on this device`;
  progressBar.style.width = `${percentage}%`;
}
