import React, { useState, useEffect } from 'react'
import Trading212Service from '../services/Trading212Service'

const HistoryExport = ({ apiKey, onExportComplete }) => {
  const [startYear, setStartYear] = useState(new Date().getFullYear() - 1)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, currentYear: null, status: '' })
  const [exportedReports, setExportedReports] = useState([])
  const [existingExports, setExistingExports] = useState([])
  const [error, setError] = useState(null)

  const getCurrentYear = () => new Date().getFullYear()
  const getCurrentDate = () => new Date().toISOString()

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const exportHistoryByYear = async (year, retryCount = 0) => {
    const service = new Trading212Service(apiKey)
    
    const timeFrom = `${year}-01-01T00:00:00Z`
    const timeTo = year === getCurrentYear() 
      ? getCurrentDate() 
      : `${year}-12-31T23:59:55Z`

    const exportData = {
      dataIncluded: {
        includeDividends: true,
        includeInterest: true,
        includeOrders: true,
        includeTransactions: true
      },
      timeFrom,
      timeTo
    }

    console.log(`📊 [HISTORY EXPORT] Fetching data for year ${year}... (attempt ${retryCount + 1})`)
    console.log(`📅 [HISTORY EXPORT] Time range: ${timeFrom} to ${timeTo}`)

    try {
      const response = await service.exportHistory(exportData)
      console.log(`✅ [HISTORY EXPORT] Year ${year} export started, Report ID: ${response.reportId}`)
      
      return {
        year,
        reportId: response.reportId,
        timeFrom,
        timeTo,
        status: 'exported',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ [HISTORY EXPORT] Failed to export year ${year}:`, error)
      
      // Handle 429 errors with exponential backoff
      if (error.response?.status === 429 && retryCount < 2) {
        const backoffDelay = Math.min(20000 * Math.pow(2, retryCount), 60000) // 20s, 40s, max 60s
        console.warn(`⚠️ [HISTORY EXPORT] Rate limited (429), waiting ${backoffDelay/1000}s before retry ${retryCount + 1}/3...`)
        
        setProgress(prev => ({ 
          ...prev, 
          status: `Rate limited, waiting ${backoffDelay/1000}s before retry...` 
        }))
        
        await delay(backoffDelay)
        return await exportHistoryByYear(year, retryCount + 1)
      }
      
      throw error
    }
  }

  // Load existing exports on component mount
  useEffect(() => {
    if (apiKey) {
      loadExistingExports()
    }
  }, [apiKey])

  const loadExistingExports = async () => {
    if (!apiKey) return

    setIsLoadingExisting(true)
    setError(null)

    try {
      console.log('🔄 [HISTORY EXPORT] Loading existing exports (SINGLE REQUEST)...')
      const service = new Trading212Service(apiKey)
      const exports = await service.getExportHistory()
      
      console.log(`✅ [HISTORY EXPORT] Found ${exports.length} existing exports (NO MORE REQUESTS)`)
      setExistingExports(exports || [])
      
      // Extract and pass existing full-year report IDs to parent
      const fullYearReportIds = exports
        .filter(exp => {
          const isFinished = exp.status?.toLowerCase() === 'finished'
          const hasReportId = exp.reportId
          const isFullYear = getYearFromTimeRange(exp.timeFrom, exp.timeTo) !== null
          return isFinished && hasReportId && isFullYear
        })
        .map(exp => exp.reportId)
      
      if (fullYearReportIds.length > 0 && onExportComplete) {
        console.log(`📤 [HISTORY EXPORT] Passing ${fullYearReportIds.length} existing full-year report IDs to parent:`, fullYearReportIds)
        onExportComplete(fullYearReportIds)
      }
      
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Failed to load existing exports:', error)
      setError(`Failed to load existing exports: ${error.message}`)
    } finally {
      setIsLoadingExisting(false)
    }
  }

  const getYearFromTimeRange = (timeFrom, timeTo) => {
    try {
      const fromDate = new Date(timeFrom)
      const toDate = new Date(timeTo)
      const fromYear = fromDate.getFullYear()
      const toYear = toDate.getFullYear()
      
      // Check for exact full-year exports: January 1st to December 31st
      const isExactFullYear = (
        fromYear === toYear && // Same year
        fromDate.getMonth() === 0 && fromDate.getDate() === 1 && // Starts January 1st
        fromDate.getHours() === 0 && fromDate.getMinutes() === 0 && fromDate.getSeconds() === 0 && // Starts at midnight
        toDate.getMonth() === 11 && toDate.getDate() === 31 && // Ends December 31st
        toDate.getHours() === 23 && toDate.getMinutes() === 59 // Ends at 23:59 (any seconds 55-59 are OK)
        // Removed strict seconds check - Trading212 uses different second values (55, 59)
      )
      
      // Special case for current year - accept if it starts Jan 1st and goes to current date/time
      const isCurrentYearPartial = (
        fromYear === getCurrentYear() && toYear === getCurrentYear() &&
        fromDate.getMonth() === 0 && fromDate.getDate() === 1 && // Starts January 1st
        fromDate.getHours() === 0 && fromDate.getMinutes() === 0 && fromDate.getSeconds() === 0 // Starts at midnight
      )
      
      if (isExactFullYear || isCurrentYearPartial) {
        console.log(`✅ [HISTORY EXPORT] Found full-year export for ${fromYear}: ${timeFrom} to ${timeTo}`)
        return fromYear
      }
      
      console.log(`⚠️ [HISTORY EXPORT] Skipping partial/custom export: ${timeFrom} to ${timeTo}`)
      console.log(`🔍 [HISTORY EXPORT] Debug - fromYear: ${fromYear}, toYear: ${toYear}, fromMonth: ${fromDate.getMonth()}, fromDate: ${fromDate.getDate()}, toMonth: ${toDate.getMonth()}, toDate: ${toDate.getDate()}, toHours: ${toDate.getHours()}, toMinutes: ${toDate.getMinutes()}, toSeconds: ${toDate.getSeconds()}`)
      return null
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Error parsing date range:', error)
      return null
    }
  }

  const getExistingYearsCovered = () => {
    const coveredYears = new Set()
    const yearToReportIdMap = new Map()
    
    console.log('🔍 [HISTORY EXPORT] Analyzing existing exports for full-year coverage...')
    
    existingExports
      .filter(exp => exp.status?.toLowerCase() === 'finished')
      .forEach(exp => {
        const year = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
        if (year) {
          coveredYears.add(year)
          yearToReportIdMap.set(year, exp.reportId)
          console.log(`📋 [HISTORY EXPORT] Year ${year} already covered by Report ID: ${exp.reportId}`)
        }
      })
    
    const years = Array.from(coveredYears).sort((a, b) => a - b)
    console.log(`📊 [HISTORY EXPORT] Full years already covered: ${years.join(', ') || 'none'}`)
    
    return { years, yearToReportIdMap }
  }

  const handleExportHistory = async () => {
    if (!apiKey) {
      setError('No API key provided')
      return
    }

    if (startYear < 2019 || startYear > getCurrentYear()) {
      setError(`Please enter a valid year between 2019 and ${getCurrentYear()}`)
      return
    }

    // First, load fresh existing exports data
    console.log('🔄 [HISTORY EXPORT] Refreshing existing exports before starting...')
    await loadExistingExports()

    setIsExporting(true)
    setError(null)
    setExportedReports([])

    const currentYear = getCurrentYear()
    const requestedYears = []
    
    // Generate array of years from startYear to current year
    for (let year = startYear; year <= currentYear; year++) {
      requestedYears.push(year)
    }

    // Check which years are already covered
    const { years: existingYears, yearToReportIdMap } = getExistingYearsCovered()
    const yearsToExport = requestedYears.filter(year => !existingYears.includes(year))
    
    console.log(`📊 [HISTORY EXPORT] Requested years: ${requestedYears.join(', ')}`)
    console.log(`✅ [HISTORY EXPORT] Already covered years: ${existingYears.join(', ') || 'none'}`)
    console.log(`🆕 [HISTORY EXPORT] Years to export: ${yearsToExport.join(', ') || 'none'}`)

    // Collect existing report IDs for covered years
    const existingReportIds = requestedYears
      .filter(year => existingYears.includes(year))
      .map(year => yearToReportIdMap.get(year))
      .filter(Boolean)

    console.log(`📋 [HISTORY EXPORT] Using existing report IDs: ${existingReportIds.join(', ') || 'none'}`)

    if (yearsToExport.length === 0) {
      setProgress({ 
        current: 0, 
        total: 0, 
        currentYear: null, 
        status: `All requested years (${requestedYears.join(', ')}) are already exported!` 
      })
      
      // Pass existing report IDs to parent even if no new exports needed
      if (existingReportIds.length > 0 && onExportComplete) {
        console.log(`📤 [HISTORY EXPORT] Passing ${existingReportIds.length} existing report IDs to parent:`, existingReportIds)
        onExportComplete(existingReportIds)
      }
      
      setTimeout(() => {
        setProgress({ current: 0, total: 0, currentYear: null, status: '' })
        setIsExporting(false)
      }, 3000)
      
      return
    }

    setProgress({ 
      current: 0, 
      total: yearsToExport.length, 
      currentYear: null, 
      status: `Found ${existingYears.length} existing exports. Need to export ${yearsToExport.length} new years.` 
    })

    try {
      const reports = []
      const successfulReportIds = []
      let baseDelay = 20000 // Start with 20 seconds between requests

      for (let i = 0; i < yearsToExport.length; i++) {
        const year = yearsToExport[i]
        setProgress(prev => ({ 
          ...prev, 
          current: i + 1, 
          currentYear: year,
          status: `Exporting year ${year}...`
        }))

        try {
          const report = await exportHistoryByYear(year)
          reports.push(report)
          setExportedReports(prev => [...prev, report])
          
          // Collect successful report IDs
          if (report.reportId) {
            successfulReportIds.push(report.reportId)
            console.log(`📝 [HISTORY EXPORT] Added Report ID ${report.reportId} for year ${year}`)
          }

          // Successful request - wait base delay before next request
          if (i < years.length - 1) {
            console.log(`⏳ [HISTORY EXPORT] Waiting ${baseDelay/1000} seconds before next request...`)
            setProgress(prev => ({ 
              ...prev, 
              status: `Waiting ${baseDelay/1000}s before next request...` 
            }))
            await delay(baseDelay)
          }
        } catch (yearError) {
          console.error(`❌ [HISTORY EXPORT] Error exporting year ${year}:`, yearError)
          
          const errorReport = {
            year,
            error: yearError.message,
            status: 'failed',
            timestamp: new Date().toISOString()
          }
          
          reports.push(errorReport)
          setExportedReports(prev => [...prev, errorReport])

          // If we still get rate limited after retries, increase base delay
          if (yearError.response?.status === 429) {
            const newDelay = Math.min(baseDelay * 2, 60000) // 10s -> 20s -> 40s -> 60s max
            console.log(`⚠️ [HISTORY EXPORT] Persistent rate limiting, increasing delay from ${baseDelay/1000}s to ${newDelay/1000}s`)
            baseDelay = newDelay
            
            setProgress(prev => ({ 
              ...prev, 
              status: `Rate limited, increasing delay to ${baseDelay/1000}s...` 
            }))
            await delay(baseDelay)
          } else {
            // For other errors, still wait current base delay
            console.log(`⏳ [HISTORY EXPORT] Waiting ${baseDelay/1000}s after error before continuing...`)
            await delay(baseDelay)
          }
        }
      }

      console.log(`🎉 [HISTORY EXPORT] Export process completed. ${reports.filter(r => r.status === 'exported').length}/${years.length} years exported successfully`)
      console.log(`📋 [HISTORY EXPORT] Successful Report IDs:`, successfulReportIds)
      
      setProgress(prev => ({ 
        ...prev, 
        status: `Completed! ${reports.filter(r => r.status === 'exported').length}/${years.length} years exported successfully` 
      }))
      
      // Pass successful report IDs to parent component
      if (successfulReportIds.length > 0 && onExportComplete) {
        console.log(`📤 [HISTORY EXPORT] Passing ${successfulReportIds.length} report IDs to parent:`, successfulReportIds)
        onExportComplete(successfulReportIds)
      }
      
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Export process failed:', error)
      setError(`Export failed: ${error.message}`)
    } finally {
      setIsExporting(false)
      setTimeout(() => {
        setProgress({ current: 0, total: 0, currentYear: null, status: '' })
      }, 5000)
    }
  }

  return (
    <div className="history-export-container">
      <div className="history-export-card">
        <div className="history-export-header">
          <h5 className="history-export-title">
            <i className="bi bi-download me-2"></i>
            Export Trading History
          </h5>
          <p className="history-export-subtitle">
            Export your Trading212 history data year by year with automatic rate limiting and retry logic
          </p>
        </div>

        <div className="history-export-form">
          <div className="row g-3 align-items-center justify-content-center">
            <div className="col-md-6">
              <label htmlFor="startYear" className="form-label fw-medium">
                <i className="bi bi-calendar me-1"></i>
                Start Year
              </label>
              <input
                type="number"
                className="form-control"
                id="startYear"
                min="2019"
                max={getCurrentYear()}
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                disabled={isExporting}
                placeholder="e.g. 2020"
              />
              <small className="form-text text-muted">
                Data will be exported from this year to {getCurrentYear()}
              </small>
            </div>
            <div className="col-md-6 flex-fill mt-4">
              <button
                className="btn btn-primary w-100"
                onClick={handleExportHistory}
                disabled={isExporting || !apiKey}
              >
                {isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-download me-2"></i>
                    Start Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Display */}
        {isExporting && progress.total > 0 && (
          <div className="history-export-progress">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="fw-medium">
                {progress.currentYear ? `Year ${progress.currentYear}` : 'Processing...'}
              </span>
              <span className="text-muted">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="progress mb-2">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            {progress.status && (
              <small className="text-muted d-flex align-items-center">
                <i className="bi bi-info-circle me-1"></i>
                {progress.status}
              </small>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mt-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Exported Reports */}
        {exportedReports.length > 0 && (
          <div className="history-export-results">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-list-check me-2"></i>
              Export Results
            </h6>
            <div className="history-export-list">
              {exportedReports.map((report, index) => (
                <div
                  key={index}
                  className={`history-export-item ${report.status === 'exported' ? 'success' : 'failed'}`}
                >
                  <div className="history-export-item-icon">
                    <i className={`bi ${report.status === 'exported' ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                  </div>
                  <div className="history-export-item-content">
                    <div className="history-export-item-title">
                      Year {report.year}
                      {report.status === 'exported' && (
                        <span className="badge bg-success ms-2">Report ID: {report.reportId}</span>
                      )}
                    </div>
                    {report.status === 'exported' ? (
                      <small className="text-muted">
                        {report.timeFrom} to {report.timeTo}
                      </small>
                    ) : (
                      <small className="text-danger">
                        Error: {report.error}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="history-export-info">
          <h6 className="fw-medium mb-2">
            <i className="bi bi-info-circle me-2"></i>
            Rate Limiting & Retry Logic
          </h6>
          <ul className="mb-0">
            <li>Starts with 10-second delays between requests</li>
            <li>Automatically retries on 429 errors with exponential backoff (10s, 20s, 40s)</li>
            <li>Base delay increases progressively on persistent rate limiting: 10s → 20s → 40s → 60s</li>
            <li>Resets to 10s after successful requests</li>
            <li>Up to 3 retry attempts per year before marking as failed</li>
            <li>Report IDs are automatically passed to the download component</li>
            <li>Exports include: dividends, interest, orders, and transactions</li>
            <li><strong>Note:</strong> Exports may take time to process on Trading212's servers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HistoryExport
