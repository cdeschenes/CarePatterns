/**
 * Reports page — filter, view, and export log history.
 *
 * State: `filters` starts as {} (no report run). When the user presses
 * "Run report" in ReportFilters, filters are updated and useReport fetches.
 * When "Clear" is pressed, filters reset to {} and the query is not active.
 *
 * useReport with an empty filters object still hits the API and returns all
 * entries. To avoid an immediate full fetch on page load (which may be slow
 * and is not what the user asked for), the query is only enabled when
 * `hasRunReport` is true — this is set to true the first time onFilter is
 * called with any value, including {}.
 */

import { useState } from 'react'
import { useReport } from '@/api/reports'
import PageHeader from '@/components/layout/PageHeader'
import ReportFilters from '@/components/reports/ReportFilters'
import ReportTable from '@/components/reports/ReportTable'
import ExportBar from '@/components/reports/ExportBar'
import type { ReportFilters as ReportFiltersType } from '@/types'

export default function Reports() {
  const [filters, setFilters] = useState<ReportFiltersType>({})
  const [hasRunReport, setHasRunReport] = useState(false)

  const { data: entries = [], isLoading } = useReport(filters, hasRunReport)

  function handleFilter(newFilters: ReportFiltersType) {
    setFilters(newFilters)
    setHasRunReport(true)
  }

  return (
    <div>
      <PageHeader title="Reports" />

      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <ReportFilters onFilter={handleFilter} />

        {/* Export bar — shown once a report has been run */}
        {hasRunReport && (
          <ExportBar
            filters={filters}
            entries={entries}
            isLoading={isLoading}
          />
        )}

        {/* Results table — shown once a report has been run */}
        {hasRunReport ? (
          <ReportTable entries={entries} isLoading={isLoading} />
        ) : (
          <div className="text-center py-10">
            <p className="text-sm text-cp-text-muted">
              Select filters above and press{' '}
              <span className="font-medium text-cp-text">Run report</span> to
              view your log history.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
