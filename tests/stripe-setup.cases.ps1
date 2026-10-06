$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../tools/stripe-setup.ps1')
$realWrangler = ${function:Invoke-SetupWrangler}
$temp = Join-Path ([IO.Path]::GetTempPath()) ('templates-stripe-setup-' + [guid]::NewGuid())
$null = New-Item -ItemType Directory -Path $temp
$configFile = Join-Path $temp 'wrangler-api.toml'
$cliFile = Join-Path $temp 'fake-wrangler.cjs'
@'
name = "templates-api"
PUBLISH_HOST = "templates-api.templates-hemsidor.workers.dev"
STRIPE_PRICE_ID = "price_1UNQMQBf7Bcrv8UH0mvHYMAi"
STRIPE_PRODUCT_ID = "prod_VOClaft57i4FpB"
REQUIRE_PLAN = "1"
PLAN_PRICE_SEK = "499"
APP_ORIGIN = "https://templates-app.pages.dev"
'@ | Set-Content -LiteralPath $configFile
'' | Set-Content -LiteralPath $cliFile
$script:results = @()
$script:fakeKey = 'rk_' + 'live_' + ('SYNTHETIC' * 4)
$script:fakeSecret = 'whsec_' + ('SYNTHETIC' * 4)
function Assert([bool]$Ok, [string]$Message) { if (-not $Ok) { throw $Message } }
function Write-Host { param([Parameter(ValueFromRemainingArguments=$true)]$Values); $script:messages += ($Values -join ' ') }
function Read-TemplatesSecret([string]$Prompt) {
  $script:reads++
  if ($script:scenario -eq 'test-key') { return 'rk_' + 'test_' + ('SYNTHETIC' * 4) }
  if ($script:reads -eq 1) { return $script:fakeKey }
  if ($script:scenario -eq 'missing-signing') { return '' }
  return $script:fakeSecret
}
function New-Endpoint {
  return [pscustomobject]@{ id = 'we_SYNTHETIC'; url = 'https://templates-api.templates-hemsidor.workers.dev/api/stripe/webhook'; livemode = $true; status = 'enabled'; metadata = @{ app = 'templates' }; enabled_events = @('checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'); secret = $script:fakeSecret }
}
function Invoke-SetupWrangler {
  param($Cli, $ConfigFile, $Arguments, $InputText)
  if (($Arguments -join ' ') -eq 'secret list') {
    $script:lists++
    if ($script:scenario -eq 'cloud-preflight') { throw 'provider diagnostic must never be printed' }
    if ($script:lists -eq 1 -or $script:scenario -eq 'missing-name') { return '[]' }
    return '[{"name":"STRIPE_SECRET_KEY"},{"name":"STRIPE_WEBHOOK_SECRET"}]'
  }
  Assert (($Arguments -join ' ') -eq 'secret bulk') 'Unexpected mutation'
  $script:uploads++
  $data = $InputText | ConvertFrom-Json
  Assert ($data.STRIPE_SECRET_KEY -eq $script:fakeKey -and $data.STRIPE_WEBHOOK_SECRET -eq $script:fakeSecret) 'Both secrets must go through one stdin request'
  if ($script:scenario -eq 'upload-fails' -or ($script:scenario -eq 'retry' -and $script:uploads -lt 3)) { throw 'Provider payload must never escape' }
}
function Invoke-SetupStripe {
  param($Method, $Resource, $Headers, $Body)
  Assert ($Headers.Authorization -eq "Bearer $script:fakeKey") 'Expected in-memory credential'
  Assert ($Headers['Stripe-Version'] -eq '2026-09-30.endive') 'API version must be pinned'
  if ($Resource -like '/prices/*') {
    $price = [pscustomobject]@{ id='price_1UNQMQBf7Bcrv8UH0mvHYMAi'; product='prod_VOClaft57i4FpB'; livemode=$true; active=$true; unit_amount=49900; currency='sek'; type='recurring'; recurring=@{ interval='month'; interval_count=1 } }
    switch ($script:scenario) {
      'wrong-price' { $price.unit_amount=499 }
      'wrong-mode' { $price.livemode=$false }
      'wrong-product' { $price.product='prod_OTHER' }
      'wrong-interval' { $price.recurring.interval='year' }
    }
    return $price
  }
  if ($Resource -like '/products/*') { return [pscustomobject]@{ id='prod_VOClaft57i4FpB'; active=$true; livemode=$true } }
  if ($Method -eq 'Get') {
    $script:pagesRead++
    if ($script:scenario -eq 'malformed-list') { return @{data=@()} }
    $endpoint=New-Endpoint
    if ($script:scenario -eq 'paginated' -and $script:pagesRead -eq 1) { return @{data=@(@{id='we_OTHER';url='https://other.example'});has_more=$true} }
    if ($script:scenario -eq 'paginated') { Assert ($Resource -like '*starting_after=we_OTHER') 'Pagination must continue' }
    if ($script:scenario -eq 'unowned') { $endpoint.metadata.app='other' }
    if ($script:scenario -eq 'wrong-events') { $endpoint.enabled_events=@('*') }
    if ($script:scenario -eq 'disabled') { $endpoint.status='disabled' }
    if ($script:scenario -eq 'duplicate') { return @{data=@($endpoint,$endpoint);has_more=$false} }
    if ($script:scenario -in @('existing','paginated','missing-signing','unowned','wrong-events','disabled')) { $endpoint.secret=$null; return @{data=@($endpoint);has_more=$false} }
    return @{data=@();has_more=$false}
  }
  Assert ($Resource -eq '/webhook_endpoints' -and $Method -eq 'Post') 'Only endpoint creation allowed'
  Assert ($Headers['Idempotency-Key'] -eq 'templates-webhook-setup-v2-20261006') 'Creation must be idempotent'
  Assert ($Body.api_version -eq '2026-09-30.endive' -and $Body['metadata[app]'] -eq 'templates') 'Endpoint version/ownership pinned'
  $script:creates++
  return New-Endpoint
}
function Test-SetupWebhook { param($Url); return $script:scenario -ne 'wrong-http' }

