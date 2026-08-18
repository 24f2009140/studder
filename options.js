document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("profile-list");
  const form = document.getElementById("profile-form");
  const formTitle = document.getElementById("form-title");
  const idField = document.getElementById("profile-id");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const phoneCountrySelect = document.getElementById("phoneCountry");
  const dobDay = document.getElementById("dobDay");
  const dobMonth = document.getElementById("dobMonth");
  const dobYear = document.getElementById("dobYear");

  const FIELD_IDS = [
    "firstName",
    "lastName",
    "fullName",
    "gender",
    "email",
    "alternateEmail",
    "phone",
    "phoneCountry",
    "alternatePhone",
    "doorNumber",
    "area",
    "landmark",
    "city",
    "state",
    "country",
    "zip",
  ];

  window.StudderStorage.DIAL_CODES.forEach((entry) => {
    const opt = document.createElement("option");
    opt.value = entry.code;
    opt.textContent = entry.code;
    opt.title = entry.label;
    phoneCountrySelect.appendChild(opt);
  });
  phoneCountrySelect.value = "+91";

  function displayName(p) {
    return p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unnamed profile";
  }

  function pad2(value) {
    return value.toString().padStart(2, "0");
  }

  function dobFromForm() {
    const day = dobDay.value.trim();
    const month = dobMonth.value.trim();
    const year = dobYear.value.trim();
    if (!day || !month || !year) return "";
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  function dobToForm(dob) {
    const parts = (dob || "").split("/");
    dobDay.value = parts[0] || "";
    dobMonth.value = parts[1] || "";
    dobYear.value = parts[2] || "";
  }

  function renderProfiles(profiles) {
    listEl.innerHTML = "";

    if (profiles.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ui-empty";
      empty.textContent = "No profiles yet. Add one below.";
      listEl.appendChild(empty);
      return;
    }

    profiles.forEach((p) => {
      const card = document.createElement("div");
      card.className = "ui-card";

      const header = document.createElement("div");
      header.className = "ui-card-header";

      const title = document.createElement("p");
      title.className = "ui-card-title";
      title.textContent = displayName(p);

      const actions = document.createElement("div");
      actions.className = "ui-card-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "ui-btn ui-btn-small";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => loadIntoForm(p));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "ui-btn ui-btn-small ui-btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Delete profile "${displayName(p)}"? This cannot be undone.`)) {
          window.StudderStorage.deleteProfile(p.id, renderProfiles);
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      header.appendChild(title);
      header.appendChild(actions);

      const details = document.createElement("p");
      details.className = "ui-muted";
      details.textContent = [p.email, p.phone, p.city].filter(Boolean).join(" · ");

      card.appendChild(header);
      if (details.textContent) card.appendChild(details);
      listEl.appendChild(card);
    });
  }

  function loadIntoForm(profile) {
    idField.value = profile.id;
    FIELD_IDS.forEach((key) => {
      const el = document.getElementById(key);
      if (el) el.value = profile[key] || "";
    });
    dobToForm(profile.dateOfBirth);
    formTitle.textContent = `Edit profile: ${displayName(profile)}`;
    cancelEditBtn.style.display = "inline-block";
    form.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    phoneCountrySelect.value = "+91";
    formTitle.textContent = "Add profile";
    cancelEditBtn.style.display = "none";
  }

  function refresh() {
    window.StudderStorage.getProfiles(renderProfiles);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {};
    FIELD_IDS.forEach((key) => {
      const el = document.getElementById(key);
      data[key] = el ? el.value.trim() : "";
    });
    data.dateOfBirth = dobFromForm();

    if (!data.firstName || !data.lastName || !data.email) {
      alert("First name, last name, and email are required.");
      return;
    }

    const existingId = idField.value;
    if (existingId) {
      window.StudderStorage.updateProfile(existingId, data, () => {
        resetForm();
        refresh();
      });
    } else {
      window.StudderStorage.addProfile(data, () => {
        resetForm();
        refresh();
      });
    }
  });

  cancelEditBtn.addEventListener("click", resetForm);

  refresh();
});
