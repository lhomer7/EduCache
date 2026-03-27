window.HUNT_LIBRARY = {
  activeHuntId: "demo-hunt",
  hunts: [
    {
      id: "demo-hunt",
      name: "Demo Hunt",
      description: "Sample hunt you can edit from the teacher dashboard.",
      questions: [
        {
          number: 1,
          question: "What is the largest animal on Earth?",
          answers: ["blue whale", "the blue whale"],
          clueTitle: "Clue unlocked",
          clue: "The next QR code is waiting somewhere cold. Check inside the fridge door.",
        },
        {
          number: 2,
          question: "What is the largest ocean on Earth?",
          answers: ["pacific ocean", "pacific"],
          clueTitle: "Clue unlocked",
          clue: "Head to the place where shoes line up. The next QR code is near the shoe rack.",
        },
        {
          number: 3,
          question: "Which planet is known as the Morning Star?",
          answers: ["venus"],
          clueTitle: "Clue unlocked",
          clue: "Search where stories sleep. The next QR code is tucked inside a favourite book.",
        },
        {
          number: 4,
          question: "How many sides does a triangle have?",
          answers: ["three", "3"],
          clueTitle: "Clue unlocked",
          clue: "Look where clean clothes gather. The next QR code is near the laundry basket.",
        },
        {
          number: 5,
          question: "Which planet is the biggest in our solar system?",
          answers: ["jupiter"],
          clueTitle: "Clue unlocked",
          clue: "Go to the room where bubbles rise. The next QR code is by the bathroom mirror.",
        },
        {
          number: 6,
          question: "How many days are there in a week?",
          answers: ["seven", "7"],
          clueTitle: "Clue unlocked",
          clue: "Peek where the morning starts. The next QR code is near the kettle or coffee station.",
        },
        {
          number: 7,
          question: "What is the tallest mountain in the world?",
          answers: ["mount everest", "everest"],
          clueTitle: "Clue unlocked",
          clue: "Chase the clue to where socks disappear. The next QR code is near the washing machine.",
        },
        {
          number: 8,
          question: "What color do you get when you mix blue and yellow?",
          answers: ["green"],
          clueTitle: "Clue unlocked",
          clue: "Look near the place that keeps your secrets charged. The next QR code is beside a phone charger.",
        },
        {
          number: 9,
          question: "What is the capital city of Australia?",
          answers: ["canberra"],
          clueTitle: "Clue unlocked",
          clue: "The next QR code is hiding where bedtime begins. Check under a pillow or near the bedhead.",
        },
        {
          number: 10,
          question: "What should we say to someone who finishes the hunt?",
          answers: ["congratulations", "well done"],
          clueTitle: "Final clue unlocked",
          clue: "You made it to the end. Hide the prize somewhere special and replace this message with the final reward location.",
        },
      ],
    },
  ],
};

(function syncLegacyActiveHunt() {
  const library = window.HUNT_LIBRARY;
  const activeHunt =
    library.hunts.find((hunt) => hunt.id === library.activeHuntId) || library.hunts[0];

  window.HUNT_DATA = activeHunt ? activeHunt.questions : [];
})();
