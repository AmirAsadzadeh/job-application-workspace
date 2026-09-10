param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "check", "test")]
  [string]$Mode
)

$ErrorActionPreference = "Stop"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$env:Path = "$cargoBin;$env:Path"

$vswhere = "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path -LiteralPath $vswhere)) { throw "Visual Studio Build Tools were not found." }
$visualStudio = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $visualStudio) { throw "The Visual C++ x64 workload was not found." }
$developerCommand = Join-Path $visualStudio "Common7\Tools\VsDevCmd.bat"

& cmd.exe /d /s /c "`"$developerCommand`" -no_logo -arch=x64 -host_arch=x64 && set" | ForEach-Object {
  if ($_ -match "^([^=]+)=(.*)$") { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process") }
}

switch ($Mode) {
  "check" { & cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml }
  "test" { & cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml }
  "dev" {
    & npm.cmd run desktop:prepare
    if ($LASTEXITCODE -eq 0) {
      Push-Location apps/desktop
      try { & npx.cmd tauri dev } finally { Pop-Location }
    }
  }
  "build" {
    & npm.cmd run desktop:prepare
    if ($LASTEXITCODE -eq 0) {
      Push-Location apps/desktop
      try { & npx.cmd tauri build } finally { Pop-Location }
    }
  }
}

exit $LASTEXITCODE
