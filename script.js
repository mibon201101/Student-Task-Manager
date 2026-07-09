// Shared localStorage keys for the front-end authentication demo.
const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";
const THEME_KEY = "themePreference";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// Task state is used only on dashboard.html.
let tasks = [];
let currentFilter = "all";
let currentCategoryFilter = "all";
let currentSearchQuery = "";
let currentSortMode = "newest";
let editingTaskId = null;

// Run only the code needed for the page that is currently open.
document.addEventListener("DOMContentLoaded", function () {
  const page = getCurrentPageName();

  setupThemeToggle();

  if (page === "login.html" || page === "") {
    initLoginPage();
  }

  if (page === "signup.html") {
    initSignupPage();
  }

  if (page === "dashboard.html") {
    initDashboardPage();
  }
});

function getCurrentPageName() {
  const pathParts = window.location.pathname.split("/");
  return pathParts[pathParts.length - 1];
}

function redirectTo(pageName) {
  window.location.href = pageName;
}

function initLoginPage() {
  const loginForm = document.querySelector("#login-form");
  const emailInput = document.querySelector("#email-input");
  const passwordInput = document.querySelector("#password-input");
  const loginMessage = document.querySelector("#login-message");
  const showSignupButton = document.querySelector("#show-signup-btn");

  if (getCurrentUser() !== null) {
    redirectTo("dashboard.html");
    return;
  }

  showSignupButton.addEventListener("click", function () {
    redirectTo("signup.html");
  });

  // Login checks the entered email and password against users saved in localStorage.
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const users = getUsers();

    const matchedUser = users.find(function (user) {
      return user.email === email && user.password === password;
    });

    if (matchedUser !== undefined) {
      // Store the current session separately from the full users array.
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        name: matchedUser.name,
        email: matchedUser.email,
        createdAt: matchedUser.createdAt || ""
      }));

      redirectTo("dashboard.html");
      return;
    }

    loginMessage.classList.remove("success");
    loginMessage.textContent = "Invalid email or password. Please sign up if you do not have an account.";
  });
}

function initSignupPage() {
  const signupForm = document.querySelector("#signup-form");
  const signupNameInput = document.querySelector("#signup-name-input");
  const signupEmailInput = document.querySelector("#signup-email-input");
  const signupPasswordInput = document.querySelector("#signup-password-input");
  const signupMessage = document.querySelector("#signup-message");
  const showLoginButton = document.querySelector("#show-login-btn");

  if (getCurrentUser() !== null) {
    redirectTo("dashboard.html");
    return;
  }

  showLoginButton.addEventListener("click", function () {
    redirectTo("login.html");
  });

  // Signup validates user input and saves a new user object in localStorage.
  signupForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim().toLowerCase();
    const password = signupPasswordInput.value;

    signupMessage.classList.remove("success");

    if (name === "") {
      signupMessage.textContent = "Please enter your name.";
      return;
    }

    if (email === "") {
      signupMessage.textContent = "Please enter your email.";
      return;
    }

    if (!isValidEmail(email)) {
      signupMessage.textContent = "Please enter a valid email address.";
      return;
    }

    if (password === "") {
      signupMessage.textContent = "Please enter a password.";
      return;
    }

    if (password.length < 6) {
      signupMessage.textContent = "Password must be at least 6 characters.";
      return;
    }

    const users = getUsers();
    const emailAlreadyExists = users.some(function (user) {
      return user.email === email;
    });

    if (emailAlreadyExists) {
      signupMessage.textContent = "That email is already registered. Please log in.";
      return;
    }

    users.push({
      name: name,
      email: email,
      password: password,
      createdAt: new Date().toISOString()
    });

    saveUsers(users);
    signupMessage.classList.add("success");
    signupMessage.textContent = "Account created successfully. Redirecting to login...";

    setTimeout(function () {
      redirectTo("login.html");
    }, 700);
  });
}

function initDashboardPage() {
  const currentUser = getCurrentUser();

  // Dashboard protection: users must be logged in before using the task manager.
  if (currentUser === null) {
    redirectTo("login.html");
    return;
  }

  const welcomeMessage = document.querySelector("#welcome-message");
  const logoutButton = document.querySelector("#logout-btn");

  welcomeMessage.textContent = `Welcome, ${currentUser.name}`;
  tasks = loadTasks();

  setupTaskForm();
  setupTaskFilters();
  setupSearchAndSort();
  setupTaskListEvents();
  setupProfileSection();
  renderTasks();
  requestNotificationPermission();

  setInterval(function () {
    renderTasks();
  }, 60000);

  logoutButton.addEventListener("click", function () {
    localStorage.removeItem(CURRENT_USER_KEY);
    redirectTo("login.html");
  });
}

