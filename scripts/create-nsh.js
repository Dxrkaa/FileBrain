/**
 * Generates build/installer.nsh before electron-builder runs.
 * This means the file never needs to exist in the downloaded project —
 * it is always created fresh as part of `npm run dist:win:*`.
 */

const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Write each line individually to avoid any JS escape confusion.
//
// IMPORTANT: IfSilent +7 skips exactly 6 NSIS instructions (blank lines are
// not counted).  The 6 instructions are:
//   1. RMDir $APPDATA\FileBrain
//   2. RMDir $LOCALAPPDATA\FileBrain
//   3. RMDir $PROFILE\.ollama\models
//   4. MessageBox (Ollama dialog)
//   5. IfFileExists (check for ollama uninstaller)
//   6. nsExec (run ollama uninstaller)
//
// When electron-builder installs/upgrades FileBrain it runs the old
// uninstaller silently first.  IfSilent detects that and skips all
// destructive actions so:
//   - User data / knowledge-base is NOT deleted on upgrade
//   - The "uninstall Ollama?" dialog does NOT appear during install
//
// Only a genuine interactive uninstall (via Windows Settings / Control Panel)
// goes past the IfSilent check and shows the dialog.
const lines = [
  "; FileBrain custom NSIS uninstall hooks (auto-generated)",
  "; Runs when the user uninstalls via Windows Settings or Control Panel.",
  "; During a silent call (e.g. upgrade/reinstall), all destructive actions",
  "; are skipped so user data and the Ollama install are left untouched.",
  "",
  "!macro customUninstall",
  "",
  "  ; Always stop any running Ollama processes",
  "  nsExec::ExecToLog 'taskkill /F /IM \"ollama.exe\" /T'",
  "  nsExec::ExecToLog 'taskkill /F /IM \"ollama app.exe\" /T'",
  "",
  "  ; Skip everything below when running silently (installer upgrade/reinstall).",
  "  ; +7 jumps past the 3 RMDir lines + MessageBox + IfFileExists + nsExec.",
  "  IfSilent +7",
  "",
  "  ; Delete FileBrain's local database and all its data",
  '  RMDir /r "$APPDATA\\FileBrain"',
  '  RMDir /r "$LOCALAPPDATA\\FileBrain"',
  "",
  "  ; Delete downloaded AI model files (~2-3 GB)",
  '  RMDir /r "$PROFILE\\.ollama\\models"',
  "",
  "  ; Ask whether to also uninstall Ollama (only reached during interactive uninstall)",
  "  MessageBox MB_YESNO|MB_ICONQUESTION \\",
  '    "Would you also like to uninstall Ollama (the AI engine used by FileBrain)?$\\r$\\nClick No to keep Ollama if you use it with other apps." \\',
  "    IDNO +3",
  '  IfFileExists "$LOCALAPPDATA\\Programs\\Ollama\\unins000.exe" +1 +2',
  '    nsExec::ExecToLog \'"$LOCALAPPDATA\\Programs\\Ollama\\unins000.exe" /SILENT\'',
  "",
  "!macroend",
];

fs.writeFileSync(path.join(buildDir, "installer.nsh"), lines.join("\n"), "utf-8");
console.log("✓ build/installer.nsh generated");
