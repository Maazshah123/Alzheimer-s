$VenvPython = "C:\ml-tf\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Error "Missing $VenvPython - run .\setup-short-venv.ps1 first."
    exit 1
}
Set-Location $PSScriptRoot
& $VenvPython -m uvicorn main:app --host 127.0.0.1 --port 8765
