$ErrorActionPreference = 'Stop'
$taskRuntime = $env:TOD_OLLAMA_BIN
if (-not $taskRuntime) {
    $taskInstalled = Get-Command ollama -ErrorAction SilentlyContinue
    if ($taskInstalled) { $taskRuntime = $taskInstalled.Source }
    elseif (Test-Path -LiteralPath 'Z:\Codex-time-of-death-runtime\cpu\ollama.exe') {
        $taskRuntime = 'Z:\Codex-time-of-death-runtime\cpu\ollama.exe'
        $env:OLLAMA_MODELS = 'Z:\Codex-time-of-death-runtime\models'
    }
}
if (-not $taskRuntime) { throw 'Install Ollama from https://ollama.com/download, then run this script again.' }
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
Write-Output 'Starting local-only Ollama. Keep this terminal open. Models are downloaded separately.'
& $taskRuntime serve
