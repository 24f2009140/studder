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

    window.StudderStorage.addProfile(data, () => {
      formSection.style.display = "none";
      doneSection.style.display = "block";
    });
  });

  addAnotherBtn.addEventListener("click", () => {
    form.reset();
    phoneCountrySelect.value = "+91";
    doneSection.style.display = "none";
    formSection.style.display = "block";
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