function setupTaskForm() {
  const taskForm = document.querySelector("#task-form");

  taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const taskInput = document.querySelector("#task-input");
    const priorityInput = document.querySelector("#priority-input");
    const categoryInput = document.querySelector("#category-input");
    const dueDateInput = document.querySelector("#due-date-input");
    const notesInput = document.querySelector("#task-notes-input");
    const formMessage = document.querySelector("#form-message");
    const taskText = taskInput.value.trim();
    const taskNotes = notesInput.value.trim();

    if (taskText === "") {
      formMessage.textContent = "Please enter a task before adding it.";
      return;
    }

    if (editingTaskId === null) {
      const newTask = {
        id: Date.now(),
        text: taskText,
        priority: priorityInput.value,
        category: categoryInput.value,
        dueDate: dueDateInput.value,
        notes: taskNotes,
        subtasks: [],
        completed: false,
        notificationSent: false,
        createdAt: new Date().toISOString()
      };

      tasks.push(newTask);
    } else {
      // Editing updates the existing task by id, so completed/category/due data is preserved.
      tasks = tasks.map(function (task) {
        if (task.id === editingTaskId) {
          return {
            ...task,
            text: taskText,
            priority: priorityInput.value,
            category: categoryInput.value,
            dueDate: dueDateInput.value,
            notes: taskNotes,
            notificationSent: task.dueDate === dueDateInput.value ? task.notificationSent : false
          };
        }

        return task;
      });
    }

    saveTasks();
    renderTasks();
    resetForm();
  });
}

function setupTaskFilters() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const categoryFilter = document.querySelector("#category-filter");

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      currentFilter = button.dataset.filter;

      filterButtons.forEach(function (btn) {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      renderTasks();
    });
  });

  categoryFilter.addEventListener("change", function () {
    currentCategoryFilter = categoryFilter.value;
    renderTasks();
  });
}

function setupSearchAndSort() {
  const searchInput = document.querySelector("#task-search");
  const sortSelect = document.querySelector("#task-sort");

  // Search updates as the user types and checks title, category, and priority.
  searchInput.addEventListener("input", function () {
    currentSearchQuery = searchInput.value.trim().toLowerCase();
    renderTasks();
  });

  // Sorting changes the display order without changing saved task data.
  sortSelect.addEventListener("change", function () {
    currentSortMode = sortSelect.value;
    renderTasks();
  });
}

function setupThemeToggle() {
  const themeToggle = document.querySelector("#theme-toggle");
  const savedTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";

  applyTheme(savedTheme);

  if (themeToggle === null) {
    return;
  }

  themeToggle.addEventListener("click", function () {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";

    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  const themeToggle = document.querySelector("#theme-toggle");
  const isDarkMode = theme === "dark";

  document.body.classList.toggle("dark-mode", isDarkMode);

  if (themeToggle !== null) {
    themeToggle.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
    themeToggle.setAttribute("aria-pressed", String(isDarkMode));
  }
}

function setupProfileSection() {
  const currentUser = getCurrentUser();
  const profileForm = document.querySelector("#profile-form");
  const profileNameInput = document.querySelector("#profile-name-input");
  const profileEmail = document.querySelector("#profile-email");
  const profileMessage = document.querySelector("#profile-message");

  if (currentUser === null || profileForm === null) {
    return;
  }

  profileNameInput.value = currentUser.name;
  profileEmail.textContent = currentUser.email;

  profileForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const newName = profileNameInput.value.trim();

    profileMessage.classList.remove("success");

    if (newName === "") {
      profileMessage.textContent = "Please enter a name.";
      return;
    }

    const users = getUsers();
    const userIndex = users.findIndex(function (user) {
      return user.email === currentUser.email;
    });

    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        name: newName
      };

      saveUsers(users);
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      name: newName,
      email: currentUser.email,
      createdAt: currentUser.createdAt || ""
    }));

    document.querySelector("#welcome-message").textContent = `Welcome, ${newName}`;
    profileMessage.classList.add("success");
    profileMessage.textContent = "Profile name updated.";
  });
}

