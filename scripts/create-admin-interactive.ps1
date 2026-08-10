$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function ConvertFrom-SecureValue {
  param([Security.SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$serviceRoleSecure = Read-Host "Supabase service-role key" -AsSecureString
$passwordSecure = Read-Host "Password for admin@dharmacore.net (minimum 12 characters)" -AsSecureString

try {
  $env:SUPABASE_URL = "https://bmevvqkivylkyzerrhjk.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = ConvertFrom-SecureValue $serviceRoleSecure
  $env:ADMIN_EMAIL = "admin@dharmacore.net"
  $env:ADMIN_PASSWORD = ConvertFrom-SecureValue $passwordSecure

  & npm.cmd run admin:create
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
}
