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

      // Export checkbox
      const checkboxWrap = document.createElement("label");
      checkboxWrap.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;margin-right:8px;";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "profile-export-checkbox";
      checkbox.dataset.id = p.id;
      checkbox.title = "Select for export";
      checkboxWrap.appendChild(checkbox);

      const title = document.createElement("p");
      title.className = "ui-card-title";
      title.style.flex = "1";
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
      header.appendChild(checkboxWrap);
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

  // ---- IMPORT PICKER HELPER ----
  function showImportPicker(importedProfiles) {
    // Build a simple modal overlay within the page
    const existing = document.getElementById("studder-import-picker");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "studder-import-picker";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";

    const panel = document.createElement("div");
    panel.style.cssText = "background:var(--ui-bg,#fff);padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,.25);";

    const title = document.createElement("p");
    title.style.cssText = "font-weight:700;font-size:16px;margin:0 0 12px;";
    title.textContent = `Found ${importedProfiles.length} profile(s) in backup`;
    panel.appendChild(title);

    const hint = document.createElement("p");
    hint.style.cssText = "font-size:13px;color:#888;margin:0 0 16px;";
    hint.textContent = "Check the profiles you want to import, then choose an action.";
    panel.appendChild(hint);

    const profileName = (p) => {
      const base = p.fullName || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "Unnamed";
      return p.nickname ? `${base} (${p.nickname})` : base;
    };

    const checkboxes = [];
    importedProfiles.forEach((p, idx) => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee;cursor:pointer;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.dataset.idx = idx;
      checkboxes.push(cb);
      const nameSpan = document.createElement("span");
      nameSpan.style.cssText = "font-size:14px;";
      nameSpan.textContent = profileName(p);
      const detailSpan = document.createElement("span");
      detailSpan.style.cssText = "font-size:12px;color:#888;margin-left:auto;";
      detailSpan.textContent = [p.email, p.city].filter(Boolean).join(" · ");
      row.appendChild(cb);
      row.appendChild(nameSpan);
      row.appendChild(detailSpan);
      panel.appendChild(row);
    });

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;";

    const loadBtn = document.createElement("button");
    loadBtn.className = "ui-btn ui-btn-primary";
    loadBtn.style.cssText = "margin:0;";
    loadBtn.textContent = "Load Selected into Form";
    loadBtn.addEventListener("click", () => {
      const selected = importedProfiles.filter((_, idx) => checkboxes[idx].checked);
      if (selected.length === 0) { alert("Please select at least one profile."); return; }
      overlay.remove();
      loadIntoForm(selected[0]); // Load first selected into form for review
      if (selected.length > 1) alert(`Loaded "${profileName(selected[0])}" into the form. Save it, then repeat for the remaining ${selected.length - 1} profile(s).`);
    });

    const importAllBtn = document.createElement("button");
    importAllBtn.className = "ui-btn";
    importAllBtn.style.cssText = "margin:0;";
    importAllBtn.textContent = "Import All Selected";
    importAllBtn.addEventListener("click", () => {
      const selected = importedProfiles.filter((_, idx) => checkboxes[idx].checked);
      if (selected.length === 0) { alert("Please select at least one profile."); return; }
      window.StudderStorage.getProfiles((existing) => {
        let added = 0, updated = 0;
        const list = [...existing];
        selected.forEach((p) => {
          const matchIdx = p.id ? list.findIndex((x) => x.id === p.id) : -1;
          if (matchIdx > -1) { list[matchIdx] = Object.assign({}, list[matchIdx], p); updated++; }
          else { list.push(Object.assign({ id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2,8) }, p)); added++; }
        });
        window.StudderStorage.saveProfiles(list, () => {
          overlay.remove();
          alert(`Done! Added ${added}, updated ${updated} profile(s).`);
          refresh();
        });
      });
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ui-btn";
    cancelBtn.style.cssText = "margin:0;";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => overlay.remove());

    btnRow.appendChild(loadBtn);
    btnRow.appendChild(importAllBtn);
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ---- EXPORT & IMPORT BUTTONS ----
  const exportBtn = document.getElementById("export-profiles-btn");
  const importBtn = document.getElementById("import-profiles-btn");
  const importInput = document.getElementById("import-profiles-input");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      window.StudderStorage.getProfiles((profiles) => {
        const checked = Array.from(document.querySelectorAll(".profile-export-checkbox:checked")).map((cb) => cb.dataset.id);
        const toExport = checked.length > 0 ? profiles.filter((p) => checked.includes(p.id)) : [];
        if (toExport.length === 0) {
          alert("Please check at least one profile to export.");
          return;
        }
        const jsonStr = JSON.stringify(toExport, null, 2);
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
    importBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!Array.isArray(imported)) { alert("Invalid backup file: Must be a JSON array of profiles."); return; }
          const valid = imported.filter((p) => p && typeof p === "object" && (p.firstName || p.lastName || p.fullName));
          if (valid.length === 0) { alert("No valid profiles found in backup file."); return; }
          importInput.value = "";
          showImportPicker(valid);
        } catch (err) {
          alert("Error parsing backup file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  refresh();
});