function setupTaskListEvents() {
  const taskList = document.querySelector("#task-list");

  taskList.addEventListener("click", function (event) {
    const taskId = Number(event.target.dataset.id);

    if (event.target.classList.contains("delete-btn")) {
      tasks = tasks.filter(function (task) {
        return task.id !== taskId;
      });

      saveTasks();
      renderTasks();
      resetForm();
    }

    if (event.target.classList.contains("edit-btn")) {
      const taskToEdit = tasks.find(function (task) {
        return task.id === taskId;
      });

      if (taskToEdit === undefined) {
        return;
      }

      document.querySelector("#task-input").value = taskToEdit.text;
      document.querySelector("#priority-input").value = taskToEdit.priority;
      document.querySelector("#category-input").value = taskToEdit.category;
      document.querySelector("#due-date-input").value = taskToEdit.dueDate;
      document.querySelector("#task-notes-input").value = taskToEdit.notes;
      document.querySelector("#task-submit-btn").textContent = "Save Task";
      document.querySelector("#form-message").textContent = "Editing task. Update the fields, then click Save Task.";
      editingTaskId = taskToEdit.id;
      document.querySelector("#task-input").focus();
    }

    if (event.target.classList.contains("add-subtask-btn")) {
      const subtaskInput = document.querySelector(`#subtask-input-${taskId}`);
      addSubtask(taskId, subtaskInput);
    }

    if (event.target.classList.contains("delete-subtask-btn")) {
      const subtaskId = event.target.dataset.subtaskId;
      tasks = tasks.map(function (task) {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.filter(function (subtask) {
              return String(subtask.id) !== String(subtaskId);
            })
          };
        }

        return task;
      });

      saveTasks();
      renderTasks();
    }
  });

  taskList.addEventListener("change", function (event) {
    const taskId = Number(event.target.dataset.id);

    if (event.target.classList.contains("task-checkbox")) {
      tasks = tasks.map(function (task) {
        if (task.id === taskId) {
          return {
            ...task,
            completed: event.target.checked
          };
        }

        return task;
      });

      saveTasks();
      renderTasks();
    }

    if (event.target.classList.contains("subtask-checkbox")) {
      const subtaskId = event.target.dataset.subtaskId;

      tasks = tasks.map(function (task) {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.map(function (subtask) {
              if (String(subtask.id) === String(subtaskId)) {
                return {
                  ...subtask,
                  completed: event.target.checked
                };
              }

              return subtask;
            })
          };
        }

        return task;
      });

      saveTasks();
      renderTasks();
    }
  });

  taskList.addEventListener("keydown", function (event) {
    if (!event.target.classList.contains("subtask-input") || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addSubtask(Number(event.target.dataset.id), event.target);
  });
}

function resetForm() {
  document.querySelector("#task-input").value = "";
  document.querySelector("#priority-input").value = "medium";
  document.querySelector("#category-input").value = "assignment";
  document.querySelector("#due-date-input").value = "";
  document.querySelector("#task-notes-input").value = "";
  document.querySelector("#task-submit-btn").textContent = "Add Task";
  document.querySelector("#form-message").textContent = "";
  editingTaskId = null;
  document.querySelector("#task-input").focus();
}

function addSubtask(taskId, subtaskInput) {
  if (subtaskInput === null) {
    return;
  }

  const subtaskText = subtaskInput.value.trim();

  if (subtaskText === "") {
    subtaskInput.focus();
    return;
  }

  tasks = tasks.map(function (task) {
    if (task.id === taskId) {
      return {
        ...task,
        subtasks: [
          ...task.subtasks,
          {
            id: Date.now(),
            text: subtaskText,
            completed: false
          }
        ]
      };
    }

    return task;
  });

  saveTasks();
  renderTasks();
}

