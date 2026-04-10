; FileBrain custom NSIS uninstall hooks (auto-generated)
; Runs when the user uninstalls via Windows Settings or Control Panel.
; During a silent call (e.g. upgrade/reinstall), all destructive actions
; are skipped so user data and the Ollama install are left untouched.

!macro customUninstall

  ; Always stop any running Ollama processes
  nsExec::ExecToLog 'taskkill /F /IM "ollama.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "ollama app.exe" /T'

  ; Skip everything below when running silently (installer upgrade/reinstall).
  ; +7 jumps past the 3 RMDir lines + MessageBox + IfFileExists + nsExec.
  IfSilent +7

  ; Delete FileBrain's local database and all its data
  RMDir /r "$APPDATA\FileBrain"
  RMDir /r "$LOCALAPPDATA\FileBrain"

  ; Delete downloaded AI model files (~2-3 GB)
  RMDir /r "$PROFILE\.ollama\models"

  ; Ask whether to also uninstall Ollama (only reached during interactive uninstall)
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Would you also like to uninstall Ollama (the AI engine used by FileBrain)?$\r$\nClick No to keep Ollama if you use it with other apps." \
    IDNO +3
  IfFileExists "$LOCALAPPDATA\Programs\Ollama\unins000.exe" +1 +2
    nsExec::ExecToLog '"$LOCALAPPDATA\Programs\Ollama\unins000.exe" /SILENT'

!macroend