// Shared localStorage keys for the front-end authentication demo.
const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";
const THEME_KEY = "themePreference";
const ADMIN_LOGS_KEY = "adminActivityLogs";
const DEFAULT_ADMIN_EMAIL = "admin@studenttask.com";
const TEMP_PASSWORD = "123456";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// Task state is used only on dashboard.html.
let tasks = [];
let currentFilter = "all";
let currentCategoryFilter = "all";
let currentSearchQuery = "";
let currentSortMode = "newest";
let editingTaskId = null;

document.addEventListener("DOMContentLoaded", function () {
  ensureDefaultAdmin();
  setupThemeToggle();

  const page = getCurrentPageName();

  if (page === "login.html" || page === "") {
    initLoginPage();
  }

  if (page === "signup.html") {
    initSignupPage();
  }

  if (page === "dashboard.html") {
    initDashboardPage();
  }

  if (page === "admin.html") {
    initAdminPage();
  }
});

function getCurrentPageName() {
  const pathParts = window.location.pathname.split("/");
  return pathParts[pathParts.length - 1];
}

function redirectTo(pageName) {
  window.location.href = pageName;
}

function redirectCurrentUserByRole(user) {
  if (user.role === "admin") {
    redirectTo("admin.html");
    return;
  }

  redirectTo("dashboard.html");
}

function initLoginPage() {
  const loginForm = document.querySelector("#login-form");
  const emailInput = document.querySelector("#email-input");
  const passwordInput = document.querySelector("#password-input");
  const loginMessage = document.querySelector("#login-message");
  const showSignupButton = document.querySelector("#show-signup-btn");
  const currentUser = getCurrentUser();

  if (currentUser !== null) {
    redirectCurrentUserByRole(currentUser);
    return;
  }

  showSignupButton.addEventListener("click", function () {
    redirectTo("signup.html");
  });

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const matchedUser = getUsers().find(function (user) {
      return user.email === email && user.password === password;
    });

    loginMessage.classList.remove("success");

    if (matchedUser === undefined) {
      loginMessage.textContent = "Invalid email or password. Please sign up if you do not have an account.";
      return;
    }

    if (matchedUser.blocked) {
      loginMessage.textContent = "Your account has been blocked. Please contact the administrator.";
      return;
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      blocked: matchedUser.blocked,
      createdAt: matchedUser.createdAt
    }));

    redirectCurrentUserByRole(matchedUser);
  });
}

function initSignupPage() {
  const signupForm = document.querySelector("#signup-form");
  const signupNameInput = document.querySelector("#signup-name-input");
  const signupEmailInput = document.querySelector("#signup-email-input");
  const signupPasswordInput = document.querySelector("#signup-password-input");
  const signupMessage = document.querySelector("#signup-message");
  const showLoginButton = document.querySelector("#show-login-btn");
  const currentUser = getCurrentUser();

  if (currentUser !== null) {
    redirectCurrentUserByRole(currentUser);
    return;
  }

  showLoginButton.addEventListener("click", function () {
    redirectTo("login.html");
  });

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
      role: "user",
      blocked: false,
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
  const currentUser = requireRole("user");

  if (currentUser === null) {
    return;
  }

  document.querySelector("#welcome-message").textContent = `Welcome, ${currentUser.name}`;
  tasks = loadTasksForEmail(currentUser.email);

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

  document.querySelector("#logout-btn").addEventListener("click", logout);
}

function initAdminPage() {
  const currentUser = requireRole("admin");

  if (currentUser === null) {
    return;
  }

  document.querySelector("#admin-welcome-message").textContent = `Welcome, ${currentUser.name}`;
  document.querySelector("#admin-logout-btn").addEventListener("click", logout);
  setupAdminActions();
  renderAdminDashboard();
}

