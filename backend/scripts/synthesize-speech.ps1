param(
    [Parameter(Mandatory = $true)][string]$TextPath,
    [Parameter(Mandatory = $true)][string]$OutPath,
    [string]$Gender = "Female"
)

# Uses Windows' built-in System.Speech (SAPI) voices - ships with every
# Windows install, free, no extra binary or model files. Reads narration
# text from a file (not a command-line argument) so embedded quotes,
# apostrophes, etc. in the story text never have to survive PowerShell's
# command-line quoting rules.

Add-Type -AssemblyName System.Speech

$text = Get-Content -LiteralPath $TextPath -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($text)) {
    Write-Error "No narration text provided."
    exit 1
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

try {
    $genderEnum = [System.Speech.Synthesis.VoiceGender]$Gender
    $synth.SelectVoiceByHints($genderEnum)
} catch {
    # If gender-based selection fails (e.g. only one voice installed),
    # just fall back to whatever default voice Windows has.
}

try {
    $synth.SetOutputToWaveFile($OutPath)
    $synth.Speak($text)
}
finally {
    $synth.Dispose()
}
