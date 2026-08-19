(function () {
  if (window.__STUDDER_CONTENT_LOADED__) return;
  window.__STUDDER_CONTENT_LOADED__ = true;

  const OVERLAY_ID = "studder-overlay-root";
  const CUSTOM_FIELD_MAPPINGS_KEY = "studder_custom_field_mappings";

  const PROFILE_FIELD_OPTIONS = [
    { key: "firstName", label: "First name" },
    { key: "middleName", label: "Middle name" },
    { key: "lastName", label: "Last name" },
    { key: "fullName", label: "Full name" },
    { key: "gender", label: "Gender" },
    { key: "email", label: "Email" },
    { key: "alternateEmail", label: "Alternate email" },
    { key: "phone", label: "Phone" },
    { key: "alternatePhone", label: "Alternate phone" },
    { key: "dateOfBirth", label: "Date of birth" },
    { key: "doorNumber", label: "Address Line 1" },
    { key: "area", label: "Address Line 2" },
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
    "additional-name": "middleName",
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
    {
      field: "sublocality",
      patterns: ["sublocality", "sub locality", "sub-locality", "sub_locality"],
    },
    {
      field: "localityField",
      patterns: ["locality"],
    },
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
        "area", "street name", "streetname", "road name",
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
        "second phone", "phone 2", "second number", "secondary phone", "phone2", "mobile2", "mobile 2"
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
    { field: "middleName", patterns: ["mname", "middle_name", "middle-name", "middlename", "middle name"] },
    { field: "lastName", patterns: ["lname", "last_name", "last-name", "lastname", "familyname", "family-name", "surname"] },
    { field: "email", patterns: ["email", "e-mail"] },
    { field: "phone", patterns: ["phone", "telephone", "mobile", "cell", "contact-number", "contactnumber", "first phone", "phone 1", "first number", "phone1", "mobile1", "mobile 1"] },
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
    {
      field: "company",
      patterns: [
        "company", "organization", "organisation", "employer", "business",
        "school", "university", "org", "institution", "workplace"
      ]
    },
    {
      field: "relativeName",
      patterns: [
        "father", "mother", "guardian", "spouse", "parent", "husband", "wife",
        "emergency contact", "referee", "reference", "nominee", "friend", "contact name", "contactperson"
      ]
    },
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

  function findCustomMapping(signature) {
    if (!signature) return null;
    const normalized = normalizeForMatch(signature);
    const candidates = customFieldMappings.filter(
      (mapping) => mapping && mapping.pattern && normalized.includes(mapping.pattern)
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.pattern.length - a.pattern.length);
    const best = candidates[0];
    if (!best.mode) return { mode: "map", fieldKey: best.fieldKey, pattern: best.pattern };
    return best;
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
      if (entry.displayName.toLowerCase().includes("unknown field")) continue;
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

  function areValuesEquivalent(a, b, el) {
    if (el && el.tagName === "SELECT") {
      const option = el.options[el.selectedIndex];
      if (option) {
        const optVal = normalize(option.value);
        const optText = normalize(option.textContent);
        const target = normalize(b);
        return optVal === target || optText === target || optText.includes(target);
      }
    }
    if (el && el.type === "radio") {
      const radios = el.name && el.form
        ? Array.from(el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
        : [el];
      const checked = radios.find((r) => r.checked);
      if (checked) {
        const optVal = normalize(checked.value);
        const optText = normalize(getAssociatedLabelText(checked));
        const target = normalize(b);
        const targetGender = normalizeGender(target);
        return (
          optVal === target ||
          optText === target ||
          optText.includes(target) ||
          normalizeGender(optVal) === targetGender ||
          normalizeGender(optText) === targetGender
        );
      }
    }
    if (el && el.type === "checkbox") {
      const isTargetTrue = ["true", "yes", "checked", "1", "on"].includes(normalize(b));
      return el.checked === isTargetTrue;
    }
    const left = normalize((a || "").toString().replace(/\s+/g, " "));
    const right = normalize((b || "").toString().replace(/\s+/g, " "));
    return left === right;
  }

  function getCurrentFieldValue(el) {
    if (!el) return "";

    if (el.type === "radio") {
      if (!el.form || !el.name) {
        return el.checked ? (getAssociatedLabelText(el) || el.value || "") : "";
      }
      const radios = Array.from(el.form.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`));
      const checked = radios.find((radio) => radio.checked);
      if (!checked) return "";
      return getAssociatedLabelText(checked) || checked.value || "";
    }

    if (el.type === "checkbox") {
      return el.checked ? "Checked" : "Unchecked";
    }

    if (el.tagName === "SELECT") {
      const option = el.options[el.selectedIndex];
      if (!option) return "";
      return (option.textContent || option.value || "").trim();
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

    if (el.tagName === "SELECT") {
      if (el.selectedIndex < 0) return true;
      const option = el.options[el.selectedIndex];
      if (!option) return true;
      const val = (option.value || "").trim();
      const text = (option.textContent || "").trim();
      if (!val) return true;
      if (el.selectedIndex === 0) {
        const normText = text.toLowerCase();
        if (
          normText.includes("select") ||
          normText.includes("choose") ||
          normText.includes("placeholder") ||
          normText.includes("none") ||
          normText.includes("--")
        ) {
          return true;
        }
      }
      return false;
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
    const nameAttr = normalize(el.name);
    const idAttr = normalize(el.id);
    const labelText = normalize(getAssociatedLabelText(el));
    const placeholderText = normalize(el.getAttribute("placeholder"));
    
    if (nameAttr === "name" || idAttr === "name" || labelText === "name" || placeholderText === "name" ||
        nameAttr === "fullname" || idAttr === "fullname" || labelText === "fullname" || placeholderText === "fullname") {
      return "fullName";
    }

    const autocomplete = normalize(el.getAttribute("autocomplete")).split(" ").pop();
    if (autocomplete && AUTOCOMPLETE_MAP[autocomplete]) {
      return AUTOCOMPLETE_MAP[autocomplete];
    }

    const type = normalize(el.type);
    const signature = buildSignature(el);

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

  function isSecurityOrPasswordElement(el) {
    if (el.type === "password") return true;
    const signature = buildSignature(el);
    const securityKeywords = [
      "password", "confirm password", "confirm-password", "confirmpassword",
      "passwd", "passphrase", "pass", "pwd", "captcha", "recaptcha", 
      "otp", "one-time-password", "one time password", "verification code", 
      "verification-code", "verificationcode", "security code", "securitycode", 
      "security-code", "cvv", "cvc", "card number", "cardnumber", "card-number",
      "ccnum", "credit card", "creditcard", "credit-card"
    ];
    return securityKeywords.some((kw) => signature.includes(kw));
  }

  function isTermsOrNewsletterCheckbox(el) {
    if (el.type !== "checkbox") return false;
    const signature = buildSignature(el);
    const keywords = [
      "agree", "terms", "condition", "policy", "accept", "consent",
      "subscribe", "newsletter", "privacy", "rules", "t&c", "tcs", "tca",
      "i read", "i have read", "read the", "read and", "understand and"
    ];
    return keywords.some((kw) => signature.includes(kw));
  }

  function isFillableElement(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "reset") return false;
    
    // Ignore security and password elements
    if (isSecurityOrPasswordElement(el)) return false;

    // Ignore terms and conditions / newsletter checkboxes
    if (el.type === "checkbox" && isTermsOrNewsletterCheckbox(el)) return false;

    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      el.offsetWidth === 0 ||
      el.offsetHeight === 0
    ) {
      return false;
    }
    
    return true;
  }

  function scanFields() {
    const candidates = Array.from(document.querySelectorAll("input, textarea, select"));
    const detected = [];
    const unmatched = [];
    for (const el of candidates) {
      if (!isFillableElement(el)) continue;
      const signature = buildSignature(el);
      const custom = findCustomMapping(signature);

      if (custom && custom.mode === "value") {
        detected.push({
          el,
          fieldKey: "customValue",
          customValue: custom.value || "",
          displayName: getFieldDisplayName(el, "custom value"),
        });
        continue;
      }

      const fieldKey = custom && custom.fieldKey ? custom.fieldKey : detectFieldType(el);
      if (fieldKey) {
        detected.push({ el, fieldKey, displayName: getFieldDisplayName(el, fieldKey) });
      } else {
        unmatched.push({ el, displayName: getFieldDisplayName(el) });
      }
    }

    const addressFields = detected.filter(
      (f) => ["address", "doorNumber", "area", "sublocality", "localityField"].includes(f.fieldKey)
    );
    if (addressFields.length === 1) {
      addressFields[0].fieldKey = "address";
    }

    const nameFields = detected.filter(
      (f) => ["firstName", "lastName", "fullName"].includes(f.fieldKey)
    );
    if (nameFields.length === 1) {
      nameFields[0].fieldKey = "fullName";
    }

    const phoneFields = detected.filter((f) => f.fieldKey === "phone");
    if (phoneFields.length > 1) {
      const nonConfirmPhoneFields = phoneFields.filter((f) => {
        const sig = buildSignature(f.el);
        return !sig.includes("confirm") && !sig.includes("re-enter") && !sig.includes("reenter") && !sig.includes("verify");
      });
      if (nonConfirmPhoneFields.length > 1) {
        nonConfirmPhoneFields[1].fieldKey = "alternatePhone";
        nonConfirmPhoneFields[1].displayName = getFieldDisplayName(nonConfirmPhoneFields[1].el, "alternatePhone");
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

  function getResolvedFullName(profile) {
    if (profile.fullName) return profile.fullName;
    const first = (profile.firstName || "").trim();
    const middle = (profile.middleName || "").trim();
    const last = (profile.lastName || "").trim();
    if (!first && !middle && !last) return "";
    if ((profile.fullNameOrder || "").toLowerCase() === "last_first") {
      return [last, first, middle].filter(Boolean).join(" ");
    }
    return [first, middle, last].filter(Boolean).join(" ");
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

  function resolveValue(fieldKey, profile, el, context) {
    if (fieldKey === "customValue") {
      return context && typeof context.customValue === "string" ? context.customValue : "";
    }

    switch (fieldKey) {
      case "fullName":
        return getResolvedFullName(profile);
      case "address":
        return buildFullAddress(profile) || profile.address || "";
      case "sublocality":
        return profile.area || "";
      case "localityField":
        if (context && context.hasSublocalityField) return profile.landmark || "";
        return profile.area || profile.landmark || "";
      case "phone":
        if (el && (el.maxLength === 10 || el.getAttribute("maxlength") === "10")) {
          return (profile.phone || "").trim();
        }
        return getCombinedPhone(profile) || profile.phone || "";
      case "phoneCountry":
        return "";
      case "alternateEmail":
        return profile.alternateEmail || profile.email || "";
      case "alternatePhone":
        if (el && (el.maxLength === 10 || el.getAttribute("maxlength") === "10")) {
          return (profile.alternatePhone || "").trim();
        }
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
    const hasSublocalityField = detectedFields.some((f) => f.fieldKey === "sublocality");

    function pushUnfilledEntry(el, displayName, fieldKey) {
      unfilledEntries.push({
        el,
        displayName: displayName || fieldKey || "unknown field",
        fieldKey: fieldKey || null,
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

      if (el.type === "checkbox") {
        const targetState = ["true", "yes", "checked", "1", "on"].includes(normalize(value));
        if (el.checked !== targetState) {
          el.checked = targetState;
          el.dispatchEvent(new Event("click", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        filledCount++;
        return;
      }

      setNativeValue(el, value);
      filledCount++;
    }

    for (const { el, fieldKey, displayName, customValue } of detectedFields) {
      const value = resolveValue(fieldKey, profile, el, { hasSublocalityField, customValue });
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

        if (currentValue && !areValuesEquivalent(currentValue, value, el)) {
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

      const currentValue = getCurrentFieldValue(el);
      const fillStep = { el, fieldKey, displayName, value };

      if (currentValue && !isElementEmpty(el)) {
        if (!areValuesEquivalent(currentValue, value, el)) {
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
      .map((entry) => {
        return `
          <li class="studder-unfilled-item" style="margin-bottom: 6px;">
            <span class="studder-unfilled-name">${escapeHtml(entry.displayName)}</span>
          </li>
        `;
      })
      .join("");

    const total = filledCount + uniqueUnfilled.length;
    const percent = total > 0 ? Math.round((filledCount / total) * 100) : 0;

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";
    root.innerHTML = `
      <div class="studder-panel">
        <p class="studder-title">Autofill Report</p>
        
        <div class="studder-circular-progress" style="--percent: ${percent}">
          <svg class="studder-progress-svg" viewBox="0 0 100 100">
            <circle class="studder-progress-bg" cx="50" cy="50" r="40"></circle>
            <circle class="studder-progress-bar" cx="50" cy="50" r="40"></circle>
          </svg>
          <span class="studder-progress-text">${percent}%</span>
        </div>

        <p class="studder-message" style="text-align: center; margin-bottom: 12px;">
          Filled: <strong>${filledCount}</strong> | Unfilled: <strong>${uniqueUnfilled.length}</strong>
        </p>

        <p class="studder-section-title" style="font-size: 13px; font-weight: 600; margin: 12px 0 6px 0;">Unfilled Fields</p>
        <ul class="studder-unfilled-list" style="margin-left: 0; padding-left: 16px; list-style-type: disc;">${listItems}</ul>
        
        <button type="button" class="studder-btn studder-btn-secondary" data-action="close">Close</button>
      </div>
    `;

    document.documentElement.appendChild(root);

    root.querySelector('[data-action="close"]').addEventListener("click", removeOverlay);
    root.addEventListener("click", (e) => {
      if (e.target === root) removeOverlay();
    });
  }

  function showProfileSelector(profiles, detectedFields, unmatchedFields, totalSlots) {
    removeOverlay();

    const root = document.createElement("div");
    root.id = OVERLAY_ID;
    root.className = "studder-overlay";

    const listItems = profiles
      .map(
        (p) => {
          const base = p.fullName || [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "Unnamed profile";
          const displayName = p.nickname ? `${base} (${p.nickname})` : base;
          return `<li><button type="button" class="studder-profile-btn" data-id="${p.id}">${escapeHtml(
            displayName
          )}</button></li>`;
        }
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

            if (window.StudderStorage && typeof window.StudderStorage.recordFillStats === "function") {
              window.StudderStorage.recordFillStats(result.filledCount, totalSlots || 0);
            }

            const unmatchedUnfilled = unmatchedFields
              .filter(({ el }) => isElementEmpty(el))
              .map(({ el, displayName }) => ({ el, displayName, fieldKey: null }));
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
      const totalSlots = detectedFields.length + unmatchedFields.length;

      if (detectedFields.length === 0 && unmatchedFields.length === 0) {
        showMessage("No fillable fields detected.");
        return;
      }

      window.StudderStorage.getProfiles((profiles) => {
        if (!profiles || profiles.length === 0) {
          showMessage("No saved profiles yet. Open the extension popup to create one.");
          return;
        }
        showProfileSelector(profiles, detectedFields, unmatchedFields, totalSlots);
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
    } else if (message && message.type === "TRIGGER_RESET") {
      try {
        resetFillableFields();
        showMessage("Form has been reset.");
      } catch (err) {
        console.error("Studder error:", err);
      }
    }
  });
})();
