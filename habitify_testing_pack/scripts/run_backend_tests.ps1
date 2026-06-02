$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

if (-not (Test-Path ".\backend\.venv\Scripts\Activate.ps1")) {
    Set-Location .\backend
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    pip install -r ..\habitify_testing_pack\testing-requirements.txt
    Set-Location $repoRoot
} else {
    . .\backend\.venv\Scripts\Activate.ps1
}

pytest .\habitify_testing_pack\backend_tests -q
