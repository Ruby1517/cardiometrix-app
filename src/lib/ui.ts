export function bandColor(band: 'green'|'amber'|'red') {
  return band === 'green' ? 'bg-cmx-risk-green'
       : band === 'amber' ? 'bg-cmx-risk-amber'
       : 'bg-cmx-risk-red';
}