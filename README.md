# Studder

No more stuttering through forms.

A minimal Chrome/Chromium (Manifest V3) extension that autofills web forms
from profiles stored only on your own machine. No backend, no database, no
account system, no network requests of any kind.

## Loading the extension (Load unpacked)

1. Open `chrome://extensions` in Chrome (or the equivalent page in another
   Chromium browser, e.g. `edge://extensions` in Edge).
2. Turn on Developer mode (toggle, usually top right).
3. Click Load unpacked.
4. Select this `studder/` folder (the one containing `manifest.json`).
5. The extension installs and automatically opens a new tab for onboarding.
6. Fill in your first profile and click Save profile.

To change the keyboard shortcut, go to `chrome://extensions/shortcuts` and
edit the shortcut for "Open profile selector and autofill the current form"
(default is `Ctrl+Shift+F`, or `Command+Shift+F` on macOS).

## Using it

1. Browse to any website with a form.
2. Press `Ctrl+Shift+F`, or click the extension icon and use "Fill current
   page."
3. A small "Select Profile" overlay appears on the page.
4. Click a profile. Only the fields the page actually has get filled.
5. Fields you've already typed into are left alone.

To add, edit, or delete profiles later, click the extension icon, then
"Add / edit profiles" (this opens the options page), or right click the
icon and choose Options.

## How it works

| Piece | Role |
|---|---|
| `manifest.json` | Declares permissions, the content script, the background service worker, the popup, the options page, and the `Ctrl+Shift+F` command. |
| `storage.js` | Wrapper around `chrome.storage.local` (get/add/update/delete profiles), plus the shared list of dial codes for the phone country dropdown. |
| `background.js` | Opens the onboarding tab on first install, listens for the keyboard shortcut, and forwards a `TRIGGER_AUTOFILL` message to the active tab's content script. Never touches profile data or the network. |
| `content.js` | Injected into every page. Scans `input`, `textarea`, and `select` elements, maps each one to a profile field, shows the profile-selection overlay, and fills only the matched, currently empty fields. |
| `styles.css` | Styling for the on-page overlay. |
| `popup.html` / `popup.js` | Click-the-icon popup, shows how many profiles exist, a "Fill current page" button, and a link to the full profile manager. |
| `options.html` / `options.js` | Full profile manager: add, edit, delete, view. |
| `onboarding.html` / `onboarding.js` | First run page opened automatically on install. |
| `ui.css` | Shared styling for the popup, options, and onboarding pages. |

### Field detection

For each form element, `content.js` builds a signature from its `name`,
`id`, `placeholder`, and associated label text, and checks it against a
keyword table (`fname`, `first_name`, `given-name` all map to `firstName`,
for example). The `autocomplete` attribute is checked first when present,
since it's the most reliable signal. Rules are checked most specific first,
so "Door Number" is matched before the generic "Address" rule instead of
being swallowed by it.

### Address, alternates, phone country, and date of birth

* Address is split into `doorNumber` (door/house/building/flat number),
  `area` (locality/street), and `landmark`, plus the existing
  `city`/`state`/`country`/`zip`. If a page has a single generic "Address"
  field instead, it gets filled with those three joined together.
* `alternateEmail` and `alternatePhone` only fill fields explicitly labeled
  alternate/secondary/alt email or phone. If you haven't set an alternate
  value, the primary one is used instead. A plain single "Email" or "Phone"
  field is always filled with the primary value.
* Phone country is picked from a dropdown (`+91`, `+1`, and so on) rather
  than typed, and sits before the phone number field in the profile form.
  It fills matching country-code dropdowns or dial-code fields on target
  sites.
* Date of birth is entered as three separate fields, day, then month, then
  year, so it's always `dd/mm/yyyy` no matter what browser or locale you're
  on. When filling a real `input type="date"` on a target site, that value
  is converted to the ISO format the native picker expects. Plain text
  fields get `dd/mm/yyyy` directly.

### Privacy

Profiles live under one key in `chrome.storage.local`, local to this
browser and device. There is no `fetch` or `XMLHttpRequest` anywhere in the
code, nothing that could send form or profile data off the device. The
content script only reads and writes the DOM of the current tab and reads
profiles from local storage.

### Error handling

* No fields detected on the page: overlay shows "No fillable fields
  detected."
* No profiles saved yet: overlay prompts you to create one.
* Shortcut pressed on a restricted page (`chrome://`, the Web Store, etc.):
  the background script silently ignores it, since Chrome doesn't allow
  content scripts there.
* Any unexpected DOM error during scanning or filling is caught so the
  page itself is never broken.

## Extending it

* Add more fields: extend the inputs in `options.html` / `onboarding.html`,
  add the field id to `FIELD_IDS` in the matching `.js` file, and add a
  keyword rule in `content.js`.
* Add more keyword synonyms: edit `KEYWORD_RULES` / `AUTOCOMPLETE_MAP` in
  `content.js`.
* Add more dial codes: edit `DIAL_CODES` in `storage.js`.
