# Student Task Manager Version 2 Technical Notes

This file explains the main JavaScript ideas behind the Student Task Manager project in a beginner-friendly way.

## Task Object Structure

Each task is stored as an object inside the current user's task array.

```js
{
  id: 1720450000000,
  text: "Finish math assignment",
  priority: "high",
  category: "assignment",
  dueDate: "2026-07-10",
  notes: "Review chapters 4 and 5 before submitting.",
  subtasks: [
    {
      id: 1720450001000,
      text: "Solve practice questions",
      completed: true
    }
  ],
  completed: false,
  notificationSent: false,
  createdAt: "2026-07-09T10:30:00.000Z"
}
```

Field meanings:

- `id`: A unique number used to find, edit, complete, or delete a task.
- `text`: The task title entered by the user.
- `priority`: The selected priority: `low`, `medium`, or `high`.
- `category`: The selected category, such as `assignment` or `project`.
- `dueDate`: The task deadline in `YYYY-MM-DD` format. It can be empty.
- `notes`: Optional extra task details.
- `subtasks`: An array of checklist items for the task.
- `completed`: A boolean value that tracks whether the main task is done.
- `notificationSent`: A boolean value that prevents repeated 24-hour deadline browser notifications.
- `createdAt`: An ISO date string used for newest/oldest sorting.

Older saved tasks are normalized when loaded. If an old task does not have `notes`, `subtasks`, or `createdAt`, the app adds safe default values.

## Subtask Data Structure

Each subtask is stored inside its parent task.

```js
{
  id: 1720450001000,
  text: "Read the rubric",
  completed: false
}
```

Subtasks are added from the task card, marked complete with a checkbox, and deleted with a small delete button. The dashboard shows progress as `2/5 subtasks completed`.

## Main JavaScript Logic

The project uses one JavaScript file, `script.js`, for all pages. When the page loads, the script checks which HTML page is open and runs only the matching setup function.

Main page setup functions:

- `initLoginPage()` runs the login form logic.
- `initSignupPage()` runs the signup form logic.
- `initDashboardPage()` protects the dashboard and starts the task manager.
- `setupThemeToggle()` applies the saved light/dark theme on every page.

Main dashboard functions:

- `setupTaskForm()` handles adding new tasks and saving edited tasks, including notes.
- `setupTaskFilters()` handles All, Pending, Completed, and category filters.
- `setupSearchAndSort()` handles the existing search bar and the sort dropdown.
- `setupTaskListEvents()` handles Edit, Delete, Complete, and subtask actions.
- `setupProfileSection()` handles the editable dashboard profile name.
- `renderTasks()` updates the task list in the browser.
- `updateTaskCount()` updates summary and profile stats.
- `getDeadlineInfo()` calculates countdown, overdue, and deadline warning status.

## localStorage Updates

The app uses browser `localStorage` so data stays available after refreshing the page.

Important storage keys:

```js
users
currentUser
themePreference
tasks_user@example.com
```

How each key is used:

- `users` stores all signed-up users as an array.
- `currentUser` stores the currently logged-in user.
- `themePreference` stores either `light` or `dark`.
- `tasks_email@example.com` stores tasks for one specific user.

Example user:

```js
{
  name: "Isfaq",
  email: "isfaq@example.com",
  password: "123456",
  createdAt: "2026-07-09T10:30:00.000Z"
}
```

This is a front-end demo authentication system. In a real app, passwords should not be stored in `localStorage`. A real app would use a secure backend and hashed passwords.

## User-Specific Task Saving

Each user gets a separate task list. The app creates a task storage key from the logged-in user's email.

Example:

```js
tasks_isfaq@example.com
tasks_student@example.com
```

Updating a profile name does not change the email, so the same task storage key remains connected to the account.

## Search, Filtering, and Sorting Logic

Search:

- The existing search bar is reused.
- It listens for user typing.
- It checks task title, notes, subtask text, category, formatted category, priority, and formatted priority.
- Matching tasks stay visible.

Filtering:

- Status filtering runs first: All, Pending, or Completed.
- Category filtering runs next.
- Search runs after category filtering.
- Sorting runs last on the visible result list.

Sorting options:

- Newest first compares `createdAt` from newest to oldest.
- Oldest first compares `createdAt` from oldest to newest.
- Deadline nearest first puts the soonest due date first and tasks without due dates last.
- Deadline farthest first puts the farthest due date first and tasks without due dates last.
- Priority high to low ranks High, Medium, then Low.
- Priority low to high ranks Low, Medium, then High.
- Pending first puts unfinished tasks before completed tasks.
- Completed first puts completed tasks before unfinished tasks.

