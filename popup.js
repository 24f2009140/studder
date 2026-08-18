document.addEventListener("DOMContentLoaded", () => {
  const countEl = document.getElementById("profile-count");
  const listEl = document.getElementById("profile-list");
  const fillBtn = document.getElementById("fill-btn");
  const manageBtn = document.getElementById("manage-btn");

  function render(profiles) {
    if (profiles.length === 0) {
      countEl.textContent = "No profiles saved yet.";
      fillBtn.disabled = true;
    } else {
      countEl.textContent = `${profiles.length} profile${profiles.length === 1 ? "" : "s"} saved.`;
      fillBtn.disabled = false;
    }

    listEl.innerHTML = "";
    profiles.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unnamed profile";
      listEl.appendChild(li);
    });
  }

  window.StudderStorage.getProfiles(render);

  fillBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TRIGGER_AUTOFILL_FROM_POPUP" });
    window.close();
  });

  manageBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
