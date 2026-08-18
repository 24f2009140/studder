(function () {
  if (window.__STUDDER_CONTENT_LOADED__) return;
  window.__STUDDER_CONTENT_LOADED__ = true;

  const OVERLAY_ID = "studder-overlay-root";
  const CUSTOM_FIELD_MAPPINGS_KEY = "studder_custom_field_mappings";

  const PROFILE_FIELD_OPTIONS = [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "fullName", label: "Full name" },
    { key: "gender", label: "Gender" },
    { key: "email", label: "Email" },
    { key: "alternateEmail", label: "Alternate email" },
    { key: "phone", label: "Phone" },
    { key: "alternatePhone", label: "Alternate phone" },
    { key: "dateOfBirth", label: "Date of birth" },
    { key: "doorNumber", label: "Door / house number" },
    { key: "area", label: "Area / street" },
    { key: "landmark", label: "Landmark" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "zip", label: "ZIP / PIN" },
    { key: "address", label: "Full address" },
  ];

  let customFieldMappings = [];

  const AUTOCOMPLETE_MAP = {
    "given-name": "firstName",
    "additional-name": "firstName",
    "family-name": "lastName",
    name: "fullName",
    email: "email",
    tel: "phone",
    "tel-national": "phone",
    "tel-country-code": "phoneCountry",
    sex: "gender",
    bday: "dateOfBirth",
    "address-line1": "doorNumber",
    "address-line2": "area",
    "street-address": "address",
    "address-level2": "city",
    "address-level1": "state",
    country: "country",
    "country-name": "country",
    "postal-code": "zip",
  };

  const KEYWORD_RULES = [
    { field: "landmark", patterns: ["landmark", "near "] },
    {
      field: "doorNumber",
      patterns: [
        "door no", "doorno", "door-no", "door_no",
        "house no", "houseno", "house-no", "house_no",
        "flat no", "flatno", "apartment", "apt no", "aptno",
        "building name", "building no", "block no",
        "address1", "address-line1", "addressline1", "address line 1",
      ],
    },
    {
      field: "area",
      patterns: [
        "area", "locality", "street name", "streetname", "road name",
        "address2", "address-line2", "addressline2", "address line 2",
      ],
    },
    {
      field: "alternateEmail",
      patterns: ["alternate email", "alt email", "alternate-email", "alt-email", "secondary email", "secondary-email", "backup email"],
    },
    {
      field: "alternatePhone",
      patterns: [
        "alternate phone", "alt phone", "alternate-phone", "alt-phone",
        "secondary phone", "secondary-phone",
        "alternate mobile", "alt mobile", "alternate-mobile", "alt-mobile",
        "backup phone", "backup mobile",
      ],
    },
    {
      field: "phoneCountry",
      patterns: [
        "country code", "countrycode", "country-code",
        "isd code", "isdcode", "std code", "stdcode",
        "dial code", "dialcode", "phone country", "phone-country",
      ],
    },
    { field: "gender", patterns: ["gender", "sex"] },
    { field: "firstName", patterns: ["fname", "first_name", "first-name", "firstname", "givenname", "given-name"] },
    { field: "lastName", patterns: ["lname", "last_name", "last-name", "lastname", "familyname", "family-name", "surname"] },
    { field: "email", patterns: ["email", "e-mail"] },
    { field: "phone", patterns: ["phone", "telephone", "mobile", "cell", "contact-number", "contactnumber"] },
    {
      field: "dateOfBirth",
      patterns: [
        "dob",
        "date of birth",
        "date-of-birth",
        "date_of_birth",
        "birth date",
        "birthdate",
        "birthday",
        "dob day",
        "dob month",
        "dob year",
        "birth day",
        "birth month",
        "birth year",
        "ddmmyyyy",
        "mmddyyyy",
        "yyyymmdd",
      ],
    },
    { field: "zip", patterns: ["zip", "pin", "postal", "postcode", "post-code", "pincode"] },
    { field: "city", patterns: ["city", "town"] },
    { field: "state", patterns: ["state", "province", "region"] },
    { field: "country", patterns: ["country", "nation"] },
    { field: "address", patterns: ["address", "street", "addr"] },
    { field: "fullName", patterns: ["fullname", "full-name", "full_name", "yourname", "name"] },
  ];

  function normalize(str) {
    return (str || "").toString().toLowerCase().trim();
  }

  function normalizeForMatch(str) {
    return normalize(str).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function loadCustomFieldMappings(callback) {
    chrome.storage.local.get([CUSTOM_FIELD_MAPPINGS_KEY], (result) => {
      const mappings = result[CUSTOM_FIELD_MAPPINGS_KEY];
      customFieldMappings = Array.isArray(mappings) ? mappings : [];
      callback(customFieldMappings);
    });
  }

  function saveCustomFieldMappings(mappings, callback) {
    chrome.storage.local.set({ [CUSTOM_FIELD_MAPPINGS_KEY]: mappings }, () => {
      customFieldMappings = mappings;
      if (callback) callback();
    });
  }

  function getAssociatedLabelText(el) {
    if (el.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (byFor) return byFor.textContent;
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.textContent;

    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const ref = document.getElementById(labelledBy);
      if (ref) return ref.textContent;
    }
    return "";
  }

  function cleanLabelText(text) {
    return (text || "")
      .replace(/\*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getFieldDisplayName(el, fallbackKey) {
    const label = cleanLabelText(getAssociatedLabelText(el));
    if (label) return label;

    const placeholder = cleanLabelText(el.getAttribute("placeholder"));
    if (placeholder) return placeholder;

    const name = cleanLabelText(el.name);
    if (name) return name;

    const id = cleanLabelText(el.id);
    if (id) return id;

    return fallbackKey || "unknown field";
  }

  function uniqueNames(names) {
    const seen = new Set();
    const result = [];
    for (const rawName of names) {
      const name = cleanLabelText(rawName);
      if (!name) continue;
      const key = normalize(name);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
    return result;
  }

  function uniqueUnfilledEntries(entries) {
    const seen = new Set();
    const result = [];
    for (const entry of entries) {
      if (!entry || !entry.displayName) continue;
      const key = normalize(entry.displayName);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(entry);
    }
    return result;
  }

  function getProfileFieldOptionsHtml() {
    const options = PROFILE_FIELD_OPTIONS.map((opt) => `<option value="${opt.key}">${escapeHtml(opt.label)}</option>`).join("");
    return `<option value="">Choose field...</option>${options}`;
  }

  function getMappingPatternForEntry(entry) {
    if (!entry || !entry.el) return "";
    const pieces = [
      entry.displayName,
      entry.el.name,
      entry.el.id,
      entry.el.getAttribute("placeholder"),
    ].filter(Boolean);

    const best = pieces[0] || "";
    return normalizeForMatch(best);
  }

  function areValuesEquivalent(a, b) {
    const left = normalize((a || "").toString().replace(/\s+/g, " "));
    const right = normalize((b || "").toString().replace(/\s+/g, " "));
    return left === right;
  }

  function getCurrentFieldValue(el) {
    if (!el) return "";

    if (el.type === "radio") {
      if (!el.form || !el.name) return el.checked ? (el.value || "") : "";
      const radios = Array.from(el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`));
      const checked = radios.find((radio) => radio.checked);
      if (!checked) return "";
      return checked.value || getAssociatedLabelText(checked) || "";
    }

    if (el.tagName === "SELECT") {
      const option = el.options[el.selectedIndex];
      if (!option) return "";
      return option.textContent || option.value || "";
    }

    return (el.value || "").toString();
  }

  function previewValue(value) {
    const text = (value || "").toString().trim();
    if (!text) return "(empty)";
    if (text.length <= 80) return text;
    return `${text.slice(0, 77)}...`;
  }

  function isElementEmpty(el) {
    if (!el) return true;

    if (el.type === "radio") {
      if (el.form && el.name) {
        const group = el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
        return !Array.from(group).some((radio) => radio.checked);
      }
      return !el.checked;
    }

    if (el.type === "checkbox") {
      return !el.checked;
    }

    return !((el.value || "").toString().trim());
  }

  function resetFillableFields() {
    const fields = Array.from(document.querySelectorAll("input, textarea, select"));

    for (const el of fields) {
      if (!isFillableElement(el)) continue;

      if (el.type === "radio" || el.type === "checkbox") {
        if (el.checked) {
          el.checked = false;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        continue;
      }

      if (el.tagName === "SELECT") {
        if (el.selectedIndex !== 0) {
          el.selectedIndex = 0;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        continue;
      }

      if (el.value) {
        setNativeValue(el, "");
      }
    }
  }

  function buildSignature(el) {
    const parts = [el.name, el.id, el.getAttribute("placeholder"), getAssociatedLabelText(el)];
    return normalize(parts.join(" "));
  }

  function detectFieldType(el) {
    const signature = buildSignature(el);
    const autocomplete = normalize(el.getAttribute("autocomplete")).split(" ").pop();
    if (autocomplete && AUTOCOMPLETE_MAP[autocomplete]) {
      return AUTOCOMPLETE_MAP[autocomplete];
    }

    const type = normalize(el.type);
    const normalizedSignature = normalizeForMatch(signature);

    const customMatch = customFieldMappings.find(
      (mapping) => mapping && mapping.pattern && mapping.fieldKey && normalizedSignature.includes(mapping.pattern)
    );
    if (customMatch) return customMatch.fieldKey;

    for (const rule of KEYWORD_RULES) {
      if (rule.patterns.some((p) => signature.includes(p))) {
        return rule.field;
      }
    }

    if (type === "email") return "email";
    if (type === "tel") return "phone";
    if (type === "date" && signature.includes("birth")) return "dateOfBirth";

    if (type === "radio") {
      const radioHint = normalize([el.name, el.id, el.value, getAssociatedLabelText(el)].join(" "));
      if (radioHint.includes("gender") || radioHint.includes("sex") || radioHint.includes("male") || radioHint.includes("female")) {
        return "gender";
      }
    }

    return null;
  }

  function isFillableElement(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "reset") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  }

  function scanFields() {
    const candidates = Array.from(document.querySelectorAll("input, textarea, select"));
    const detected = [];
    const unmatched = [];
    for (const el of candidates) {
      if (!isFillableElement(el)) continue;
      const fieldKey = detectFieldType(el);
      if (fieldKey) {
        detected.push({ el, fieldKey, displayName: getFieldDisplayName(el, fieldKey) });
      } else {
        unmatched.push({ el, displayName: getFieldDisplayName(el) });
      }
    }
    return { detected, unmatched };
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillSelect(el, value) {
    const options = Array.from(el.options);
    const target = normalize(value);
    const match = options.find(
      (o) => normalize(o.value) === target || normalize(o.textContent) === target || normalize(o.textContent).includes(target)
    );
    if (match) {
      el.value = match.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  function dobToIso(ddmmyyyy) {
    const parts = parseDobParts(ddmmyyyy);
    if (!parts) return "";
    const { dd, mm, yyyy } = parts;
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseDobParts(rawDob) {
    const clean = (rawDob || "").trim();
    if (!clean) return null;

    let dd = "";
    let mm = "";
    let yyyy = "";

    const slashParts = clean.split(/[\/\-.]/).map((p) => p.trim()).filter(Boolean);
    if (slashParts.length === 3) {
      [dd, mm, yyyy] = slashParts;
    } else {
      const digits = clean.replace(/\D/g, "");
      if (digits.length === 8) {
        dd = digits.slice(0, 2);
        mm = digits.slice(2, 4);
        yyyy = digits.slice(4, 8);
      }
    }

    if (!dd || !mm || !yyyy) return null;
    return {
      dd: dd.padStart(2, "0"),
      mm: mm.padStart(2, "0"),
      yyyy,
    };
  }

  function resolveDob(profile, el) {
    const parts = parseDobParts(profile.dateOfBirth);
    if (!parts) return "";

    const signature = buildSignature(el);
    const placeholder = normalize(el.getAttribute("placeholder"));
    const patternHint = `${signature} ${placeholder}`;

    if (el.type === "date") return `${parts.yyyy}-${parts.mm}-${parts.dd}`;

    if (patternHint.includes("mmddyyyy") || patternHint.includes("mm/dd/yyyy") || patternHint.includes("mm-dd-yyyy")) {
      return `${parts.mm}${parts.dd}${parts.yyyy}`;
    }

    if (patternHint.includes("yyyymmdd") || patternHint.includes("yyyy/mm/dd") || patternHint.includes("yyyy-mm-dd")) {
      return `${parts.yyyy}${parts.mm}${parts.dd}`;
    }

    if (patternHint.includes("ddmmyyyy") || patternHint.includes("dd/mm/yyyy") || patternHint.includes("dd-mm-yyyy")) {
      return `${parts.dd}${parts.mm}${parts.yyyy}`;
    }

    if (patternHint.includes("birth day") || /\bday\b/.test(patternHint) || patternHint.includes("dob day")) {
      return parts.dd;
    }

    if (patternHint.includes("birth month") || /\bmonth\b/.test(patternHint) || patternHint.includes("dob month")) {
      return parts.mm;
    }

    if (patternHint.includes("birth year") || /\byear\b/.test(patternHint) || patternHint.includes("dob year")) {
      return parts.yyyy;
    }

    return `${parts.dd}${parts.mm}${parts.yyyy}`;
  }

  function buildFullAddress(profile) {
    const landmarkPart = profile.landmark ? `near ${profile.landmark}` : "";
    return [
      profile.doorNumber,
      profile.area,
      landmarkPart,
      profile.city,
      profile.state,
      profile.country,
      profile.zip,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getCombinedPhone(profile) {
    const phone = (profile.phone || "").trim();
    if (!phone) return "";
    const code = (profile.phoneCountry || "").trim();
    return code ? `${code} ${phone}`.trim() : phone;
  }

  function normalizeGender(value) {
    const g = normalize(value);
    if (g.startsWith("m")) return "male";
    if (g.startsWith("f")) return "female";
    return g;
  }

  function fillRadio(el, value) {
    if (!el || !el.form || !value) return false;

    const radios = el.name
      ? Array.from(el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
      : [el];

    const target = normalizeGender(value);
    const checked = radios.find((radio) => {
      const signature = normalize([
        radio.value,
        radio.id,
        radio.getAttribute("aria-label"),
        getAssociatedLabelText(radio),
      ].join(" "));
      const candidateGender = normalizeGender(signature);
      return (
        signature === normalize(value) ||
        signature.includes(normalize(value)) ||
        candidateGender === target
      );
    });

    if (!checked) return false;
    checked.checked = true;
    checked.dispatchEvent(new Event("input", { bubbles: true }));
    checked.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function resolveValue(fieldKey, profile, el) {
    switch (fieldKey) {
      case "address":
        return buildFullAddress(profile) || profile.address || "";
      case "phone":
        return getCombinedPhone(profile) || profile.phone || "";
      case "phoneCountry":
        return "";
      case "alternateEmail":
        return profile.alternateEmail || profile.email || "";
      case "alternatePhone":
        return profile.alternatePhone || profile.phone || "";
      case "dateOfBirth":
        return resolveDob(profile, el);
      default:
        return profile[fieldKey];
    }
  }

  function showConflictResolver(conflicts, onResolve, onCancel) {
    removeOverlay();

    const rows = conflicts
      .map((conflict, index) => {
        return `
          <li class="studder-conflict-item">
            <p class="studder-conflict-name">${escapeHtml(conflict.displayName)}</p>
            <div class="studder-conflict-compare">
              <div class="studder-conflict-col">
                <p class="studder-conflict-col-title">Current</p>
                <p class="studder-conflict-value">${escapeHtml(previewValue(conflict.currentValue))}</p>
                <label class="studder-choice-label">
                  <input type="radio" name="studder_conflict_${index}" value="keep" checked />
                  Keep current
                </label>
              </div>
              <div class="studder-conflict-col">
                <p class="studder-conflict-col-title">Autofill</p>
                <p class="studder-conflict-value">${escapeHtml(previewValue(conflict.nextValue))}</p>
                <label class="studder-choice-label">
                  <input type="radio" name="studder_conflict_${index}" value="overwrite" />
                  Use autofill
                </label>
              </div>
            </div>
          </li>
        `;
      })
      .join("");

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";
    root.innerHTML = `
      <div class="studder-panel studder-panel-wide">
        <p class="studder-title">Resolve Field Conflicts</p>
        <p class="studder-message">Some fields already had values. Choose what to keep for each one.</p>
        <ul class="studder-conflict-list">${rows}</ul>
        <div class="studder-actions-row">
          <button type="button" class="studder-btn" data-action="cancel">Cancel</button>
          <button type="button" class="studder-btn" data-action="continue">Continue</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(root);

    root.querySelector('[data-action="cancel"]').addEventListener("click", () => {
      removeOverlay();
      if (onCancel) onCancel();
    });

    root.querySelector('[data-action="continue"]').addEventListener("click", () => {
      const decisions = conflicts.map((_, index) => {
        const selected = root.querySelector(`input[name="studder_conflict_${index}"]:checked`);
        return selected && selected.value === "overwrite" ? "overwrite" : "keep";
      });
      removeOverlay();
      onResolve(decisions);
    });

    root.addEventListener("click", (e) => {
      if (e.target === root) {
        removeOverlay();
        if (onCancel) onCancel();
      }
    });
  }

  function applyProfileWithConflictResolution(detectedFields, profile, callback) {
    let filledCount = 0;
    const handledRadioGroups = new Set();
    const unfilledEntries = [];
    const conflicts = [];

    function pushUnfilledEntry(el, displayName, fieldKey) {
      unfilledEntries.push({
        el,
        displayName: displayName || fieldKey || "unknown field",
      });
    }

    function runFill(fillStep) {
      const { el, fieldKey, displayName, value } = fillStep;

      if (el.type === "radio") {
        const matched = fieldKey === "gender" ? fillRadio(el, value) : false;
        if (matched) {
          filledCount++;
        } else if (isElementEmpty(el)) {
          pushUnfilledEntry(el, displayName, fieldKey);
        }
        return;
      }

      if (el.tagName === "SELECT") {
        if (fillSelect(el, value)) {
          filledCount++;
        } else if (isElementEmpty(el)) {
          pushUnfilledEntry(el, displayName, fieldKey);
        }
        return;
      }

      setNativeValue(el, value);
      filledCount++;
    }

    for (const { el, fieldKey, displayName } of detectedFields) {
      const value = resolveValue(fieldKey, profile, el);
      if (value === undefined || value === null || value === "") {
        if (isElementEmpty(el)) pushUnfilledEntry(el, displayName, fieldKey);
        continue;
      }

      if (el.type === "radio") {
        const groupKey = el.name || el.id;
        if (groupKey && handledRadioGroups.has(groupKey)) continue;
        if (groupKey) handledRadioGroups.add(groupKey);

        const currentValue = getCurrentFieldValue(el);
        const fillStep = { el, fieldKey, displayName, value };

        if (currentValue && !areValuesEquivalent(currentValue, value)) {
          conflicts.push({
            ...fillStep,
            currentValue,
            nextValue: value,
          });
        } else if (!currentValue) {
          runFill(fillStep);
        }
        continue;
      }

      const currentValue = (el.value || "").toString().trim();
      const fillStep = { el, fieldKey, displayName, value };

      if (currentValue) {
        if (!areValuesEquivalent(currentValue, value)) {
          conflicts.push({
            ...fillStep,
            currentValue,
            nextValue: value,
          });
        }
        continue;
      }

      runFill(fillStep);
    }

    function finish() {
      callback({
        cancelled: false,
        filledCount,
        unfilledEntries: uniqueUnfilledEntries(unfilledEntries),
      });
    }

    if (conflicts.length === 0) {
      finish();
      return;
    }

    showConflictResolver(
      conflicts,
      (decisions) => {
        decisions.forEach((decision, index) => {
          if (decision !== "overwrite") return;
          runFill(conflicts[index]);
        });
        finish();
      },
      () => {
        callback({
          cancelled: true,
          filledCount,
          unfilledEntries: uniqueUnfilledEntries(unfilledEntries),
        });
      }
    );
  }

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function showMessage(text) {
    removeOverlay();
    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";
    root.innerHTML = `
      <div class="studder-panel">
        <p class="studder-message">${escapeHtml(text)}</p>
        <button type="button" class="studder-btn studder-btn-secondary" data-action="close">Close</button>
      </div>
    `;
    document.documentElement.appendChild(root);

    root.querySelector('[data-action="close"]').addEventListener("click", removeOverlay);
    root.addEventListener("click", (e) => {
      if (e.target === root) removeOverlay();
    });
  }

  function showUnfilledReport(filledCount, unfilledEntries, profile) {
    removeOverlay();

    const uniqueUnfilled = uniqueUnfilledEntries(unfilledEntries);
    const listItems = uniqueUnfilled
      .map((entry, index) => {
        return `
          <li class="studder-unfilled-item">
            <span class="studder-unfilled-name">${escapeHtml(entry.displayName)}</span>
            <select class="studder-unfilled-map-select" data-entry-index="${index}">
              ${getProfileFieldOptionsHtml()}
            </select>
          </li>
        `;
      })
      .join("");

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";
    root.innerHTML = `
      <div class="studder-panel">
        <p class="studder-title">Autofill Report</p>
        <p class="studder-message">Filled: ${filledCount}</p>
        <p class="studder-message">Unfilled: ${uniqueUnfilled.length}</p>
        <ul class="studder-unfilled-list">${listItems}</ul>
        <button type="button" class="studder-btn" data-action="apply-mappings">Save Mapping And Fill Selected</button>
        <button type="button" class="studder-btn" data-action="reset-form">Reset Form</button>
        <button type="button" class="studder-btn studder-btn-secondary" data-action="close">Close</button>
      </div>
    `;

    document.documentElement.appendChild(root);

    root.querySelector('[data-action="apply-mappings"]').addEventListener("click", () => {
      const selections = Array.from(root.querySelectorAll(".studder-unfilled-map-select"));
      const updates = [];
      let filledNow = 0;

      for (const select of selections) {
        const index = Number(select.getAttribute("data-entry-index"));
        const fieldKey = select.value;
        if (!fieldKey) continue;

        const entry = uniqueUnfilled[index];
        if (!entry || !entry.el) continue;

        const pattern = getMappingPatternForEntry(entry);
        if (pattern) updates.push({ pattern, fieldKey });

        const value = resolveValue(fieldKey, profile, entry.el);
        if (value === undefined || value === null || value === "") continue;

        if (entry.el.tagName === "SELECT") {
          if (fillSelect(entry.el, value)) filledNow++;
        } else if (entry.el.type === "radio") {
          if (fillRadio(entry.el, value)) filledNow++;
        } else {
          setNativeValue(entry.el, value);
          filledNow++;
        }
      }

      if (updates.length === 0) {
        showMessage("No mapping selected.");
        return;
      }

      const merged = [...customFieldMappings];
      updates.forEach((update) => {
        const existingIndex = merged.findIndex((m) => m.pattern === update.pattern);
        if (existingIndex >= 0) {
          merged[existingIndex] = update;
        } else {
          merged.push(update);
        }
      });

      saveCustomFieldMappings(merged, () => {
        const remaining = uniqueUnfilledEntries(uniqueUnfilled.filter((entry) => isElementEmpty(entry.el)));
        removeOverlay();
        if (remaining.length > 0) {
          showUnfilledReport(filledCount + filledNow, remaining, profile);
        } else {
          showMessage(`Mappings saved. Filled ${filledNow} additional field(s).`);
        }
      });
    });

    root.querySelector('[data-action="reset-form"]').addEventListener("click", () => {
      resetFillableFields();
      removeOverlay();
      showMessage("Form has been reset.");
    });

    root.querySelector('[data-action="close"]').addEventListener("click", removeOverlay);
    root.addEventListener("click", (e) => {
      if (e.target === root) removeOverlay();
    });
  }

  function showProfileSelector(profiles, detectedFields, unmatchedFields) {
    removeOverlay();

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";

    const listItems = profiles
      .map(
        (p) =>
          `<li><button type="button" class="studder-profile-btn" data-id="${p.id}">${escapeHtml(
            p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unnamed profile"
          )}</button></li>`
      )
      .join("");

    root.innerHTML = `
      <div class="studder-panel">
        <p class="studder-title">Select Profile</p>
        <ul class="studder-profile-list">${listItems}</ul>
        <button type="button" class="studder-btn studder-btn-secondary" data-action="cancel">Cancel</button>
      </div>
    `;

    document.documentElement.appendChild(root);

    root.querySelectorAll(".studder-profile-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const profile = profiles.find((p) => p.id === btn.dataset.id);
        removeOverlay();
        if (profile) {
          applyProfileWithConflictResolution(detectedFields, profile, (result) => {
            if (result.cancelled) {
              showMessage("Autofill cancelled.");
              return;
            }

            const unmatchedUnfilled = unmatchedFields
              .filter(({ el }) => isElementEmpty(el))
              .map(({ el, displayName }) => ({ el, displayName }));
            const allUnfilled = uniqueUnfilledEntries([...result.unfilledEntries, ...unmatchedUnfilled]);

            if (allUnfilled.length > 0) {
              showUnfilledReport(result.filledCount, allUnfilled, profile);
            } else if (result.filledCount === 0) {
              showMessage("No matching fields could be filled for this profile.");
            }
          });
        }
      });
    });

    root.querySelector('[data-action="cancel"]').addEventListener("click", removeOverlay);
    root.addEventListener("click", (e) => {
      if (e.target === root) removeOverlay();
    });

    document.addEventListener(
      "keydown",
      function escHandler(e) {
        if (e.key === "Escape") {
          removeOverlay();
          document.removeEventListener("keydown", escHandler);
        }
      },
      { once: true }
    );
  }

  function runAutofillFlow() {
    loadCustomFieldMappings(() => {
      const scanned = scanFields();
      const detectedFields = scanned.detected;
      const unmatchedFields = scanned.unmatched;

      if (detectedFields.length === 0 && unmatchedFields.length === 0) {
        showMessage("No fillable fields detected.");
        return;
      }

      window.StudderStorage.getProfiles((profiles) => {
        if (!profiles || profiles.length === 0) {
          showMessage("No saved profiles yet. Open the extension popup to create one.");
          return;
        }
        showProfileSelector(profiles, detectedFields, unmatchedFields);
      });
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "TRIGGER_AUTOFILL") {
      try {
        runAutofillFlow();
      } catch (err) {
        console.error("Studder error:", err);
        showMessage("Something went wrong scanning this page.");
      }
    }
  });
})();