Sorting only changes the displayed order. It does not rewrite the saved task order in `localStorage`.

## Dashboard Summary Logic

Summary cards count the full task list, not only the currently visible filtered list.

- Total tasks counts all tasks.
- Completed tasks counts tasks where `completed` is `true`.
- Pending tasks counts unfinished tasks.
- Overdue tasks uses `getDeadlineInfo()`.
- Deadline soon tasks counts unfinished tasks with 24 hours or less remaining.
- High priority tasks counts tasks where `priority` is `high`.

The profile section reuses the same total, completed, and pending counts.

## Dark Mode Logic

The theme toggle appears on login, signup, and dashboard pages.

- `setupThemeToggle()` reads `themePreference` from `localStorage`.
- `applyTheme()` adds or removes the `dark-mode` class on `body`.
- The button text changes between `Dark Mode` and `Light Mode`.
- The selected theme is saved and stays after refresh.

Dark mode uses the same CSS variable names as light mode, but with darker warm neutral values and an orange accent.

## Theme and Color System

The project uses CSS custom properties in `:root` for the light theme and `body.dark-mode` for the dark theme.

Main variables:

```css
--bg
--bg-accent
--panel
--panel-soft
--surface
--text
--muted
--line
--primary
--primary-dark
--primary-soft
--success
--danger
--warning
```

This keeps the orange/off-white theme consistent across buttons, cards, inputs, filters, badges, task cards, footer, and dashboard panels.

## Profile Update Logic

The profile section displays:

- User name
- User email
- Total tasks
- Completed tasks
- Pending tasks
- Account created date if available

When the user updates their name:

- The matching user in the `users` array is updated.
- The `currentUser` session object is updated.
- The dashboard welcome message updates immediately.
- The email remains unchanged, so task data stays connected to the same `tasks_email@example.com` key.

## Countdown and Notification Logic

Countdown:

- Each task can have a due date.
- `getDeadlineInfo()` compares the due date with the current time.
- The app displays friendly text such as `3 days left`, `4 hours 20 minutes left`, or `Overdue`.
- A timer refreshes the dashboard every minute while the app is open.

Deadline warning:

- If a task has 24 hours or less remaining, the dashboard shows a warning badge.
- Completed tasks do not show urgent or overdue warnings.

Browser notification:

- After the dashboard loads, the app asks for browser notification permission.
- If permission is granted, the app sends one notification when a task is within 24 hours of its deadline.
- The `notificationSent` field prevents the same task from sending repeated notifications.
- If the browser does not support notifications or the user denies permission, the app still works normally.

## Interview Talking Points

- The project uses separate HTML pages for login, signup, and dashboard.
- It uses vanilla JavaScript only, with no framework or external library.
- It demonstrates DOM selection, event listeners, form handling, rendering, and local data persistence.
- It uses arrays of objects to manage tasks and nested arrays for subtasks.
- It keeps tasks user-specific by saving them under an email-based key.
- It layers filtering, searching, and sorting without damaging saved task data.
- It updates the UI from the data array instead of manually editing each task element.
- It protects the dashboard by redirecting users who are not logged in.
- It handles older saved tasks safely by normalizing missing fields when tasks load.

## Possible Interview Questions and Answers

### Why did you use localStorage?

I used `localStorage` because this is a front-end-only project. It lets the browser save users, login status, theme preference, and tasks after a page refresh without needing a backend.

### Is this authentication secure?

No. This is a demo authentication flow for learning front-end logic. A real project should use a backend, secure sessions, and hashed passwords instead of storing passwords in `localStorage`.

### How do you keep each user's tasks separate?

The app creates a unique task key from the logged-in user's email, such as `tasks_isfaq@example.com`. Each user loads and saves tasks under their own key.

### How does editing work?

When the user clicks Edit, the app finds the task by its `id` and fills the form with the existing task data, including notes. When the form is submitted, the app updates that same task object.

### How do subtasks work?

Each task has a `subtasks` array. Adding, completing, or deleting a subtask updates that array, saves the full task list to `localStorage`, and renders the dashboard again.

### How does sorting work with search and filters?

The app first applies status and category filters, then applies the search query, and finally sorts the remaining visible tasks. This keeps the existing search feature working with every sort option.

### How does dark mode work?

The selected theme is saved as `themePreference`. On page load, the app applies the saved theme by toggling the `dark-mode` class on `body`.

### What would you improve next?

I would add password confirmation, recurring tasks, export/import, drag-and-drop ordering, and a real backend for secure authentication and shared data access.
