# Student Task Manager Version 3 Technical Notes

This file explains the main JavaScript ideas behind the project in a beginner-friendly way.

## User Object Structure

Users are stored in the `users` array in `localStorage`.

```js
{
  name: "Isfaq",
  email: "isfaq@example.com",
  password: "123456",
  role: "user",
  blocked: false,
  createdAt: "2026-07-09T10:30:00.000Z"
}
```

Roles:

- `user`: normal student account
- `admin`: admin dashboard account

Old users are normalized when loaded. If an old user is missing `role`, `blocked`, or `createdAt`, the app adds safe defaults.

## Default Admin Account

On every page load, `ensureDefaultAdmin()` checks whether this account already exists:

```text
admin@studenttask.com
```

If it does not exist, the app creates:

```js
{
  name: "Admin",
  email: "admin@studenttask.com",
  password: "admin123",
  role: "admin",
  blocked: false,
  createdAt: "current date/time"
}
```

Because the function checks by email first, the default admin is not duplicated.

## Role-Based Authentication Logic

The same `login.html` page handles students and admin.

Login flow:

- The entered email and password are checked against `users`.
- If no match exists, an invalid login message is shown.
- If the matched account has `blocked: true`, login is denied.
- If the matched account has `role: "user"`, the app redirects to `dashboard.html`.
- If the matched account has `role: "admin"`, the app redirects to `admin.html`.
- The logged-in account is saved as `currentUser`.

Signup always creates normal student users:

```js
role: "user",
blocked: false
```

Users cannot choose an admin role during signup.

## Page Protection Logic

`requireRole()` protects dashboard pages.

Rules:

- If no user is logged in, redirect to `login.html`.
- `dashboard.html` requires `role: "user"`.
- `statistics.html` requires `role: "user"`.
- `admin.html` requires `role: "admin"`.
- If a student opens `admin.html`, redirect to `dashboard.html`.
- If an admin opens `dashboard.html` or `statistics.html`, redirect to `admin.html`.

Blocked users are removed from `currentUser` and must log in again.

## Task Object Structure

