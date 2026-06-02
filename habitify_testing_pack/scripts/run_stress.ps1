$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
python .\habitify_testing_pack\stress\stress_api.py --base-url http://127.0.0.1:8000 --users 25 --concurrency 10 --loops 3
python .\habitify_testing_pack\tools\generate_charts.py
