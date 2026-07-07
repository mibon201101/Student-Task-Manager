# Student Task Manager Interview Notes

This file explains the main JavaScript ideas behind the Student Task Manager project in a beginner-friendly way.

## Task Object Structure

Each task is stored as an object inside an array. A task can look like this:

```js
{
  id: 1720450000000,
  text: "Finish math assignment",
  priority: "high",
  category: "assignment",
  dueDate: "2026-07-10",
  completed: false,
  notificationSent: false
}
```

Field meanings:

- `id`: A unique number used to find, edit, complete, or delete a task.
- `text`: The task title entered by the user.
- `priority`: The selected priority: `low`, `medium`, or `high`.
- `category`: The selected category, such as `assignment` or `project`.
- `dueDate`: The task deadline in `YYYY-MM-DD` format. It can be empty.
- `completed`: A boolean value that tracks whether the task is done.
- `notificationSent`: A boolean value that prevents repeated 24-hour deadline browser notifications.

## Main JavaScript Logic

The project uses one JavaScript file, `script.js`, for all pages. When the page loads, the script checks which HTML page is open and runs only the matching setup function.

Main page setup functions:

- `initLoginPage()` runs the login form logic.
- `initSignupPage()` runs the signup form logic.
- `initDashboardPage()` protects the dashboard and starts the task manager.

Main task functions:

- `setupTaskForm()` handles adding new tasks and saving edited tasks.
- `setupTaskFilters()` handles All, Pending, Completed, and category filters.
- `setupSearchAndSort()` handles search and sorting options.
- `setupTaskListEvents()` handles Edit, Delete, and Complete actions.
- `renderTasks()` updates the task list in the browser.
- `updateTaskCount()` updates the dashboard summary cards.
- `getDeadlineInfo()` calculates countdown, overdue, and deadline warning status.

## localStorage Explanation

The app uses browser `localStorage` so data stays available after refreshing the page.

Important storage keys:

```js
users
currentUser
tasks_user@example.com
```

How each key is used:

- `users` stores all signed-up users as an array.
- `currentUser` stores the currently logged-in user.
- `tasks_email@example.com` stores tasks for one specific user.

Example users array:

```js
[
  {
    name: "Isfaq",
    email: "isfaq@example.com",
    password: "123456"
  }
]
```

Example current user:

```js
{
  name: "Isfaq",
  email: "isfaq@example.com"
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

This means User A and User B do not see each other's tasks in the dashboard.

## CRUD Explanation

CRUD means Create, Read, Update, and Delete.

Create:

- The user fills out the task form.
- JavaScript creates a new task object.
- The task is added to the `tasks` array.
- The updated array is saved to `localStorage`.
- The task list is rendered again.

Read:

- When the dashboard loads, tasks are loaded from `localStorage`.
- The app parses the saved JSON string back into an array.
- `renderTasks()` displays the tasks on the page.

Update:

- Completing a task updates the task's `completed` value.
- Editing a task updates the existing task object by matching its `id`.
- The app keeps the same `id`, completion status, category, priority, and due date unless the user changes those form fields.
- The updated array is saved back to `localStorage`.

Delete:

- The Delete button uses the task `id`.
- JavaScript filters out the matching task.
- The new array is saved to `localStorage`.
- The task list is rendered again.

## Search, Sorting, and Summary Logic

Search:

- The search bar listens for user typing.
- It checks the task title, category, formatted category, priority, and formatted priority.
- Matching tasks stay visible.

Sorting:

- Deadline nearest first compares task due dates.
- Priority high to low ranks High above Medium and Low.
- Pending first puts unfinished tasks before completed tasks.
- Completed first puts completed tasks before unfinished tasks.

Summary cards:

- Total tasks counts all tasks.
- Completed tasks counts tasks where `completed` is `true`.
- Pending tasks counts unfinished tasks.
- Overdue tasks uses `getDeadlineInfo()`.
- Deadline soon tasks counts unfinished tasks with 24 hours or less remaining.

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
- It demonstrates DOM selection, event listeners, form handling, and rendering.
- It uses arrays of objects to manage task data.
- It uses `localStorage` to persist users, sessions, and tasks.
- It keeps tasks user-specific by saving them under an email-based key.
- It uses filtering, searching, and sorting without changing the original saved data.
- It updates the UI from the data array instead of manually editing each task element.
- It includes basic validation for signup and login.
- It protects the dashboard by redirecting users who are not logged in.
- It handles older saved tasks safely by normalizing missing fields when tasks load.

## Possible Interview Questions and Answers

### Why did you use localStorage?

I used `localStorage` because this is a front-end-only project. It lets the browser save users, login status, and tasks after a page refresh without needing a backend.

### Is this authentication secure?

No. This is a demo authentication flow for learning front-end logic. A real project should use a backend, secure sessions, and hashed passwords instead of storing passwords in `localStorage`.

### How do you keep each user's tasks separate?

The app creates a unique task key from the logged-in user's email, such as `tasks_isfaq@example.com`. Each user loads and saves tasks under their own key.

### How does editing work?

When the user clicks Edit, the app finds the task by its `id` and fills the form with the existing task data. When the form is submitted, the app updates that same task object instead of deleting and recreating it.

### How does the app know a task is overdue?

The app converts the task's due date into a JavaScript `Date`, compares it with the current time, and marks the task overdue if the deadline has passed and the task is not completed.

### How does the 24-hour notification system avoid repeated alerts?

Each task has a `notificationSent` field. After a notification is shown, that field becomes `true`, so the app does not send the same warning again.

### How does search work?

The app turns the search input into lowercase text and compares it with each task's title, category, and priority. If the task contains the search text, it stays visible.

### How does sorting work?

Sorting creates a copy of the visible task list and changes the display order based on the selected option. It does not permanently rearrange or damage the saved task data.

### What would you improve next?

I would add password confirmation, better accessibility, task notes, recurring tasks, and a real backend for secure authentication and shared data access.
