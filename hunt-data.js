window.HUNT_LIBRARY = {
  "activeHuntId": "test-1",
  "hunts": [
    {
      "id": "test-1",
      "name": "Test1",
      "description": "Sample hunt you can edit from the teacher dashboard.",
      "questions": [
        {
          "number": 1,
          "question": "1 + 1 =",
          "answers": [
            "2",
            "two"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "pingu"
        },
        {
          "number": 2,
          "question": "Emily is the best yes or no?",
          "answers": [
            "yes"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Head to the place where shoes line up. The next QR code is near the shoe rack."
        },
        {
          "number": 3,
          "question": "What is my name?",
          "answers": [
            "Luke"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Search where stories sleep. The next QR code is tucked inside a favourite book."
        },
        {
          "number": 4,
          "question": "How many sides does a triangle have?",
          "answers": [
            "three",
            "3"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Look where clean clothes gather. The next QR code is near the laundry basket."
        },
        {
          "number": 5,
          "question": "Which planet is the biggest in our solar system?",
          "answers": [
            "jupiter"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Go to the room where bubbles rise. The next QR code is by the bathroom mirror."
        },
        {
          "number": 6,
          "question": "How many days are there in a week?",
          "answers": [
            "seven",
            "7"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Peek where the morning starts. The next QR code is near the kettle or coffee station."
        },
        {
          "number": 7,
          "question": "What is the tallest mountain in the world?",
          "answers": [
            "mount everest",
            "everest"
          ],
          "clueTitle": "Clue unlocked",
          "clue": "Chase the clue to where socks disappear. The next QR code is near the washing machine."
        },
        {
          "number": 8,
          "question": "Add the question for step 8.",
          "answers": [],
          "clueTitle": "Clue unlocked",
          "clue": "Add the clue for the next QR code location."
        },
        {
          "number": 9,
          "question": "Add the question for step 9.",
          "answers": [],
          "clueTitle": "Clue unlocked",
          "clue": "Add the clue for the next QR code location."
        },
        {
          "number": 10,
          "question": "Add the question for step 10.",
          "answers": [],
          "clueTitle": "Clue unlocked",
          "clue": "Add the clue for the next QR code location."
        }
      ]
    }
  ]
};

(function syncLegacyActiveHunt() {
  const library = window.HUNT_LIBRARY;
  const activeHunt =
    library.hunts.find((hunt) => hunt.id === library.activeHuntId) || library.hunts[0];

  window.HUNT_DATA = activeHunt ? activeHunt.questions : [];
})();