try {
  foreach ($case in @('new','existing','paginated','retry','upload-fails','wrong-price','wrong-mode','wrong-product','wrong-interval','unowned','wrong-events','disabled','duplicate','missing-signing','missing-name','wrong-http','cloud-preflight','malformed-list','test-key')) {
    $script:scenario=$case; $script:reads=0; $script:uploads=0; $script:creates=0; $script:lists=0; $script:pagesRead=0; $script:messages=@()
    $caught=$null; $out=@()
    try { $out=@(Invoke-TemplatesStripeSetup $configFile $cliFile) } catch { $caught=$_.Exception.Message }
    $success=$case -in @('new','existing','paginated','retry')
    Assert (($null -eq $caught) -eq $success) "Unexpected success/failure: $case ($caught)"
    if ($success) { Assert (($out -join ',') -eq 'STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET') 'Only secret names returned' }
    if ($case -in @('wrong-price','wrong-mode','wrong-product','wrong-interval','unowned','wrong-events','disabled','duplicate','missing-signing','cloud-preflight','malformed-list','test-key')) { Assert ($script:uploads -eq 0) "Mutation before failed validation: $case" }
    if ($case -in @('existing','paginated')) { Assert ($script:creates -eq 0 -and $script:reads -eq 2) 'Existing endpoint must be recovered without recreation' }
    if ($case -in @('retry','upload-fails')) { Assert ($script:uploads -eq 3 -and $script:creates -eq 1) 'Retry must reuse endpoint and credentials' }
    if ($case -eq 'cloud-preflight') { Assert ($script:reads -eq 0) 'Do not request key before Cloudflare preflight' }
    $visible = ($out + $script:messages + @($caught)) -join '\n'
    Assert (-not $visible.Contains($script:fakeKey) -and -not $visible.Contains($script:fakeSecret)) 'Credentials leaked in output'
    $script:results += @{name=$case;status='PASS'}
  }
  # Exercise the real process wrapper: fake CLI deliberately echoes input and errors.
  ${function:Invoke-SetupWrangler}=$realWrangler
  @'
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  if (process.env.WRANGLER_WRITE_LOGS !== 'false' || process.env.WRANGLER_LOG_SANITIZE !== 'true' || process.env.WRANGLER_SEND_METRICS !== 'false') process.exit(2);
  console.error(input);
  console.log(input);
  if (process.argv.includes('fail')) process.exit(1);
});
'@ | Set-Content -LiteralPath $cliFile
  $output=@(Invoke-SetupWrangler -Cli $cliFile -ConfigFile $configFile -Arguments @('secret','bulk') -InputText $script:fakeSecret)
  Assert ($output.Count -eq 0) 'Bulk must discard all process output'
  $caught=$null
  try { Invoke-SetupWrangler -Cli $cliFile -ConfigFile $configFile -Arguments @('fail') -InputText $script:fakeSecret } catch { $caught=$_.Exception.Message }
  Assert ($caught -and -not $caught.Contains($script:fakeSecret)) 'Child failure must be sanitized'
  $script:results += @{name='real-child-process-redaction-and-log-controls';status='PASS'}
  # The owner can launch from their home directory. Wrangler must use the config
  # directory, or its project cache can shadow its global OAuth/keyring config.
  @'
