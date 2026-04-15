$content = Get-Content "apps/web/components/debts/SnowballCalculator.tsx"
$export = "export type { SnowballDebt, ScheduleDebt } from './SnowballCalculator';"
$content = $content | Select-Object -First ($content.Count - 1)
$content += $export
$content | Set-Content "apps/web/components/debts/SnowballCalculator.tsx"
