document.addEventListener("DOMContentLoaded", () => {
  const card = document.querySelector("[data-question-number]");

  if (!card) {
    return;
  }

  const questionNumber = Number(card.dataset.questionNumber);
  const huntData = Array.isArray(window.HUNT_DATA) ? window.HUNT_DATA : [];
  const currentQuestion = huntData.find((item) => item.number === questionNumber);

  const elements = {
    stepLabel: card.querySelector("[data-step-label]"),
    questionText: card.querySelector("[data-question-text]"),
    questionHelp: card.querySelector("[data-question-help]"),
    form: card.querySelector("[data-answer-form]"),
    input: card.querySelector("[data-answer-input]"),
    feedback: card.querySelector("[data-feedback]"),
    cluePanel: card.querySelector("[data-clue]"),
    clueTitle: card.querySelector("[data-clue-title]"),
    clueText: card.querySelector("[data-clue-text]"),
  };

  if (!currentQuestion || Object.values(elements).some((element) => !element)) {
    renderMissingQuestion(card, elements);
    return;
  }

  renderQuestion(currentQuestion, huntData.length, elements);

  if (window.localStorage.getItem(storageKey(questionNumber)) === "solved") {
    markSolved(elements);
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
      markSolved(elements);
      return;
    }

    setFeedback(elements.feedback, "Not quite. Try again.", "is-error");
  });
});

function renderQuestion(question, totalQuestions, elements) {
  document.title = `Question ${question.number}`;
  elements.stepLabel.textContent = `Question ${question.number} of ${totalQuestions}`;
  elements.questionText.textContent = question.question;
  elements.questionHelp.textContent = "Answers are not case-sensitive.";
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
    elements.questionHelp.textContent = "Check hunt-data.js and make sure this page number exists.";
  }

  if (elements.form) {
    elements.form.style.display = "none";
  }

  if (elements.feedback) {
    setFeedback(elements.feedback, "No question data was found for this page.", "is-error");
  }
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function storageKey(questionNumber) {
  return `qr-hunt-q${questionNumber}`;
}

function markSolved(elements) {
  elements.input.value = "";
  elements.input.readOnly = true;
  elements.cluePanel.classList.add("is-visible");
  setFeedback(elements.feedback, "Correct! Your clue is now unlocked.", "is-success");
}

function setFeedback(feedback, message, className) {
  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-success");
  feedback.classList.add(className);
}
