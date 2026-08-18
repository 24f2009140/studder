(function (root) {
  const STORAGE_KEY = "studder_profiles";

  const DIAL_CODES = [
    { code: "+1", label: "United States / Canada (+1)" },
    { code: "+7", label: "Russia / Kazakhstan (+7)" },
    { code: "+20", label: "Egypt (+20)" },
    { code: "+27", label: "South Africa (+27)" },
    { code: "+30", label: "Greece (+30)" },
    { code: "+31", label: "Netherlands (+31)" },
    { code: "+32", label: "Belgium (+32)" },
    { code: "+33", label: "France (+33)" },
    { code: "+34", label: "Spain (+34)" },
    { code: "+39", label: "Italy (+39)" },
    { code: "+40", label: "Romania (+40)" },
    { code: "+41", label: "Switzerland (+41)" },
    { code: "+44", label: "United Kingdom (+44)" },
    { code: "+49", label: "Germany (+49)" },
    { code: "+52", label: "Mexico (+52)" },
    { code: "+55", label: "Brazil (+55)" },
    { code: "+61", label: "Australia (+61)" },
    { code: "+62", label: "Indonesia (+62)" },
    { code: "+63", label: "Philippines (+63)" },
    { code: "+64", label: "New Zealand (+64)" },
    { code: "+65", label: "Singapore (+65)" },
    { code: "+66", label: "Thailand (+66)" },
    { code: "+81", label: "Japan (+81)" },
    { code: "+82", label: "South Korea (+82)" },
    { code: "+86", label: "China (+86)" },
    { code: "+90", label: "Turkey (+90)" },
    { code: "+91", label: "India (+91)" },
    { code: "+92", label: "Pakistan (+92)" },
    { code: "+94", label: "Sri Lanka (+94)" },
    { code: "+971", label: "United Arab Emirates (+971)" },
    { code: "+974", label: "Qatar (+974)" },
    { code: "+966", label: "Saudi Arabia (+966)" },
  ];

  function getProfiles(callback) {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      callback(result[STORAGE_KEY] || []);
    });
  }

  function saveProfiles(profiles, callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: profiles }, () => {
      if (callback) callback(profiles);
    });
  }

  function addProfile(profile, callback) {
    getProfiles((profiles) => {
      const newProfile = Object.assign(
        { id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) },
        profile
      );
      profiles.push(newProfile);
      saveProfiles(profiles, () => {
        if (callback) callback(newProfile);
      });
    });
  }

  function updateProfile(id, updatedFields, callback) {
    getProfiles((profiles) => {
      const idx = profiles.findIndex((p) => p.id === id);
      if (idx > -1) {
        profiles[idx] = Object.assign({}, profiles[idx], updatedFields, { id });
      }
      saveProfiles(profiles, () => {
        if (callback) callback(profiles);
      });
    });
  }

  function deleteProfile(id, callback) {
    getProfiles((profiles) => {
      const filtered = profiles.filter((p) => p.id !== id);
      saveProfiles(filtered, () => {
        if (callback) callback(filtered);
      });
    });
  }

  root.StudderStorage = {
    STORAGE_KEY,
    DIAL_CODES,
    getProfiles,
    saveProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
  };
})(typeof window !== "undefined" ? window : self);