const path = require('node:path');
const config = process.argv[process.argv.indexOf('--config') + 1];
if (process.cwd().toLowerCase() !== path.dirname(config).toLowerCase()) process.exit(3);
console.log('[]');
'@ | Set-Content -LiteralPath $cliFile
  $names = @(Get-SetupSecretNames $cliFile $configFile)
  Assert ($names.Count -eq 0) 'Worker preflight must run from the configuration directory'
  $script:results += @{name='real-child-process-config-working-directory';status='PASS'}
  # Run the actual owner entry point; check-only must exit before any secret prompt.
  $output = (& pwsh -NoProfile -File (Join-Path $PSScriptRoot '../tools/stripe-setup.ps1') -Config $configFile -Wrangler $cliFile -CheckOnly 2>&1 | Out-String)
  Assert ($LASTEXITCODE -eq 0 -and $output.Contains('PASS [CF_PREFLIGHT]')) 'Check-only must complete without Stripe input'
  $script:results += @{name='owner-entry-point-check-only';status='PASS'}
  foreach ($diagnosticCase in @('CF_LOGIN','CF_JSON')) {
    $fakeCode = if ($diagnosticCase -eq 'CF_LOGIN') { "console.error('Not logged in PROVIDER_DIAGNOSTIC_MUST_NOT_ESCAPE'); process.exit(1);" } else { "console.log('PROVIDER_DIAGNOSTIC_MUST_NOT_ESCAPE');" }
    $fakeCode | Set-Content -LiteralPath $cliFile
    $caught = $null
    try { $null = Get-SetupSecretNames $cliFile $configFile } catch { $caught = $_.Exception.Message }
    Assert ($caught -and $caught.Contains("[$diagnosticCase]") -and -not $caught.Contains('PROVIDER_DIAGNOSTIC_MUST_NOT_ESCAPE')) 'Preflight must return only a fixed diagnostic category'
    $script:results += @{name="safe-preflight-diagnostic-$diagnosticCase";status='PASS'}
  }
  [Console]::WriteLine(($script:results | ConvertTo-Json -Compress))
} finally {
  # Only remove this test's exact fresh directory under the OS temp directory.
  $resolved=[IO.Path]::GetFullPath($temp)
  $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolved).StartsWith('templates-stripe-setup-')) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
