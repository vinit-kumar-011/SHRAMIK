param(
    [string]$BaseUrl = "http://127.0.0.1:8000/api/v1/ingestion",
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

# The API key stays in the backend environment. This script only reads the
# ingestion token so it can call the protected preview endpoint.
$token = $env:INGESTION_ADMIN_TOKEN
if ([string]::IsNullOrWhiteSpace($token) -and (Test-Path -LiteralPath $EnvFile)) {
    $line = Get-Content -LiteralPath $EnvFile |
        Where-Object { $_ -match '^\s*INGESTION_ADMIN_TOKEN\s*=' } |
        Select-Object -First 1
    if ($line) {
        $token = ($line -replace '^\s*INGESTION_ADMIN_TOKEN\s*=\s*', '').Trim()
        if (($token.StartsWith('"') -and $token.EndsWith('"')) -or
            ($token.StartsWith("'") -and $token.EndsWith("'"))) {
            $token = $token.Substring(1, $token.Length - 2)
        }
    }
}
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "INGESTION_ADMIN_TOKEN not found in process environment or '$EnvFile'. Set it locally; do not paste it into chat."
}

$headers = @{ "X-Ingestion-Token" = $token }
try {
    $sourceCatalog = Invoke-RestMethod -Method Get -Uri "$BaseUrl/sources" -TimeoutSec 15
} catch {
    throw "Cannot reach the SHRAMIK ingestion API at '$BaseUrl'. Start the backend and verify BaseUrl. Details: $($_.Exception.Message)"
}

$sourceKeys = @(
    "udyam_district_enterprises",
    "udyam_district_services",
    "udyam_district_manufacturing",
    "eshram_district_registrations",
    "mgnrega_district_employment",
    "jss_district_training_snapshot"
)

$results = foreach ($key in $sourceKeys) {
    $metadata = $sourceCatalog.sources | Where-Object { $_.key -eq $key } | Select-Object -First 1
    if (-not $metadata) {
        [pscustomobject]@{
            source_key = $key; source_name = ""; resource_id = ""; status = "NOT_REGISTERED"; records = $null
            total = $null; fields = ""; message = "Source key missing from backend registry"
        }
        continue
    }
    if (-not $metadata.configured) {
        [pscustomobject]@{
            source_key = $key; source_name = $metadata.name; resource_id = ""; status = "NOT_CONFIGURED"; records = $null
            total = $null; fields = ""; message = "Set OGD_API_KEY and this resource ID in backend environment"
        }
        continue
    }
    try {
        $uri = "$BaseUrl/preview/$key?page_size=10&sample_rows=0"
        $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -TimeoutSec 30
        [pscustomobject]@{
            source_key = $key
            source_name = $response.source_name
            resource_id = $response.resource_id
            status = "PREVIEW_OK"
            records = $response.received_records
            total = $response.reported_total
            fields = ($response.field_names -join ", ")
            message = "persisted=$($response.persisted); truncated=$($response.truncated)"
        }
    } catch {
        $statusCode = $null
        try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        $message = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($message)) { $message = $_.Exception.Message }
        [pscustomobject]@{
            source_key = $key
            source_name = $metadata.name
            resource_id = ""
            status = if ($statusCode) { "HTTP_$statusCode" } else { "REQUEST_FAILED" }
            records = $null
            total = $null
            fields = ""
            message = $message
        }
    }
}

$results | Format-Table -Wrap -AutoSize
if ($results | Where-Object { $_.status -ne "PREVIEW_OK" }) {
    Write-Error "One or more sources need attention. The preview is read-only; no staging rows were written."
    exit 1
}
Write-Host "All six read-only previews completed. No records were persisted by preview."