function requireRole(requiredRole) {
  const currentUser = getCurrentUser();

  if (currentUser === null) {
    redirectTo("login.html");
    return null;
  }

  if (requiredRole === "user" && currentUser.role === "admin") {
    redirectTo("admin.html");
    return null;
  }

  if (requiredRole === "admin" && currentUser.role !== "admin") {
    redirectTo("dashboard.html");
    return null;
  }

  return currentUser;
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  redirectTo("login.html");
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
      tasks.push({
        id: Date.now(),
        text: taskText,
        priority: priorityInput.value,
        category: categoryInput.value,
        dueDate: dueDateInput.value,
        notes: taskNotes,
        subtasks: [],
        completed: false,
        completedAt: "",
        notificationSent: false,
        createdAt: new Date().toISOString()
      });
    } else {
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

  searchInput.addEventListener("input", function () {
    currentSearchQuery = searchInput.value.trim().toLowerCase();
    renderTasks();
  });

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
      ...currentUser,
      name: newName
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
      addSubtask(taskId, document.querySelector(`#subtask-input-${taskId}`));
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
            completed: event.target.checked,
            completedAt: event.target.checked ? new Date().toISOString() : ""
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

function setupAdminActions() {
  const adminUserList = document.querySelector("#admin-user-list");

  adminUserList.addEventListener("click", function (event) {
    const email = event.target.dataset.email;

    if (!email) {
      return;
    }

    if (event.target.classList.contains("admin-block-btn")) {
      updateUserByEmail(email, { blocked: true });
      addAdminLog(`Blocked user ${email}`);
      renderAdminDashboard();
    }

    if (event.target.classList.contains("admin-unblock-btn")) {
      updateUserByEmail(email, { blocked: false });
      addAdminLog(`Unblocked user ${email}`);
      renderAdminDashboard();
    }

    if (event.target.classList.contains("admin-reset-btn")) {
      updateUserByEmail(email, { password: TEMP_PASSWORD });
      addAdminLog(`Reset password for user ${email}`);
      renderAdminDashboard();
    }

    if (event.target.classList.contains("admin-delete-btn")) {
      const confirmed = window.confirm(`Delete ${email} and all task data for this user?`);

      if (!confirmed) {
        return;
      }

      deleteUserByEmail(email);
      addAdminLog(`Deleted user ${email}`);
      renderAdminDashboard();
    }
  });
}

function renderAdminDashboard() {
  const users = getUsers();
  const normalUsers = users.filter(function (user) {
    return user.role === "user";
  });
  const allTasks = getAllUserTasks(normalUsers);
  const adminStats = getTaskStats(allTasks);
  const activeUsers = normalUsers.filter(function (user) {
    return !user.blocked;
  }).length;
  const blockedUsers = normalUsers.length - activeUsers;

  setText("#admin-total-users", normalUsers.length);
  setText("#admin-active-users", activeUsers);
  setText("#admin-blocked-users", blockedUsers);
  setText("#admin-total-tasks", adminStats.total);
  setText("#admin-completed-tasks", adminStats.completed);
  setText("#admin-pending-tasks", adminStats.pending);
  setText("#admin-overdue-tasks", adminStats.overdue);
  setText("#admin-deadline-soon-tasks", adminStats.deadlineSoon);
  setText("#admin-high-priority-tasks", adminStats.highPriority);

  renderAdminUsers(normalUsers);
  renderAdminLogs();
}

function renderAdminUsers(users) {
  const adminUserList = document.querySelector("#admin-user-list");

  if (users.length === 0) {
    adminUserList.innerHTML = "<p class=\"empty-state show\">No student users yet.</p>";
    return;
  }

  adminUserList.innerHTML = users.map(function (user) {
    const userTasks = loadTasksForEmail(user.email);
    const stats = getTaskStats(userTasks);
    const statusText = user.blocked ? "Blocked" : "Active";

    return `
      <article class="admin-user-card">
        <div class="admin-user-main">
          <div>
            <h3>${escapeHtml(user.name)}</h3>
            <p>${escapeHtml(user.email)}</p>
          </div>
          <span class="status-pill ${user.blocked ? "status-blocked" : "status-active"}">${statusText}</span>
        </div>
        <dl class="admin-user-details">
          <div><dt>Role</dt><dd>${escapeHtml(user.role)}</dd></div>
          <div><dt>Created</dt><dd>${user.createdAt ? formatDate(user.createdAt.slice(0, 10)) : "Not available"}</dd></div>
          <div><dt>Total</dt><dd>${stats.total}</dd></div>
          <div><dt>Completed</dt><dd>${stats.completed}</dd></div>
          <div><dt>Pending</dt><dd>${stats.pending}</dd></div>
          <div><dt>Overdue</dt><dd>${stats.overdue}</dd></div>
          <div><dt>Deadline Soon</dt><dd>${stats.deadlineSoon}</dd></div>
          <div><dt>High Priority</dt><dd>${stats.highPriority}</dd></div>
        </dl>
        <div class="admin-actions">
          ${user.blocked
            ? `<button class="admin-unblock-btn success-action" type="button" data-email="${escapeHtml(user.email)}">Unblock</button>`
            : `<button class="admin-block-btn warning-action" type="button" data-email="${escapeHtml(user.email)}">Block</button>`}
          <button class="admin-reset-btn secondary-action" type="button" data-email="${escapeHtml(user.email)}">Reset Password</button>
          <button class="admin-delete-btn danger-action" type="button" data-email="${escapeHtml(user.email)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderAdminLogs() {
  const adminLogList = document.querySelector("#admin-log-list");
  const logs = getAdminLogs().slice(0, 8);

  if (logs.length === 0) {
    adminLogList.innerHTML = "<li>No admin activity yet.</li>";
    return;
  }

  adminLogList.innerHTML = logs.map(function (log) {
    return `
      <li>
        <span>${escapeHtml(log.action)}</span>
        <time>${formatDateTime(log.createdAt)}</time>
      </li>
    `;
  }).join("");
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element !== null) {
    element.textContent = value;
  }
}

function ensureDefaultAdmin() {
  const users = getUsers();
  const adminExists = users.some(function (user) {
    return user.email === DEFAULT_ADMIN_EMAIL;
  });

  if (!adminExists) {
    users.push({
      name: "Admin",
      email: DEFAULT_ADMIN_EMAIL,
      password: "admin123",
      role: "admin",
      blocked: false,
      createdAt: new Date().toISOString()
    });
  }

  saveUsers(users);
}

function getCurrentUser() {
  const savedUser = localStorage.getItem(CURRENT_USER_KEY);

  if (savedUser === null) {
    return null;
  }

  try {
    const user = normalizeUser(JSON.parse(savedUser));
    const matchedUser = getUsers().find(function (savedAccount) {
      return savedAccount.email === user.email;
    });

    if (matchedUser === undefined || matchedUser.blocked) {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }

    return {
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      blocked: matchedUser.blocked,
      createdAt: matchedUser.createdAt
    };
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

    if (!Array.isArray(users)) {
      return [];
    }

    return users.map(normalizeUser);
  } catch (error) {
    return [];
  }
}

function normalizeUser(user) {
  if (user === null || typeof user !== "object") {
    user = {};
  }

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  const isDefaultAdmin = email === DEFAULT_ADMIN_EMAIL;

  return {
    name: typeof user.name === "string" && user.name.trim() !== "" ? user.name.trim() : "Student",
    email: email,
    password: typeof user.password === "string" ? user.password : "",
    role: user.role === "admin" || isDefaultAdmin ? "admin" : "user",
    blocked: isDefaultAdmin ? false : Boolean(user.blocked),
    createdAt: normalizeCreatedAt(user.createdAt, user.id)
  };
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users.map(normalizeUser)));
}

function updateUserByEmail(email, updates) {
  const users = getUsers().map(function (user) {
    if (user.email === email && user.email !== DEFAULT_ADMIN_EMAIL) {
      return {
        ...user,
        ...updates
      };
    }

    return user;
  });

  saveUsers(users);
}

function deleteUserByEmail(email) {
  if (email === DEFAULT_ADMIN_EMAIL) {
    return;
  }

  const users = getUsers().filter(function (user) {
    return user.email !== email;
  });

  saveUsers(users);
  localStorage.removeItem(getTaskStorageKeyForEmail(email));
}

function getAdminLogs() {
  const savedLogs = localStorage.getItem(ADMIN_LOGS_KEY);

  if (savedLogs === null) {
    return [];
  }

  try {
    const logs = JSON.parse(savedLogs);

    if (!Array.isArray(logs)) {
      return [];
    }

    return logs.filter(function (log) {
      return log && typeof log.action === "string" && typeof log.createdAt === "string";
    });
  } catch (error) {
    return [];
  }
}

function addAdminLog(action) {
  const logs = getAdminLogs();

  logs.unshift({
    action: action,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(ADMIN_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getTaskStorageKey() {
  const currentUser = getCurrentUser();

  if (currentUser === null) {
    return null;
  }

  return getTaskStorageKeyForEmail(currentUser.email);
}

function getTaskStorageKeyForEmail(email) {
  return `tasks_${email}`;
}

function saveTasks() {
  const taskStorageKey = getTaskStorageKey();

  if (taskStorageKey === null) {
    return;
  }

  localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
}

function loadTasksForEmail(email) {
  const savedTasks = localStorage.getItem(getTaskStorageKeyForEmail(email));

  if (savedTasks === null) {
    return [];
  }

  try {
    const savedTaskList = JSON.parse(savedTasks);

    if (!Array.isArray(savedTaskList)) {
      return [];
    }

    return savedTaskList.map(normalizeTask);
  } catch (error) {
    return [];
  }
}

function getAllUserTasks(users) {
  let allTasks = [];

  users.forEach(function (user) {
    allTasks = allTasks.concat(loadTasksForEmail(user.email));
  });

  return allTasks;
}

function normalizeTask(task) {
  return {
    id: task.id,
    text: typeof task.text === "string" ? task.text : "",
    priority: normalizePriority(task.priority),
    category: normalizeCategory(task.category),
    dueDate: normalizeDueDate(task.dueDate),
    notes: typeof task.notes === "string" ? task.notes : "",
    subtasks: normalizeSubtasks(task.subtasks),
    completed: Boolean(task.completed),
    completedAt: normalizeCompletedAt(task.completedAt),
    notificationSent: Boolean(task.notificationSent),
    createdAt: normalizeCreatedAt(task.createdAt, task.id)
  };
}

function getFilteredTasks() {
  let filteredTasks = tasks;

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
  updateStudentProgress();
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

function updateTaskCount() {
  const stats = getTaskStats(tasks);
  const currentUser = getCurrentUser();

  setText("#task-count", `${stats.pending} pending / ${stats.completed} completed`);
  setText("#total-count", stats.total);
  setText("#pending-count", stats.pending);
  setText("#completed-count", stats.completed);
  setText("#overdue-count", stats.overdue);
  setText("#deadline-soon-count", stats.deadlineSoon);
  setText("#high-priority-count", stats.highPriority);
  setText("#profile-total-count", stats.total);
  setText("#profile-pending-count", stats.pending);
  setText("#profile-completed-count", stats.completed);
  setText("#profile-created-date", currentUser && currentUser.createdAt
    ? formatDate(currentUser.createdAt.slice(0, 10))
    : "Not available");
}

function updateStudentProgress() {
  const progress = getStudentProgress(tasks);

  setText("#progress-total", progress.stats.total);
  setText("#progress-completed", progress.stats.completed);
  setText("#progress-pending", progress.stats.pending);
  setText("#progress-overdue", progress.stats.overdue);
  setText("#progress-completion-rate", `${progress.completionRate}%`);
  setText("#progress-today", progress.completedToday);
  setText("#progress-week", progress.completedThisWeek);
  setText("#progress-month", progress.completedThisMonth);
  setText("#progress-productive-day", progress.mostProductiveDay);
  setText("#progress-productive-month", progress.mostProductiveMonth);
  setText("#progress-productive-year", progress.mostProductiveYear);
  setText("#progress-high-priority-completed", progress.highPriorityCompleted);
  setText("#progress-top-category", progress.topCategory);

  const categoryList = document.querySelector("#category-progress-list");

  if (categoryList === null) {
    return;
  }

  if (progress.totalCategoryCompletions === 0) {
    categoryList.innerHTML = "<li>No category progress yet</li>";
    return;
  }

  categoryList.innerHTML = CATEGORY_OPTIONS.map(function (category) {
    return `<li><span>${formatCategory(category)}</span><strong>${progress.categoryCounts[category]} completed</strong></li>`;
  }).join("");
}

function getTaskStats(taskList) {
  const completed = taskList.filter(function (task) {
    return task.completed;
  }).length;
  const overdue = taskList.filter(function (task) {
    return getDeadlineInfo(task).isOverdue;
  }).length;
  const deadlineSoon = taskList.filter(function (task) {
    return getDeadlineInfo(task).isUrgent;
  }).length;
  const highPriority = taskList.filter(function (task) {
    return task.priority === "high";
  }).length;

  return {
    total: taskList.length,
    completed: completed,
    pending: taskList.length - completed,
    overdue: overdue,
    deadlineSoon: deadlineSoon,
    highPriority: highPriority
  };
}

const CATEGORY_OPTIONS = ["assignment", "homework", "study-session", "project"];

function getStudentProgress(taskList) {
  const stats = getTaskStats(taskList);
  const completedTasks = taskList.filter(function (task) {
    return task.completed;
  });
  const completedWithDates = completedTasks.filter(function (task) {
    return task.completedAt !== "";
  });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const categoryCounts = getCompletedCategoryCounts(completedTasks);
  const totalCategoryCompletions = CATEGORY_OPTIONS.reduce(function (total, category) {
    return total + categoryCounts[category];
  }, 0);

  return {
    stats: stats,
    completionRate: stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100),
    completedToday: countCompletedSince(completedWithDates, startOfToday),
    completedThisWeek: countCompletedSince(completedWithDates, startOfWeek),
    completedThisMonth: countCompletedSince(completedWithDates, startOfMonth),
    mostProductiveDay: getMostProductiveText(completedWithDates, "day"),
    mostProductiveMonth: getMostProductiveText(completedWithDates, "month"),
    mostProductiveYear: getMostProductiveText(completedWithDates, "year"),
    highPriorityCompleted: completedTasks.filter(function (task) {
      return task.priority === "high";
    }).length,
    categoryCounts: categoryCounts,
    totalCategoryCompletions: totalCategoryCompletions,
    topCategory: getTopCategoryText(categoryCounts)
  };
}

function countCompletedSince(completedTasks, startDate) {
  return completedTasks.filter(function (task) {
    return new Date(task.completedAt) >= startDate;
  }).length;
}

function getCompletedCategoryCounts(completedTasks) {
  const counts = {
    "assignment": 0,
    "homework": 0,
    "study-session": 0,
    "project": 0
  };

  completedTasks.forEach(function (task) {
    counts[task.category] += 1;
  });

  return counts;
}

function getTopCategoryText(categoryCounts) {
  let topCategory = "";
  let topCount = 0;

  CATEGORY_OPTIONS.forEach(function (category) {
    if (categoryCounts[category] > topCount) {
      topCategory = category;
      topCount = categoryCounts[category];
    }
  });

  if (topCount === 0) {
    return "No category progress yet";
  }

  return `${formatCategory(topCategory)} — ${topCount} completed`;
}

function getMostProductiveText(completedTasks, groupType) {
  if (completedTasks.length === 0) {
    return "No completed tasks yet";
  }

  const counts = {};

  completedTasks.forEach(function (task) {
    const key = getProductivityKey(task.completedAt, groupType);
    counts[key] = (counts[key] || 0) + 1;
  });

  const bestKey = Object.keys(counts).sort(function (firstKey, secondKey) {
    return counts[secondKey] - counts[firstKey] || firstKey.localeCompare(secondKey);
  })[0];

  return `${formatProductivityKey(bestKey, groupType)} — ${counts[bestKey]} tasks completed`;
}

function getProductivityKey(dateString, groupType) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupType === "year") {
    return String(year);
  }

  if (groupType === "month") {
    return `${year}-${month}`;
  }

  return `${year}-${month}-${day}`;
}

function formatProductivityKey(key, groupType) {
  if (groupType === "year") {
    return key;
  }

  if (groupType === "month") {
    const parts = key.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);

    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }

  return formatLongDate(key);
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
  if (CATEGORY_OPTIONS.includes(category)) {
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

function normalizeCompletedAt(completedAt) {
  if (typeof completedAt === "string" && !Number.isNaN(Date.parse(completedAt))) {
    return completedAt;
  }

  return "";
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

function formatLongDate(dateString) {
  const dateParts = dateString.split("-");
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);
  const date = new Date(year, month, day);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
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
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
