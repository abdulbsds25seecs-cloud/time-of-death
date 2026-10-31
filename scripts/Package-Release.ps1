$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stage = Join-Path $projectRoot ('work/release-' + [Guid]::NewGuid().ToString('N'))
$archive = Join-Path ([IO.Directory]::GetParent($projectRoot).FullName) 'time-of-death-prebuilt.zip'
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist/index.html'))) { throw 'Run npm run build first.' }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
# Include reviewed, tracked source plus the built interface. No .data, .git,
# node_modules or local environment files enter the archive.
$tracked = & git -C $projectRoot ls-files
if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate tracked release files.' }
foreach ($relative in $tracked) {
  $source = [IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
  $target = [IO.Path]::GetFullPath((Join-Path $stage $relative))
  if (-not $source.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar) -or -not $target.StartsWith($stage + [IO.Path]::DirectorySeparatorChar)) { throw 'A release path escaped its root.' }
  New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist') -Destination (Join-Path $stage 'dist') -Recurse
$info = @{builtAt=[DateTime]::UtcNow.ToString('o');sourceCommit=(& git -C $projectRoot rev-parse HEAD);standardMode='Node 22.13+ and Git; no npm install required';optional='Install npm dependencies before enabling Mastra, Temporal or Sentry. Ollama/models are separately installed.'}
$info | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'BUILD_INFO.json') -Encoding utf8
Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $stage -Force).FullName -DestinationPath $archive -Force
Get-Item -LiteralPath $archive | Select-Object FullName,Length
$hasher = [Security.Cryptography.SHA256]::Create()
$stream = [IO.File]::OpenRead($archive)
try { [PSCustomObject]@{ SHA256=([BitConverter]::ToString($hasher.ComputeHash($stream))).Replace('-',''); Path=$archive } }
finally { $stream.Dispose(); $hasher.Dispose() }
