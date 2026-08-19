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
  const firstNameInput = document.getElementById("firstName");
  const middleNameInput = document.getElementById("middleName");
  const lastNameInput = document.getElementById("lastName");
  const fullNameInput = document.getElementById("fullName");

  const FIELD_IDS = [
    "nickname",
    "firstName",
    "middleName",
    "lastName",
    "fullName",
    "fullNameOrder",
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
    const base = p.fullName || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "Unnamed profile";
    return p.nickname ? `${base} (${p.nickname})` : base;
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

  function getSelectedFullNameOrder() {
    const selected = document.querySelector('input[name="fullNameOrder"]:checked');
    return selected ? selected.value : "first_last";
  }

  function setSelectedFullNameOrder(order) {
    const value = order === "last_first" ? "last_first" : "first_last";
    const target = document.querySelector(`input[name="fullNameOrder"][value="${value}"]`);
    if (target) target.checked = true;
  }

  function buildFullNameFromOrder() {
    const first = firstNameInput.value.trim();
    const middle = middleNameInput ? middleNameInput.value.trim() : "";
    const last = lastNameInput.value.trim();
    if (!first && !middle && !last) return "";
    const order = getSelectedFullNameOrder();
    return order === "last_first" ? [last, first, middle].filter(Boolean).join(" ") : [first, middle, last].filter(Boolean).join(" ");
  }

  function syncFullName() {
    const generated = buildFullNameFromOrder();
    if (!generated) return;
    fullNameInput.value = generated;
  }

  firstNameInput.addEventListener("input", syncFullName);
  if (middleNameInput) middleNameInput.addEventListener("input", syncFullName);
  lastNameInput.addEventListener("input", syncFullName);
  document.querySelectorAll('input[name="fullNameOrder"]').forEach((radio) => {
    radio.addEventListener("change", syncFullName);
  });

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
      if (key === "fullNameOrder") return;
      const el = document.getElementById(key);
      if (el) el.value = profile[key] || "";
    });
    setSelectedFullNameOrder(profile.fullNameOrder || "first_last");
    dobToForm(profile.dateOfBirth);
    formTitle.textContent = `Edit profile: ${displayName(profile)}`;
    cancelEditBtn.style.display = "inline-block";
    form.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    form.reset();
    idField.value = "";
    setSelectedFullNameOrder("first_last");
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
      if (key === "fullNameOrder") {
        data[key] = getSelectedFullNameOrder();
        return;
      }
      const el = document.getElementById(key);
      data[key] = el ? el.value.trim() : "";
    });
    if (!data.fullName) data.fullName = buildFullNameFromOrder();
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

  const exportBtn = document.getElementById("export-profiles-btn");
  const importBtn = document.getElementById("import-profiles-btn");
  const importInput = document.getElementById("import-profiles-input");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      window.StudderStorage.getProfiles((profiles) => {
        const jsonStr = JSON.stringify(profiles, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "studder_profiles_backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  }

  if (importBtn && importInput) {
    importBtn.addEventListener("click", () => {
      importInput.click();
    });

    importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!Array.isArray(imported)) {
            alert("Invalid backup file: Must be a JSON array of profiles.");
            return;
          }

          window.StudderStorage.getProfiles((existing) => {
            let updatedCount = 0;
            let addedCount = 0;
            const updatedList = [...existing];

            imported.forEach((p) => {
              if (!p || typeof p !== "object") return;
              
              // Validate minimum fields
              if (!p.firstName && !p.lastName && !p.fullName) return;

              // Check if profile ID matches an existing one
              const matchIdx = p.id ? updatedList.findIndex((x) => x.id === p.id) : -1;
              if (matchIdx > -1) {
                updatedList[matchIdx] = Object.assign({}, updatedList[matchIdx], p);
                updatedCount++;
              } else {
                const newProfile = Object.assign(
                  { id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) },
                  p
                );
                updatedList.push(newProfile);
                addedCount++;
              }
            });

            window.StudderStorage.saveProfiles(updatedList, () => {
              alert(`Import finished! Added ${addedCount} new profiles, updated ${updatedCount} existing profiles.`);
              refresh();
              importInput.value = ""; // clear input
            });
          });
        } catch (err) {
          alert("Error parsing backup file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  refresh();
});