// Current user/session logic for login persistence.
function getCurrentUser() {
  const savedUser = localStorage.getItem(CURRENT_USER_KEY);

  if (savedUser === null) {
    return null;
  }

  try {
    const user = JSON.parse(savedUser);

    if (user.name && user.email) {
      const matchedUser = getUsers().find(function (savedAccount) {
        return savedAccount.email === user.email;
      });

      return {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt || (matchedUser ? matchedUser.createdAt || "" : "")
      };
    }

    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  } catch (error) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

function getUsers() {
  const savedUsers = localStorage.getItem(USERS_KEY);

  if (savedUsers === null) {
    return [];
  }

  try {
    const users = JSON.parse(savedUsers);

    if (Array.isArray(users)) {
      return users;
    }

    return [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  // Learning demo only: real apps should never store plain passwords in localStorage.
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// User-specific task storage keeps each account's task list separate.
function getTaskStorageKey() {
  const currentUser = getCurrentUser();

  if (currentUser === null) {
    return null;
  }

  return `tasks_${currentUser.email}`;
}

function saveTasks() {
  const taskStorageKey = getTaskStorageKey();

  if (taskStorageKey === null) {
    return;
  }

  localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
}

function loadTasks() {
  const taskStorageKey = getTaskStorageKey();

  if (taskStorageKey === null) {
    return [];
  }

  const savedTasks = localStorage.getItem(taskStorageKey);

  if (savedTasks === null) {
    return [];
  }

  try {
    const savedTaskList = JSON.parse(savedTasks);

    if (!Array.isArray(savedTaskList)) {
      return [];
    }

    return savedTaskList.map(function (task) {
      return {
        id: task.id,
        text: typeof task.text === "string" ? task.text : "",
        priority: normalizePriority(task.priority),
        category: normalizeCategory(task.category),
        dueDate: normalizeDueDate(task.dueDate),
        notes: typeof task.notes === "string" ? task.notes : "",
        subtasks: normalizeSubtasks(task.subtasks),
        completed: Boolean(task.completed),
        notificationSent: Boolean(task.notificationSent),
        createdAt: normalizeCreatedAt(task.createdAt, task.id)
      };
    });
  } catch (error) {
    return [];
  }
}

function getFilteredTasks() {
  let filteredTasks = tasks;

  // Status filters still work first: All, Pending, or Completed.
  if (currentFilter === "pending") {
    filteredTasks = filteredTasks.filter(function (task) {
      return !task.completed;
    });
  }

  if (currentFilter === "completed") {
    filteredTasks = filteredTasks.filter(function (task) {
      return task.completed;
    });
  }

  // Category filter, search, and sorting are layered on top of the status filter.
  filteredTasks = filteredTasks.filter(matchesCategoryFilter);
  filteredTasks = filteredTasks.filter(matchesSearchQuery);

  return sortTasks(filteredTasks);
}

function renderTasks() {
  const taskList = document.querySelector("#task-list");
  const filteredTasks = getFilteredTasks();

  taskList.innerHTML = "";
  checkDeadlineNotifications();

  filteredTasks.forEach(function (task) {
    const taskItem = document.createElement("li");
    const deadlineInfo = getDeadlineInfo(task);

    taskItem.className = "task-item";

    if (task.completed) {
      taskItem.classList.add("completed");
    }

    if (deadlineInfo.isOverdue) {
      taskItem.classList.add("overdue");
    }

    taskItem.innerHTML = `
      <input
        class="task-checkbox"
        type="checkbox"
        data-id="${task.id}"
        ${task.completed ? "checked" : ""}
        aria-label="Mark ${escapeHtml(task.text)} as completed"
      >
      <div class="task-content">
        <span class="task-text">${escapeHtml(task.text)}</span>
        ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ""}
        <div class="task-meta">
          <span class="meta-pill priority-${task.priority}">${formatPriority(task.priority)} Priority</span>
          <span class="meta-pill category-pill">${formatCategory(task.category)}</span>
          ${task.dueDate ? `<span class="meta-pill due-date">Due ${formatDate(task.dueDate)}</span>` : ""}
          <span class="meta-pill time-left ${deadlineInfo.isNeutral ? "muted" : ""}">${deadlineInfo.text}</span>
          ${deadlineInfo.isOverdue ? `<span class="meta-pill overdue-label">Overdue</span>` : ""}
          ${deadlineInfo.isUrgent ? `<span class="meta-pill deadline-warning">Less than 24 hours left</span>` : ""}
        </div>
        ${getSubtaskMarkup(task)}
      </div>
      <div class="task-actions">
        <button class="edit-btn" type="button" data-id="${task.id}">Edit</button>
        <button class="delete-btn" type="button" data-id="${task.id}">Delete</button>
      </div>
    `;

    taskList.appendChild(taskItem);
  });

  updateTaskCount();
  updateEmptyState(filteredTasks.length);
}

function getSubtaskMarkup(task) {
  const completedSubtasks = task.subtasks.filter(function (subtask) {
    return subtask.completed;
  }).length;

  const subtaskItems = task.subtasks.map(function (subtask) {
    return `
      <li class="subtask-item">
        <label>
          <input
            class="subtask-checkbox"
            type="checkbox"
            data-id="${task.id}"
            data-subtask-id="${subtask.id}"
            ${subtask.completed ? "checked" : ""}
          >
          <span>${escapeHtml(subtask.text)}</span>
        </label>
        <button
          class="delete-subtask-btn"
          type="button"
          data-id="${task.id}"
          data-subtask-id="${subtask.id}"
          aria-label="Delete subtask ${escapeHtml(subtask.text)}"
        >Delete</button>
      </li>
    `;
  }).join("");

  return `
    <div class="subtask-area">
      <p class="subtask-progress">${completedSubtasks}/${task.subtasks.length} subtasks completed</p>
      ${task.subtasks.length > 0 ? `<ul class="subtask-list">${subtaskItems}</ul>` : ""}
      <div class="subtask-add-row">
        <input
          id="subtask-input-${task.id}"
          class="subtask-input"
          type="text"
          data-id="${task.id}"
          placeholder="Add checklist item"
        >
        <button class="add-subtask-btn" type="button" data-id="${task.id}">Add</button>
      </div>
    </div>
  `;
}

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function checkDeadlineNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  let notificationWasSent = false;

  tasks = tasks.map(function (task) {
    const deadlineInfo = getDeadlineInfo(task);

    if (deadlineInfo.isUrgent && !task.notificationSent) {
      new Notification("Deadline soon", {
        body: `${task.text} is due in ${deadlineInfo.text}.`
      });

      notificationWasSent = true;
      return {
        ...task,
        notificationSent: true
      };
    }

    return task;
  });

  if (notificationWasSent) {
    saveTasks();
  }
}

function getDeadlineInfo(task) {
  if (task.completed) {
    return {
      text: task.dueDate ? "Completed" : "No due date",
      isOverdue: false,
      isUrgent: false,
      isNeutral: true
    };
  }

  if (task.dueDate === "") {
    return {
      text: "No due date",
      isOverdue: false,
      isUrgent: false,
      isNeutral: true
    };
  }

  const timeLeft = getDeadlineDate(task.dueDate).getTime() - Date.now();

  if (timeLeft <= 0) {
    return {
      text: "Overdue",
      isOverdue: true,
      isUrgent: false,
      isNeutral: false
    };
  }

  return {
    text: formatTimeLeft(timeLeft),
    isOverdue: false,
    isUrgent: timeLeft <= ONE_DAY_IN_MS,
    isNeutral: false
  };
}

function getDeadlineDate(dateString) {
  const dateParts = dateString.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  return new Date(year, month, day, 23, 59, 59);
}

function formatTimeLeft(timeLeft) {
  const totalMinutes = Math.ceil(timeLeft / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 2) {
    return `${days} days left`;
  }

  if (days === 1) {
    return hours > 0 ? `1 day ${hours} hours left` : "1 day left";
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours} hours ${minutes} minutes left` : `${hours} hours left`;
  }

  return `${minutes} minutes left`;
}

function normalizePriority(priority) {
  if (priority === "low" || priority === "medium" || priority === "high") {
    return priority;
  }

  return "medium";
}

function normalizeCategory(category) {
  if (
    category === "assignment" ||
    category === "homework" ||
    category === "study-session" ||
    category === "project"
  ) {
    return category;
  }

  return "assignment";
}

function normalizeDueDate(dueDate) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate;
  }

  return "";
}

function normalizeCreatedAt(createdAt, fallbackId) {
  if (typeof createdAt === "string" && !Number.isNaN(Date.parse(createdAt))) {
    return createdAt;
  }

  if (typeof fallbackId === "number" && Number.isFinite(fallbackId)) {
    const fallbackDate = new Date(fallbackId);

    if (!Number.isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .filter(function (subtask) {
      return subtask && typeof subtask.text === "string";
    })
    .map(function (subtask, index) {
      return {
        id: subtask.id || `${Date.now()}-${index}`,
        text: subtask.text,
        completed: Boolean(subtask.completed)
      };
    });
}

function formatPriority(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatCategory(category) {
  if (category === "study-session") {
    return "Study Session";
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

function matchesCategoryFilter(task) {
  return currentCategoryFilter === "all" || task.category === currentCategoryFilter;
}

function matchesSearchQuery(task) {
  if (currentSearchQuery === "") {
    return true;
  }

  const searchableText = [
    task.text,
    task.notes,
    task.subtasks.map(function (subtask) {
      return subtask.text;
    }).join(" "),
    task.category,
    formatCategory(task.category),
    task.priority,
    formatPriority(task.priority)
  ].join(" ").toLowerCase();

  return searchableText.includes(currentSearchQuery);
}

function sortTasks(taskList) {
  const sortedTasks = [...taskList];

  if (currentSortMode === "newest") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return getCreatedTime(secondTask) - getCreatedTime(firstTask);
    });
  }

  if (currentSortMode === "oldest") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return getCreatedTime(firstTask) - getCreatedTime(secondTask);
    });
  }

  if (currentSortMode === "deadline-nearest") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return getSortDeadlineValue(firstTask) - getSortDeadlineValue(secondTask);
    });
  }

  if (currentSortMode === "deadline-farthest") {
    sortedTasks.sort(function (firstTask, secondTask) {
      if (firstTask.dueDate === "" && secondTask.dueDate === "") {
        return 0;
      }

      if (firstTask.dueDate === "") {
        return 1;
      }

      if (secondTask.dueDate === "") {
        return -1;
      }

      return getSortDeadlineValue(secondTask) - getSortDeadlineValue(firstTask);
    });
  }

  if (currentSortMode === "priority-high") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return getPriorityRank(secondTask.priority) - getPriorityRank(firstTask.priority);
    });
  }

  if (currentSortMode === "priority-low") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return getPriorityRank(firstTask.priority) - getPriorityRank(secondTask.priority);
    });
  }

  if (currentSortMode === "pending") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return Number(firstTask.completed) - Number(secondTask.completed);
    });
  }

  if (currentSortMode === "completed") {
    sortedTasks.sort(function (firstTask, secondTask) {
      return Number(secondTask.completed) - Number(firstTask.completed);
    });
  }

  return sortedTasks;
}

function getCreatedTime(task) {
  return new Date(task.createdAt).getTime();
}

function getSortDeadlineValue(task) {
  if (task.dueDate === "") {
    return Number.MAX_SAFE_INTEGER;
  }

  return getDeadlineDate(task.dueDate).getTime();
}

function getPriorityRank(priority) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function formatDate(dateString) {
  const dateParts = dateString.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);
  const date = new Date(year, month, day);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function updateTaskCount() {
  // Summary cards count the full task list, not only the currently filtered results.
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(function (task) {
    return task.completed;
  }).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = tasks.filter(function (task) {
    return getDeadlineInfo(task).isOverdue;
  }).length;
  const deadlineSoonTasks = tasks.filter(function (task) {
    return getDeadlineInfo(task).isUrgent;
  }).length;
  const highPriorityTasks = tasks.filter(function (task) {
    return task.priority === "high";
  }).length;
  const currentUser = getCurrentUser();

  document.querySelector("#task-count").textContent = `${pendingTasks} pending / ${completedTasks} completed`;
  document.querySelector("#total-count").textContent = totalTasks;
  document.querySelector("#pending-count").textContent = pendingTasks;
  document.querySelector("#completed-count").textContent = completedTasks;
  document.querySelector("#overdue-count").textContent = overdueTasks;
  document.querySelector("#deadline-soon-count").textContent = deadlineSoonTasks;
  document.querySelector("#high-priority-count").textContent = highPriorityTasks;

  document.querySelector("#profile-total-count").textContent = totalTasks;
  document.querySelector("#profile-pending-count").textContent = pendingTasks;
  document.querySelector("#profile-completed-count").textContent = completedTasks;
  document.querySelector("#profile-created-date").textContent = currentUser && currentUser.createdAt
    ? formatDate(currentUser.createdAt.slice(0, 10))
    : "Not available";
}

function updateEmptyState(visibleTaskCount) {
  const emptyState = document.querySelector("#empty-state");

  if (visibleTaskCount > 0) {
    emptyState.classList.remove("show");
    return;
  }

  emptyState.classList.add("show");

  if (tasks.length === 0) {
    emptyState.textContent = "No tasks yet. Add your first task above.";
  } else if (currentSearchQuery !== "") {
    emptyState.textContent = "No tasks match your search.";
  } else if (currentCategoryFilter !== "all") {
    emptyState.textContent = `No ${currentFilter} tasks in ${formatCategory(currentCategoryFilter)}.`;
  } else {
    emptyState.textContent = `No ${currentFilter} tasks to show.`;
  }
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
