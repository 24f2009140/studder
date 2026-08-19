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
});
