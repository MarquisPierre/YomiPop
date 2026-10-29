import { getSettings, saveSettings, type Trigger } from "../settings";

const options = document.querySelectorAll<HTMLInputElement>(
  'input[name="trigger"]',
);

// Saves the choice whenever an option is picked.
for (const option of options) {
  option.addEventListener("change", () =>
    saveSettings({ trigger: option.value as Trigger }),
  );
}

// Ticks the option that matches the saved setting.
getSettings().then((settings) => {
  for (const option of options)
    option.checked = option.value === settings.trigger;
});
