# Student Task Manager

A beginner-friendly task manager built with HTML, CSS, and vanilla JavaScript.

## Features

- Add new tasks
- Delete tasks
- Mark tasks as completed
- Filter tasks by All, Pending, and Completed
- Save tasks in `localStorage`
- Responsive layout for desktop and mobile screens

## File Structure

```text
student-task-manager/
├── index.html
├── style.css
├── script.js
└── README.md
```

## How to Run

Open `index.html` in your browser.

## How It Works

The app stores tasks in an array of objects. Each task looks like this:

```js
{
  id: 123456789,
  text: "Finish math homework",
  completed: false
}
```

When the user adds, deletes, or completes a task, the app updates the array, saves it to `localStorage`, and renders the list again.

## Main JavaScript Logic

- `loadTasks()` reads saved tasks from `localStorage`.
- `saveTasks()` saves the current task array to `localStorage`.
- `renderTasks()` updates the task list shown on the page.
- `getFilteredTasks()` returns tasks based on the selected filter.
- The form `submit` event adds a new task.
- The task list `click` event deletes tasks.
- The task list `change` event updates completed status from the checkbox.

## Interview Talking Points

- The app uses DOM selection with `querySelector` and `querySelectorAll`.
- It uses event listeners to respond to user actions.
- It uses an array of objects to store task data.
- It uses `map`, `filter`, and `forEach` for common array operations.
- It uses `localStorage` so tasks remain after refreshing the browser.
- It uses rendering to keep the UI in sync with the data.
