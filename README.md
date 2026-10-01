# RRB OA Prelims Coach

A personal 60-study-day coach for **CRP RRBs XV — Office Assistant (Multipurpose), Preliminary Examination**: Reasoning Ability and Numerical Ability.

It is a single-user Progressive Web App. You don't need an account or a login: everything is saved privately in the browser on your device. You can install it on a phone or desktop and use it offline.

## Exam pattern (checked against the official IBPS notification)

Source: [IBPS CRP RRBs XV notification](https://www.ibps.in/wp-content/uploads/CRP-RRBs-XV-notification.pdf), Section D, "Online Examination Structure".

| Test | Questions | Marks | Time |
|---|---|---|---|
| Reasoning | 40 | 40 | 25 min |
| Numerical Ability | 40 | 40 | 20 min |
| **Total** | **80** | **80** | **45 min** |

The provided syllabus document matches this table. The official notification adds three points that the document leaves out, and the app now follows all three:

- **Negative marking:** 0.25 of a question's marks is deducted for each wrong answer. Section E says this applies to the Preliminary exam too. Full mocks use it.
- **Sectional cut-off:** candidates must qualify in **both** tests.
- **Separate timings:** each test has its own time limit. Full mocks run Reasoning (25 min) first, then Numerical Ability (20 min). Each section closes on its own when its time runs out.
- **Exam window:** Prelims is scheduled for November–December 2026 (tentative). If you start on 1 Oct 2026, your 60 study days end on 9 Dec 2026. Check your call letter and move the start date in Settings if you need to.
- IBPS does not publish a chapter-wise list. The topic list is the preparation checklist from the syllabus document. *Quadratic Equations* is not in that checklist, but it is included because it appears in previous RRB OA prelims papers.

## Features

- First-time setup builds a 60-study-day plan. Sundays are excluded and kept for the weekly review. The plan has 5 phases: Foundation, Core Syllabus, Speed Building, Revision and Mock Preparation.
- Fixed daily timetable from 10:00 AM to 6:00 PM. The whole block can be shifted, but the **Daily Test is always the final 30-minute session**, and it stays locked until that slot starts.
- Each study session has a tracker: start, pause, resume and complete. It records questions solved, correct answers and accuracy (correct ÷ attempted × 100). Sessions you don't do are recorded as missed. An incomplete topic carries forward into the next day's weak-topic slot.
- An unlimited question bank. Seeded generators cover all 32 syllabus topics: puzzles and seating arrangements are generated with brute-force uniqueness checks, and syllogisms are checked with exact Venn-diagram models. Every question has a worked explanation. Questions you add in the Admin panel are mixed in.
- **Daily Test:** 30 questions in 30 minutes, 15 Reasoning and 15 Numerical, drawn from that day's topics. The default difficulty mix is 30% easy, 50% medium and 20% hard. You can change both the question count and the mix.
- **Test interface:** countdown timer, question palette, mark for review, and a confirmation before you submit. The test submits itself when time runs out. Results show question-by-question analysis and let you add a question to the Mistake Book with a mistake type.
- **Mistake Book** with filters. Mistakes come back for re-attempts 1, 4 and 7 days after you add them.
- **Spaced revision:** Day +1, +4, +7, +14 and +30 after you learn a topic. A revision that falls on a Sunday moves to Monday.
- **Weak-topic detection** uses recent accuracy, speed against the exam pace and how many mistakes you've made. Weak topics get the extra-practice slot and more questions in mixed tests.
- **STUDY NOW** recommends what to do next. It looks at today's schedule, sessions in progress, revisions due, weak topics and mistakes.
- **Practice tests:** topic (20 Q), subject (40 Q) and mixed. **Full mocks** use the official pattern.
- Analytics: study hours, test scores, speed tracker, topic strength and mock trends. Also a calendar, a Sunday weekly report, achievements, streaks, reminders, and a light/dark theme.
- **Admin panel:** manage topics, questions, test templates, Day 1–60 topics and resource links.
- **Your data:** export and import a backup file, plus an automatic daily safety copy.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
```

## Deploy to GitHub Pages

Push to a GitHub repository whose default branch is `main`, then enable **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/deploy.yml` runs the tests, builds the site with the right base path and publishes it.

## Tech

React 19, Vite, Tailwind CSS 4, Recharts and vite-plugin-pwa. Data is stored locally on the device, and the app uses no backend.
