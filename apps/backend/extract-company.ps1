$xml = [xml](Get-Content tally-discovery-response.xml)
$companies = $xml.ENVELOPE.BODY.IMPORTDATA.REQUESTDATA.TALLYMESSAGE | Where-Object { $_.COMPANY } | Select-Object -ExpandProperty COMPANY
foreach ($company in $companies) {
    Write-Output "Found Company: $($company.NAME)"
}
