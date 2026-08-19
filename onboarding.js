document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("onboarding-form");
  const formSection = document.getElementById("form-section");
  const doneSection = document.getElementById("done-section");
  const addAnotherBtn = document.getElementById("add-another-btn");
  const openOptionsBtn = document.getElementById("open-options-btn");
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

  function getSelectedFullNameOrder() {
    const selected = document.querySelector('input[name="fullNameOrder"]:checked');
    return selected ? selected.value : "first_last";
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

    window.StudderStorage.addProfile(data, () => {
      formSection.style.display = "none";
      doneSection.style.display = "block";
    });
  });

  addAnotherBtn.addEventListener("click", () => {
    form.reset();
    const firstLast = document.getElementById("fullNameOrderFirstLast");
    if (firstLast) firstLast.checked = true;
    phoneCountrySelect.value = "+91";
    doneSection.style.display = "none";
    formSection.style.display = "block";
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // ---- IMPORT FROM BACKUP ----
  const importBackupBtn = document.getElementById("import-backup-btn");
  const importBackupInput = document.getElementById("import-backup-input");

  function loadProfileIntoForm(profile) {
    FIELD_IDS.forEach((key) => {
      if (key === "fullNameOrder") return;
      const el = document.getElementById(key);
      if (el) el.value = profile[key] || "";
    });
    const order = (profile.fullNameOrder || "first_last") === "last_first" ? "last_first" : "first_last";
    const orderEl = document.querySelector(`input[name="fullNameOrder"][value="${order}"]`);
    if (orderEl) orderEl.checked = true;
    const parts = (profile.dateOfBirth || "").split("/");
    dobDay.value = parts[0] || "";
    dobMonth.value = parts[1] || "";
    dobYear.value = parts[2] || "";
    form.scrollIntoView({ behavior: "smooth" });
  }

  function profileDisplayName(p) {
    const base = p.fullName || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "Unnamed";
    return p.nickname ? `${base} (${p.nickname})` : base;
  }

  function showOnboardingImportPicker(importedProfiles) {
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

    const checkboxes = [];
    importedProfiles.forEach((p, idx) => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee;cursor:pointer;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      checkboxes.push(cb);
      const nameSpan = document.createElement("span");
      nameSpan.style.cssText = "font-size:14px;";
      nameSpan.textContent = profileDisplayName(p);
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
      loadProfileIntoForm(selected[0]);
      if (selected.length > 1) alert(`Loaded "${profileDisplayName(selected[0])}" into the form. Save it, then import the others from the Options page.`);
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
          else { list.push(Object.assign({ id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) }, p)); added++; }
        });
        window.StudderStorage.saveProfiles(list, () => {
          overlay.remove();
          formSection.style.display = "none";
          doneSection.style.display = "block";
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

  if (importBackupBtn && importBackupInput) {
    importBackupBtn.addEventListener("click", () => importBackupInput.click());
    importBackupInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!Array.isArray(imported)) { alert("Invalid backup file: Must be a JSON array of profiles."); return; }
          const valid = imported.filter((p) => p && typeof p === "object" && (p.firstName || p.lastName || p.fullName));
          if (valid.length === 0) { alert("No valid profiles found in backup file."); return; }
          importBackupInput.value = "";
          showOnboardingImportPicker(valid);
        } catch (err) {
          alert("Error reading backup: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
});
