document.addEventListener("DOMContentLoaded", () => {
  const huntData = getHuntData();

  setupHomePage(huntData);
  setupQrGenerator(huntData);
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

  elements.progressLabel = chrome.progressLabel;
  elements.progressBar = chrome.progressBar;

  renderQuestion(currentQuestion, huntData.length, elements);
  syncProgress(elements.progressLabel, elements.progressBar, huntData.length);

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

function setupQrGenerator(huntData) {
  const modeSelect = document.querySelector("[data-qr-mode]");
  const questionFields = document.querySelector("[data-qr-question-fields]");
  const customFields = document.querySelector("[data-qr-custom-fields]");
  const baseUrlInput = document.querySelector("[data-qr-base-url]");
  const questionSelect = document.querySelector("[data-qr-question-select]");
  const customValue = document.querySelector("[data-qr-custom-value]");
  const sizeSelect = document.querySelector("[data-qr-size]");
  const generateButton = document.querySelector("[data-generate-qr]");
  const downloadButton = document.querySelector("[data-download-qr]");
  const status = document.querySelector("[data-qr-status]");
  const outputUrl = document.querySelector("[data-qr-output-url]");
  const preview = document.querySelector("[data-qr-preview]");

  if (
    !modeSelect ||
    !questionFields ||
    !customFields ||
    !baseUrlInput ||
    !questionSelect ||
    !customValue ||
    !sizeSelect ||
    !generateButton ||
    !downloadButton ||
    !status ||
    !outputUrl ||
    !preview
  ) {
    return;
  }

  const totalQuestions = huntData.length || 10;
  const defaultBaseUrl = getDefaultBaseUrl();

  if (!baseUrlInput.value.trim()) {
    baseUrlInput.value = defaultBaseUrl;
  }

  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    const option = document.createElement("option");
    option.value = String(questionNumber);
    option.textContent = `Question ${questionNumber}`;
    questionSelect.append(option);
  }

  let currentQrValue = "";

  const updateMode = () => {
    const isQuestionMode = modeSelect.value === "question";
    questionFields.classList.toggle("is-hidden", !isQuestionMode);
    customFields.classList.toggle("is-hidden", isQuestionMode);
  };

  const renderQrCode = (value) => {
    preview.innerHTML = "";

    const qrSize = Number(sizeSelect.value) || 240;
    currentQrValue = value;
    outputUrl.textContent = value;

    if (window.QRCode) {
      new window.QRCode(preview, {
        text: value,
        width: qrSize,
        height: qrSize,
        colorDark: "#10333f",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } else {
      const image = document.createElement("img");
      image.alt = "Generated QR code";
      image.width = qrSize;
      image.height = qrSize;
      image.src = buildQrFallbackUrl(value, qrSize);
      preview.append(image);
    }

    downloadButton.disabled = false;
  };

  const generateQrCode = () => {
    const isQuestionMode = modeSelect.value === "question";
    let value = "";

    if (isQuestionMode) {
      const rawBaseUrl = baseUrlInput.value.trim();

      if (!rawBaseUrl) {
        status.textContent = "Enter the public site URL first.";
        downloadButton.disabled = true;
        return;
      }

      value = resolveQuestionQrValue(rawBaseUrl, questionSelect.value);
    } else {
      value = customValue.value.trim();

      if (!value) {
        status.textContent = "Enter a custom link or some text first.";
        downloadButton.disabled = true;
        return;
      }
    }

    renderQrCode(value);
    status.textContent = window.QRCode
      ? "QR code ready. You can download it as a PNG."
      : "QR code ready. A fallback online generator was used for this image.";
  };

  const downloadQrCode = () => {
    if (!currentQrValue) {
      return;
    }

    const canvas = preview.querySelector("canvas");
    const image = preview.querySelector("img");
    const downloadLink = document.createElement("a");
    const fileLabel = modeSelect.value === "question" ? `q${questionSelect.value}` : "custom";

    if (canvas) {
      downloadLink.href = canvas.toDataURL("image/png");
    } else if (image) {
      downloadLink.href = image.src;
    } else {
      status.textContent = "The QR image is not ready yet. Generate it again and try once more.";
      return;
    }

    downloadLink.download = `qr-code-${fileLabel}.png`;
    downloadLink.click();
  };

  modeSelect.addEventListener("change", updateMode);
  generateButton.addEventListener("click", generateQrCode);
  downloadButton.addEventListener("click", downloadQrCode);
  sizeSelect.addEventListener("change", generateQrCode);

  updateMode();
  generateQrCode();
}

function buildQuestionChrome(questionNumber, totalQuestions) {
  const wrapper = document.createElement("div");
  wrapper.className = "question-utility";

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
  wrapper.append(progressBlock);

  return {
    wrapper,
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

function getDefaultBaseUrl() {
  if (window.location.protocol !== "file:") {
    return normalizeBaseUrl(window.location.href.replace(/index\.html?$/i, ""));
  }

  return "https://lhomer7.github.io/EduCache/";
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function resolveQuestionQrValue(value, questionNumber) {
  const trimmed = value.trim();

  if (/\/q\d+\.html?$/i.test(trimmed)) {
    return trimmed;
  }

  if (/\/index\.html?$/i.test(trimmed)) {
    return trimmed.replace(/index\.html?$/i, `q${questionNumber}.html`);
  }

  const normalizedBaseUrl = normalizeBaseUrl(trimmed);

  if (!normalizedBaseUrl) {
    return value;
  }

  return `${normalizedBaseUrl}q${questionNumber}.html`;
}

function buildQrFallbackUrl(value, size) {
  const encodedValue = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}`;
}
