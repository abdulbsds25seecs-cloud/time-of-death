param([Parameter(Mandatory=$true)][string]$TextFile,[Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice.SelectVoice('Microsoft David Desktop')
  $voice.Rate = 0
  $voice.SetOutputToWaveFile([IO.Path]::GetFullPath($OutputFile))
  $voice.Speak([IO.File]::ReadAllText([IO.Path]::GetFullPath($TextFile)))
} finally { $voice.Dispose() }
