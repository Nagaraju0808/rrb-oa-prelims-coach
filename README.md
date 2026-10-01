# RRB OA Coach

A personal 60-study-day coach for **CRP RRBs XV — Office Assistant (Multipurpose)**. It prepares you for the Prelims and the Mains together, from Day 1. There is one plan, one timetable, one progress tracker and one test system.

It is a single-user Progressive Web App. You don't need an account or a login: everything is saved privately in the browser on your device. You can install it on a phone or desktop and use it offline.

**Live site:** https://nagaraju0808.github.io/rrb-oa-prelims-coach/

## Exam patterns (official IBPS CRP RRBs XV notification, Section D)

| Test | Prelims | Mains |
|---|---|---|
| Reasoning | 40 Q · 40 marks · 25 min | 40 Q · 50 marks · 30 min |
| Numerical Ability | 40 Q · 40 marks · 20 min | 40 Q · 50 marks · 30 min |
| General Awareness | — | 40 Q · 40 marks · 15 min |
| English **or** Hindi Language | — | 40 Q · 40 marks · 30 min |
| Computer Knowledge | — | 40 Q · 20 marks · 15 min |
| **Total** | **80 Q · 80 marks · 45 min** | **200 Q · 200 marks · 120 min** |

In both exams each test has its own time limit. 0.25 of a question's marks is deducted for every wrong answer.

Source: [IBPS CRP RRBs XV notification (PDF)](https://www.ibps.in/wp-content/uploads/CRP-RRBs-XV-notification.pdf)

## How a study day works

| Time (default) | Session |
|---|---|
| 10:00–11:15 | 🧠 Reasoning |
| 11:30–12:45 | 🔢 Numerical Ability |
| 1:30–2:30 | 🗣️ English / Hindi |
| 2:45–3:45 | 📰 General Awareness |
| 3:45–4:30 | 💻 Computer Knowledge |
| 4:30–5:00 | 🔄 Revision (spaced revisions + revision quiz) |
| 5:00–5:30 | 📝 Practice / Weak topics (optional) |
| 5:30 onwards | 🎯 Daily Test |

These times are a guide, not a lock.

**Each topic follows the same flow:**

📚 Concept → 💡 Shortcuts / Tricks → 📌 Rules & Formulas → 📝 Practice → 🔄 Revision → 🧠 Revision Quiz → ✅ Topic Completed

Finishing a topic schedules its revisions automatically, on Day +1, +4, +7, +14 and +30.

**The Daily Test is never time-locked.** It becomes ready as soon as the day's five topics and the revision are complete, whatever the time. You can also start it early on purpose.

The Daily Test has 30 questions taken from that day's topics: Reasoning 8, Numerical 8, English/Hindi 5, GA 5 and Computer 4. The split shifts automatically:
- During the Speed Building phase, it leans towards Reasoning and Numerical.
- Your weakest subject gets one extra question.

## Features

- **Integrated 60-day plan.** It runs Monday to Saturday, with Sundays kept for the weekly review. It has five phases: Foundation, Core Syllabus, Speed Building, Revision and Mock Preparation. All five subjects are covered every day. Revision days adapt to your weak topics, and the mock days alternate between the Prelims and Mains patterns.
- **Topic guides for all 57 syllabus topics.** Each guide has a concept summary, specific shortcuts and tricks, important formulas and rules, a quick approach and common traps. That adds up to 246 shortcuts and 99 formulas or rules. The Numerical formulas are verified by automated tests, and the GA facts were checked against PIB, RBI and other official sources (October 2026).
- **Questions.**
  - Reasoning and Numerical questions are generated without limit; puzzles are checked to have exactly one solution, and syllogisms are checked against every possible Venn diagram.
  - English, Hindi, GA and Computer use a reviewed bank of 207 questions with explanations, plus number-system questions generated for Computer.
  - You can add your own questions in the Admin panel.
- **Tests:** Revision Quiz, Daily Test, Weekly Test (50 Q), practice tests (topic, subject and mixed), and full Prelims and Mains mocks with official marks and negative marking.
- **Results** show the score, accuracy, each answer with an explanation, weak areas by sub-topic, and an "Add to Mistake Book" button.
- **Also included:** Mistake Book, spaced revision, weak-topic detection, a "Study Now" coach, analytics including a speed tracker for every subject, a calendar, achievements and reminders.
- **Your data:** export and import a backup file, plus an automatic daily safety copy. Progress saved by the earlier two-subject version is migrated automatically.

## Data this version does not include

- **Current Affairs:** there is no live news feed. Add current-affairs questions and PDFs in **Admin**. Until you do, the GA quizzes and tests use the other GA topics.
- **Hindi Language:** the bank has 18 questions. Practice and quizzes work, but a Mains mock in Hindi has a shorter language section until you add more questions in Admin.
- **Policy rates** (repo, CRR and similar) change often, so their current values are deliberately not included.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
```

## Deploy to GitHub Pages

Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the tests, builds the site and publishes it.
