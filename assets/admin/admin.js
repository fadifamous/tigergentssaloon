const BOOKING_URL = "https://tigergentssaloon.setmore.com";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CONTENT_RETRY_DELAYS = [700, 1500];

const state = {
  user: null,
  section: "dashboard",
  content: { employees: [], gallery: [] },
  headSha: "",
  repository: "fadifamous/tigergentssaloon",
  branch: "main",
  updatedAt: null,
  lastCommitUrl: "",
  editing: null,
  pendingConfirm: null
};

const sectionMeta = {
  dashboard: ["Website", "Overview", "Team and picture updates are saved directly to GitHub."],
  employees: ["People", "Team members", "Add, edit, hide or remove the people shown on the website."],
  gallery: ["Photography", "Website pictures", "Manage the pictures shown on the homepage and gallery page."]
};

const dom = {
  loginView: document.querySelector('[data-auth-view="login"]'),
  app: document.querySelector("[data-admin-app]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginError: document.querySelector("[data-login-error]"),
  content: document.querySelector("[data-admin-content]"),
  loading: document.querySelector("[data-loading]"),
  sectionTitle: document.querySelector("[data-section-title]"),
  sectionEyebrow: document.querySelector("[data-section-eyebrow]"),
  sectionDescription: document.querySelector("[data-section-description]"),
  currentSection: document.querySelector("[data-current-section]"),
  sectionActions: document.querySelector("[data-section-actions]"),
  sidebar: document.querySelector("[data-sidebar]"),
  sidebarToggle: document.querySelector("[data-sidebar-toggle]"),
  connectionStatus: document.querySelector("[data-connection-status]"),
  sourceLabel: document.querySelector("[data-source-label]"),
  editor: document.querySelector("[data-editor-dialog]"),
  editorForm: document.querySelector("[data-editor-form]"),
  editorTitle: document.querySelector("[data-editor-title]"),
  editorEyebrow: document.querySelector("[data-editor-eyebrow]"),
  editorFields: document.querySelector("[data-editor-fields]"),
  editorError: document.querySelector("[data-editor-error]"),
  confirm: document.querySelector("[data-confirm-dialog]"),
  confirmTitle: document.querySelector("[data-confirm-title]"),
  confirmMessage: document.querySelector("[data-confirm-message]"),
  toastRegion: document.querySelector("[data-toast-region]")
};

async function api(path, options = {}) {
  const init = {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  };
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(`/api/admin${path}`, init);
  const data = await response.json().catch(() => ({ error: "The server returned an invalid response." }));
  if (!response.ok) {
    const error = new Error(data.error || "The request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function boot() {
  bindEvents();
  try {
    const result = await api("/auth/me");
    state.user = result.user;
    state.repository = result.repository || state.repository;
    await enterApp();
  } catch (error) {
    showLogin();
    if (error.status && error.status !== 401) showError(dom.loginError, error.message);
  }
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", submitLogin);
  document.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", logout));
  document.querySelectorAll("[data-section]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.section)));
  dom.sidebarToggle.addEventListener("click", () => toggleSidebar());
  dom.content.addEventListener("click", handleContentClick);
  dom.sectionActions.addEventListener("click", (event) => {
    if (event.target.closest("[data-create]")) openEditor(state.section);
    if (event.target.closest("[data-refresh]")) refreshFromGitHub();
  });
  document.querySelector("[data-editor-close]").addEventListener("click", closeEditor);
  document.querySelector("[data-editor-cancel]").addEventListener("click", closeEditor);
  dom.editorForm.addEventListener("submit", saveEditor);
  dom.confirm.addEventListener("close", () => {
    if (!state.pendingConfirm) return;
    state.pendingConfirm(dom.confirm.returnValue === "confirm");
    state.pendingConfirm = null;
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dom.sidebar.classList.contains("open")) toggleSidebar(false);
  });
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(dom.loginForm);
  setFormBusy(dom.loginForm, true);
  hideError(dom.loginError);
  try {
    const result = await api("/auth/login", {
      method: "POST",
      body: { username: form.get("username"), password: form.get("password") }
    });
    state.user = result.user;
    state.repository = result.repository || state.repository;
    dom.loginForm.reset();
    dom.loginForm.elements.username.value = state.user.username || "admin";
    await enterApp();
  } catch (error) {
    showError(dom.loginError, error.message);
  } finally {
    setFormBusy(dom.loginForm, false);
  }
}

async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch {}
  state.user = null;
  showLogin();
}

async function enterApp() {
  dom.loginView.hidden = true;
  dom.app.hidden = false;
  document.querySelector("[data-user-name]").textContent = state.user?.username || "admin";
  updateRepositoryLinks();
  await refreshFromGitHub();
}

function showLogin() {
  dom.app.hidden = true;
  dom.loginView.hidden = false;
  setTimeout(() => dom.loginForm.elements.password?.focus(), 0);
}

async function refreshFromGitHub() {
  setLoading(true);
  dom.connectionStatus.classList.remove("ready");
  dom.sourceLabel.textContent = "Connecting to GitHub…";
  try {
    let result;
    for (let attempt = 0; attempt <= CONTENT_RETRY_DELAYS.length; attempt += 1) {
      try {
        result = await api("/content");
        break;
      } catch (error) {
        const canRetry = (error.status === 502 || error.status === 503) && attempt < CONTENT_RETRY_DELAYS.length;
        if (!canRetry) throw error;
        dom.sourceLabel.textContent = "Finishing GitHub connection…";
        await wait(CONTENT_RETRY_DELAYS[attempt]);
      }
    }
    state.content.employees = Array.isArray(result.content?.employees) ? result.content.employees : [];
    state.content.gallery = Array.isArray(result.content?.gallery) ? result.content.gallery : [];
    state.headSha = result.headSha || "";
    state.repository = result.repository || state.repository;
    state.branch = result.branch || "main";
    state.updatedAt = result.updatedAt;
    state.lastCommitUrl = result.lastCommitUrl || "";
    dom.connectionStatus.classList.add("ready");
    dom.sourceLabel.textContent = `${state.repository} · ${state.branch}`;
    updateRepositoryLinks();
    renderSection();
  } catch (error) {
    const temporary = error.status === 502 || error.status === 503;
    dom.content.innerHTML = emptyState(
      temporary ? "GitHub is still connecting" : "GitHub is not connected",
      temporary ? "Cloudflare is finishing the latest deployment. Use Refresh in a few seconds if this message remains." : error.message,
      true
    );
    dom.sourceLabel.textContent = temporary ? "Connection still starting" : "GitHub setup needed";
  } finally {
    setLoading(false);
  }
}

function navigate(section) {
  if (!sectionMeta[section]) return;
  state.section = section;
  document.querySelectorAll("[data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  const [eyebrow, title, description] = sectionMeta[section];
  dom.sectionEyebrow.textContent = eyebrow;
  dom.sectionTitle.textContent = title;
  dom.sectionDescription.textContent = description;
  dom.currentSection.textContent = title;
  renderSection();
  toggleSidebar(false);
  document.querySelector("#admin-main")?.focus({ preventScroll: true });
}

function renderSection() {
  const connected = Boolean(state.headSha);
  dom.sectionActions.innerHTML = connected
    ? `${state.section === "employees" || state.section === "gallery" ? `<button class="admin-button admin-button-primary" type="button" data-create>Add ${state.section === "employees" ? "team member" : "picture"}</button>` : ""}<button class="admin-button admin-button-quiet" type="button" data-refresh>Refresh</button>`
    : "";
  if (!connected) return;
  if (state.section === "dashboard") renderDashboard();
  else if (state.section === "employees") renderEmployees();
  else renderGallery();
}

function renderDashboard() {
  const activeEmployees = state.content.employees.filter((item) => item.data?.status === "active").length;
  const activePictures = state.content.gallery.filter((item) => item.data?.status === "active").length;
  dom.content.innerHTML = `
    <div class="metric-grid">
      ${metric("Team members", state.content.employees.length, `${activeEmployees} visible`)}
      ${metric("Website pictures", state.content.gallery.length, `${activePictures} visible`)}
      ${metric("GitHub branch", escapeHtml(state.branch), "Single source of truth")}
      ${metric("Last update", state.updatedAt ? escapeHtml(relativeTime(state.updatedAt)) : "Initial", "Saved through admin")}
    </div>
    <div class="dashboard-grid">
      <section class="admin-panel">
        <div class="panel-header"><h2>How updates work</h2><span class="status-badge published">Connected</span></div>
        <ol class="simple-steps">
          <li><strong>Edit</strong><span>Choose a team member or website picture.</span></li>
          <li><strong>Save</strong><span>The admin creates one commit in GitHub.</span></li>
          <li><strong>Publish</strong><span>Cloudflare detects the commit and deploys it automatically, usually within a minute or two.</span></li>
        </ol>
        ${state.lastCommitUrl ? `<a class="text-link" href="${escapeAttr(state.lastCommitUrl)}" target="_blank" rel="noopener">View current GitHub version ↗</a>` : ""}
      </section>
      <section class="admin-panel">
        <div class="panel-header"><h2>Quick update</h2></div>
        <div class="quick-grid">
          <button type="button" data-go="employees">Manage team members <span>→</span></button>
          <button type="button" data-go="gallery">Manage website pictures <span>→</span></button>
          <a class="quick-link" href="/" target="_blank" rel="noopener">Open live website <span>↗</span></a>
        </div>
      </section>
    </div>`;
}

function renderEmployees() {
  if (!state.content.employees.length) {
    dom.content.innerHTML = emptyState("No team members yet", "Add the first person shown on the website.");
    return;
  }
  dom.content.innerHTML = `
    <div class="content-toolbar"><p>Changes are committed directly to GitHub.</p><span class="toolbar-count">${state.content.employees.length} team members</span></div>
    <div class="content-table-wrap"><table class="content-table">
      <thead><tr><th>Team member</th><th>Visibility</th><th>Homepage</th><th><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${state.content.employees.map((item, index) => employeeRow(item, index)).join("")}</tbody>
    </table></div>`;
}

function employeeRow(item, index) {
  const data = item.data || {};
  const image = data.imageUrl ? `<img src="${escapeAttr(data.imageUrl)}" alt="">` : escapeHtml(data.initial || data.name?.slice(0, 1) || "T");
  return `<tr>
    <td><div class="content-name"><span class="content-avatar">${image}</span><span><strong>${escapeHtml(data.name)}</strong><small>${escapeHtml(data.role)}</small></span></div></td>
    <td><span class="status-badge ${data.status === "active" ? "published" : "archived"}">${escapeHtml(data.status)}</span></td>
    <td>${data.featured ? "Yes" : "No"}</td>
    <td><div class="row-actions">
      ${index ? `<button class="row-action" type="button" data-action="up" data-type="employees" data-id="${escapeAttr(item.id)}" aria-label="Move ${escapeAttr(data.name)} up">↑</button>` : ""}
      ${index < state.content.employees.length - 1 ? `<button class="row-action" type="button" data-action="down" data-type="employees" data-id="${escapeAttr(item.id)}" aria-label="Move ${escapeAttr(data.name)} down">↓</button>` : ""}
      <button class="row-action" type="button" data-action="edit" data-type="employees" data-id="${escapeAttr(item.id)}">Edit</button>
      <button class="row-action danger" type="button" data-action="remove" data-type="employees" data-id="${escapeAttr(item.id)}">Remove</button>
    </div></td>
  </tr>`;
}

function renderGallery() {
  if (!state.content.gallery.length) {
    dom.content.innerHTML = emptyState("No website pictures yet", "Upload the first gallery picture.");
    return;
  }
  dom.content.innerHTML = `
    <div class="content-toolbar"><p>Use clear alternative text describing what is visible.</p><span class="toolbar-count">${state.content.gallery.length} pictures</span></div>
    <div class="media-grid">${state.content.gallery.map((item, index) => pictureCard(item, index)).join("")}</div>`;
}

function pictureCard(item, index) {
  const data = item.data || {};
  return `<article class="media-card">
    <figure>${data.imageUrl ? `<img src="${escapeAttr(data.imageUrl)}" alt="${escapeAttr(data.altText)}" loading="lazy">` : ""}</figure>
    <div class="media-card-body">
      <div class="media-card-heading"><strong>${escapeHtml(data.title)}</strong><span class="status-badge ${data.status === "active" ? "published" : "archived"}">${escapeHtml(data.status)}</span></div>
      <p>${escapeHtml(data.altText)}</p>
      <div class="media-card-actions">
        ${index ? `<button class="row-action" type="button" data-action="up" data-type="gallery" data-id="${escapeAttr(item.id)}" aria-label="Move picture up">↑</button>` : ""}
        ${index < state.content.gallery.length - 1 ? `<button class="row-action" type="button" data-action="down" data-type="gallery" data-id="${escapeAttr(item.id)}" aria-label="Move picture down">↓</button>` : ""}
        <button class="row-action" type="button" data-action="edit" data-type="gallery" data-id="${escapeAttr(item.id)}">Edit</button>
        <button class="row-action danger" type="button" data-action="remove" data-type="gallery" data-id="${escapeAttr(item.id)}">Remove</button>
      </div>
    </div>
  </article>`;
}

async function handleContentClick(event) {
  const go = event.target.closest("[data-go]");
  if (go) return navigate(go.dataset.go);
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, type, id } = button.dataset;
  if (action === "edit") return openEditor(type, id);
  if (action === "remove") return removeItem(type, id);
  if (action === "up" || action === "down") return moveItem(type, id, action === "up" ? -1 : 1);
}

function openEditor(type, id = "") {
  if (!new Set(["employees", "gallery"]).has(type)) return;
  const item = id ? state.content[type].find((entry) => entry.id === id) : null;
  state.editing = { type, id, item };
  dom.editorEyebrow.textContent = item ? "Edit website content" : "Add website content";
  dom.editorTitle.textContent = item
    ? `Edit ${type === "employees" ? item.data.name : item.data.title}`
    : `Add ${type === "employees" ? "team member" : "picture"}`;
  dom.editorFields.innerHTML = type === "employees" ? employeeFields(item?.data) : galleryFields(item?.data);
  hideError(dom.editorError);
  dom.editor.returnValue = "";
  dom.editor.showModal();
  setTimeout(() => dom.editorFields.querySelector("input")?.focus(), 0);
}

function employeeFields(data = {}) {
  return `
    ${textField("name", "Name", data.name, { required: true })}
    ${textField("role", "Role", data.role, { required: true })}
    ${textField("initial", "Display initial", data.initial, { maxLength: 2 })}
    ${selectField("status", "Visibility", data.status || "active", [["active", "Visible"], ["unavailable", "Temporarily unavailable"], ["inactive", "Hidden"]])}
    ${textAreaField("bio", "Short biography", data.bio, true)}
    ${textField("bookingUrl", "Booking link", data.bookingUrl || BOOKING_URL, { type: "url", wide: true })}
    ${imageField(data.imageUrl, false)}
    ${checkboxField("featured", "Show on homepage", Boolean(data.featured))}`;
}

function galleryFields(data = {}) {
  return `
    ${textField("title", "Picture title", data.title, { required: true })}
    ${selectField("status", "Visibility", data.status || "active", [["active", "Visible"], ["inactive", "Hidden"]])}
    ${textAreaField("altText", "Alternative text", data.altText, true, true, "Describe what is visible for visitors using screen readers.")}
    ${textAreaField("caption", "Optional caption", data.caption, true)}
    ${selectField("layout", "Gallery layout", data.layout || "", [["", "Standard"], ["wide", "Wide"], ["tall", "Tall"], ["wide tall", "Wide and tall"]])}
    ${checkboxField("featured", "Show on homepage", Boolean(data.featured))}
    ${imageField(data.imageUrl, !data.imageUrl)}`;
}

function imageField(currentUrl, required) {
  return `<label class="field-wide">${currentUrl ? "Replace picture (optional)" : "Upload picture"}
    ${currentUrl ? `<span class="current-image"><img src="${escapeAttr(currentUrl)}" alt="Current picture"><small>Current website picture</small></span>` : ""}
    <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" ${required ? "required" : ""}>
    <small>JPEG, PNG, WebP or AVIF. Maximum 5 MB. WebP is recommended.</small>
  </label>`;
}

async function saveEditor(event) {
  event.preventDefault();
  if (!state.editing) return;
  const form = new FormData(dom.editorForm);
  hideError(dom.editorError);
  setFormBusy(dom.editorForm, true);
  const { type, id, item } = state.editing;
  const targetId = id || `${type === "employees" ? "employee" : "picture"}-${crypto.randomUUID()}`;
  const data = type === "employees"
    ? {
        name: formText(form, "name"),
        role: formText(form, "role"),
        initial: formText(form, "initial") || formText(form, "name").slice(0, 1).toUpperCase(),
        bio: formText(form, "bio"),
        bookingUrl: formText(form, "bookingUrl") || BOOKING_URL,
        imageUrl: item?.data?.imageUrl || "",
        featured: form.get("featured") === "on",
        status: formText(form, "status") || "active"
      }
    : {
        title: formText(form, "title"),
        imageUrl: item?.data?.imageUrl || "",
        altText: formText(form, "altText"),
        caption: formText(form, "caption"),
        layout: formText(form, "layout"),
        featured: form.get("featured") === "on",
        status: formText(form, "status") || "active"
      };

  if (!data.name && type === "employees") return finishEditorError("Enter the team member's name.");
  if (!data.role && type === "employees") return finishEditorError("Enter the team member's role.");
  if (!data.title && type === "gallery") return finishEditorError("Enter a picture title.");
  if (!data.altText && type === "gallery") return finishEditorError("Describe what is visible in the picture.");

  const next = cloneContent();
  const nextItem = { id: targetId, slug: item?.slug || slugify(data.name || data.title), data };
  const index = next[type].findIndex((entry) => entry.id === targetId);
  if (index >= 0) next[type][index] = nextItem;
  else next[type].push(nextItem);

  try {
    const file = form.get("image");
    const image = file instanceof File && file.size ? await prepareUpload(file, type, targetId) : null;
    if (type === "gallery" && !data.imageUrl && !image) throw new Error("Choose a picture to upload.");
    const label = data.name || data.title;
    await publish(next, image, `${item ? "update" : "add"} ${type === "employees" ? "team member" : "picture"} ${label}`);
    dom.editor.close();
    state.editing = null;
  } catch (error) {
    showError(dom.editorError, error.message);
  } finally {
    setFormBusy(dom.editorForm, false);
  }
}

function finishEditorError(message) {
  showError(dom.editorError, message);
  setFormBusy(dom.editorForm, false);
}

async function removeItem(type, id) {
  const item = state.content[type]?.find((entry) => entry.id === id);
  if (!item) return;
  const label = item.data?.name || item.data?.title || "this item";
  const confirmed = await confirmAction(`Remove ${label}?`, "This removes it from the website content. Existing image files stay safely in GitHub.");
  if (!confirmed) return;
  const next = cloneContent();
  next[type] = next[type].filter((entry) => entry.id !== id);
  try {
    await publish(next, null, `remove ${type === "employees" ? "team member" : "picture"} ${label}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function moveItem(type, id, direction) {
  const next = cloneContent();
  const index = next[type].findIndex((entry) => entry.id === id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= next[type].length) return;
  [next[type][index], next[type][destination]] = [next[type][destination], next[type][index]];
  try {
    await publish(next, null, `reorder ${type === "employees" ? "team members" : "website pictures"}`);
  } catch (error) {
    toast(error.message, true);
  }
}

async function publish(next, image, summary) {
  setLoading(true);
  try {
    const result = await api("/publish", {
      method: "POST",
      body: {
        baseCommitSha: state.headSha,
        employees: next.employees,
        gallery: next.gallery,
        image,
        summary
      }
    });
    state.content.employees = result.content.employees;
    state.content.gallery = result.content.gallery;
    state.headSha = result.headSha;
    state.updatedAt = result.updatedAt;
    state.lastCommitUrl = result.commitUrl || state.lastCommitUrl;
    renderSection();
    toast("Saved to GitHub. Cloudflare is publishing the update now.");
  } catch (error) {
    if (error.status === 409) await refreshFromGitHub();
    throw error;
  } finally {
    setLoading(false);
  }
}

async function prepareUpload(file, targetType, targetId) {
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]).has(file.type)) throw new Error("Use a JPEG, PNG, WebP or AVIF picture.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Pictures must be 5 MB or smaller.");
  const dataUrl = await fileToDataUrl(file);
  return {
    targetType,
    targetId,
    fileName: file.name,
    mimeType: file.type,
    base64: dataUrl.slice(dataUrl.indexOf(",") + 1)
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The picture could not be read."));
    reader.readAsDataURL(file);
  });
}

function cloneContent() {
  return typeof structuredClone === "function"
    ? structuredClone(state.content)
    : JSON.parse(JSON.stringify(state.content));
}

function closeEditor() {
  dom.editor.close();
  state.editing = null;
}

function confirmAction(title, message) {
  dom.confirmTitle.textContent = title;
  dom.confirmMessage.textContent = message;
  dom.confirm.returnValue = "";
  dom.confirm.showModal();
  return new Promise((resolve) => { state.pendingConfirm = resolve; });
}

function toggleSidebar(force) {
  const open = typeof force === "boolean" ? force : !dom.sidebar.classList.contains("open");
  dom.sidebar.classList.toggle("open", open);
  dom.sidebarToggle.setAttribute("aria-expanded", String(open));
}

function setLoading(loading) {
  dom.loading.hidden = !loading;
  dom.content.hidden = loading;
  dom.sectionActions.querySelectorAll("button").forEach((button) => { button.disabled = loading; });
}

function setFormBusy(form, busy) {
  form.querySelectorAll("button, input, textarea, select").forEach((element) => { element.disabled = busy; });
}

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function hideError(element) {
  element.hidden = true;
  element.textContent = "";
}

function toast(message, error = false) {
  const item = document.createElement("div");
  item.className = `toast${error ? " error" : ""}`;
  item.textContent = message;
  dom.toastRegion.append(item);
  setTimeout(() => item.remove(), 5200);
}

function updateRepositoryLinks() {
  const url = `https://github.com/${state.repository}`;
  document.querySelectorAll("[data-repository-link]").forEach((link) => { link.href = url; });
}

function metric(label, value, note) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(note)}</small></article>`;
}

function emptyState(title, message, error = false) {
  return `<div class="empty-state${error ? " error-state" : ""}"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
}

function textField(name, label, value = "", options = {}) {
  return `<label class="${options.wide ? "field-wide" : ""}">${escapeHtml(label)}<input name="${name}" type="${options.type || "text"}" value="${escapeAttr(value)}" ${options.required ? "required" : ""} ${options.maxLength ? `maxlength="${options.maxLength}"` : ""}></label>`;
}

function textAreaField(name, label, value = "", wide = false, required = false, help = "") {
  return `<label class="${wide ? "field-wide" : ""}">${escapeHtml(label)}<textarea name="${name}" ${required ? "required" : ""}>${escapeHtml(value)}</textarea>${help ? `<small>${escapeHtml(help)}</small>` : ""}</label>`;
}

function selectField(name, label, value, options) {
  return `<label>${escapeHtml(label)}<select name="${name}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeAttr(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></label>`;
}

function checkboxField(name, label, checked) {
  return `<label class="checkbox-field"><input name="${name}" type="checkbox" ${checked ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`;
}

function formText(form, name) {
  return String(form.get(name) || "").trim();
}

function slugify(value) {
  return String(value || "item").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

boot();