Each task is stored inside the logged-in student's task array.

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
  completedAt: "",
  notificationSent: false,
  createdAt: "2026-07-09T10:30:00.000Z"
}
```

Field meanings:

- `id`: A unique number used to find, edit, complete, or delete a task.
- `text`: The task title.
- `priority`: `low`, `medium`, or `high`.
- `category`: `assignment`, `homework`, `study-session`, or `project`.
- `dueDate`: Deadline in `YYYY-MM-DD` format. It can be empty.
- `notes`: Optional extra task details.
- `subtasks`: Checklist items for the task.
- `completed`: Whether the task is done.
- `completedAt`: Date/time when the task was completed.
- `notificationSent`: Prevents repeated deadline browser notifications.
- `createdAt`: Used for newest/oldest sorting.

Old tasks are normalized when loaded. Missing `notes`, `subtasks`, `completedAt`, or `createdAt` fields get safe default values.

## completedAt Logic

When a student checks a task as completed:

```js
completedAt: new Date().toISOString()
```

When a completed task is unchecked and marked pending again:

```js
completedAt: ""
```

This field powers daily, weekly, monthly, and productivity statistics.

## User-Specific Task Saving

Each student gets a separate task list key:

```js
tasks_isfaq@example.com
tasks_student@example.com
```

Normal users only load their own task key. Admin users count tasks across all normal student users by loading each student's task key.

## localStorage Keys

```js
users
currentUser
themePreference
adminActivityLogs
tasks_user@example.com
```

How each key is used:

- `users`: all signed-up users and the default admin.
- `currentUser`: the logged-in user session.
- `themePreference`: `light` or `dark`.
- `adminActivityLogs`: recent admin actions.
- `tasks_email@example.com`: one user's task list.

## Admin User Management Logic

The admin dashboard displays normal student users only.

For each student, admin can:

- Block user: sets `blocked: true`.
- Unblock user: sets `blocked: false`.
- Reset password: sets `password: "123456"`.
- Delete user: removes the user and removes `tasks_email@example.com`.

Delete asks for confirmation with `window.confirm()`.

The default admin account is not listed with dangerous actions, and helper functions also protect the default admin email.

## Admin Activity Log Structure

Admin actions are saved in `adminActivityLogs`.

```js
{
  action: "Blocked user student@example.com",
  createdAt: "2026-07-09T11:10:00.000Z"
}
```

Logged actions include:

- Blocked user email
- Unblocked user email
- Deleted user email
- Reset password for user email

The dashboard shows the most recent logs first.

## Admin Statistics

Admin statistics are calculated across all normal student users.

Cards show:

- Total users
- Active users
- Blocked users
- Total tasks
- Completed tasks
- Pending tasks
- Overdue tasks
- Deadline soon tasks
- High priority tasks

Task counts reuse `getTaskStats()`, the same helper used by the student dashboard.

## Student Progress Statistics

The student dashboard focuses on task management. Its Statistics button runs:

```js
window.location.href = "statistics.html";
```

`statistics.html` is protected with `requireRole("user")`. It loads tasks for the logged-in student with the same email-based key used by the dashboard:

```js
tasks_user@example.com
```

Then it calls `updateStudentProgress()` to render the analytics page.

Dashboard task rendering still calls `renderTasks()` and `updateTaskCount()`, but it no longer renders the productivity charts. This keeps dashboard task actions fast and keeps the productivity UI isolated on `statistics.html`.

`getStudentProgress()` calculates:

- Total, completed, pending, and overdue tasks
- Completion rate
- Tasks completed today
- Tasks completed this week
- Tasks completed this month
- High priority tasks completed
- Category-wise completed task counts
- Category with most completed tasks

The same progress object feeds the visual analytics panel:

- Completion donut chart
- Category progress bars
- Today/week/month productivity bars

Most productive day/month/year calculations are still available in the code for future analytics, but the dashboard does not render separate cards for them.

## Completion Rate Calculation

```js
completionRate = Math.round((completedTasks / totalTasks) * 100)
```

If there are no tasks, the completion rate is `0%`.

## Completion Donut Chart

The completion donut is a normal HTML element styled with CSS `conic-gradient`.

JavaScript sets a CSS custom property:

```js
donut.style.setProperty("--completed-slice", `${progress.completionRate}%`);
```

CSS uses that percentage to paint the completed part of the donut:

```css
background: conic-gradient(
  var(--success) var(--completed-slice),
  var(--warning-soft) 0
);
```

The center of the donut displays the completion rate, such as `65% Completed`. If there are no tasks, the rate stays `0%`.

## Category Progress Bars

Category progress uses completed tasks only.

The app counts completed tasks in each category:

```js
assignment
homework
study-session
project
```

Each category bar shows:

- Category name
- Completed count
- Percentage of all category completions
- Relative bar width compared with the category that has the highest completed count

The top category gets a stronger border so it is visually clear. If there are no completed tasks, the panel shows:

```text
No category progress yet
```

## Today, Week, and Month Productivity Bars

Productivity bars use tasks that have a valid `completedAt` timestamp.

The app calculates:

- Completed today: completed at or after the start of the current day
- Completed this week: completed at or after the start of the current week
- Completed this month: completed at or after the first day of the current month

The highest of the three values becomes the full-width bar. The other bars scale relative to that value. If all values are `0`, an empty-state message appears.

## Most Productive Day, Month, and Year

The app groups completed tasks by `completedAt`.

Examples:

- Day key: `2026-07-08`
- Month key: `2026-07`
- Year key: `2026`

The group with the highest completed task count is displayed.

Example display:

```text
8 July 2026 — 5 tasks completed
July 2026 — 18 tasks completed
2026 — 45 tasks completed
```

If there are no completed tasks with completion dates, the dashboard shows:

```text
No completed tasks yet
```

## Category-Wise Progress Calculation

The app counts completed tasks in these categories:

- Assignment
- Homework
- Study Session
- Project

It also finds the category with the highest completed count. If no category has completed tasks, it shows:

```text
No category progress yet
```

## Search, Filtering, and Sorting Logic

Search:

- The existing search bar is reused.
- It checks task title, notes, subtask text, category, formatted category, priority, and formatted priority.

Filtering:

- Status filtering runs first: All, Pending, or Completed.
- Category filtering runs next.
- Search runs after category filtering.
- Sorting runs last on the visible result list.

Sorting does not rewrite saved task data.

## Dark Mode Logic

The theme toggle appears on login, signup, student dashboard, and admin dashboard pages.

- `setupThemeToggle()` reads `themePreference`.
- `applyTheme()` toggles `body.dark-mode`.
- The button text changes between `Dark Mode` and `Light Mode`.
- The selected theme stays after refresh.

## Important Security Note

This is a front-end-only demo. Passwords and role data are stored in `localStorage` for learning purposes only. A real project should use a secure backend, hashed passwords, real sessions, and server-side authorization.
