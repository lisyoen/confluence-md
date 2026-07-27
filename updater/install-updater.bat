@echo off
setlocal
set "HOST_PATH=%~dp0host.bat"
set "MANIFEST_PATH=%~dp0host-manifest.json"
set "JSON_HOST_PATH=%HOST_PATH:\=\\%"

> "%MANIFEST_PATH%" echo {"name":"io.github.lisyoen.confluence_md","description":"confluence-md one-click updater","path":"%JSON_HOST_PATH%","type":"stdio","allowed_origins":["chrome-extension://djbonpbjlpdnnijanffepbenlhkklhpl/"]}

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\io.github.lisyoen.confluence_md" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\io.github.lisyoen.confluence_md" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo Confluence Markdown updater registration complete.
echo Chrome or Edge must be restarted before first use.
pause
