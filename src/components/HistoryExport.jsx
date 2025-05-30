import React, { useState, useEffect } from 'react'
import Trading212Service from '../services/Trading212Service'

const HistoryExport = ({ apiKey, onExportComplete }) => {
  const [startYear, setStartYear] = useState(new Date().getFullYear() - 1)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, currentYear: null, status: '' })
  const [exportedReports, setExportedReports] = useState([])
  const [existingExports, setExistingExports] = useState([])
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])

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
          status: `⏳ Rate limited - too many requests sent too quickly. Waiting ${backoffDelay/1000}s before retry...` 
        }))
        
        await delay(backoffDelay)
        return await exportHistoryByYear(year, retryCount + 1)
      }
      
      // Improve error message for 429 errors
      if (error.response?.status === 429) {
        throw new Error(`Rate limit exceeded (429) - You've sent too many requests too quickly. Trading212 servers are protecting against overload. Please wait a few minutes before trying again.`)
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

    setError(null)

    try {
      console.log('🔄 [HISTORY EXPORT] Loading existing exports (SINGLE REQUEST)...')
      const service = new Trading212Service(apiKey)
      const exports = await service.getExportHistory()
      
      console.log(`✅ [HISTORY EXPORT] Found ${exports.length} existing exports (NO MORE REQUESTS)`)
      setExistingExports(exports || [])
      
      // Extract and pass existing full-year export data to parent (ONE PER YEAR)
      const fullYearExportsMap = new Map()
      const outdatedExports = []
      
      exports
        .filter(exp => {
          const isFinished = exp.status?.toLowerCase() === 'finished'
          const hasReportId = exp.reportId
          const yearResult = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
          return isFinished && hasReportId && yearResult !== null
        })
        .forEach(exp => {
          const yearResult = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
          if (yearResult && !fullYearExportsMap.has(yearResult.year)) {
            console.log(`📅 [HISTORY EXPORT] Adding full-year export for ${yearResult.year}: ${exp.reportId} (${exp.timeFrom} to ${exp.timeTo})`)
            fullYearExportsMap.set(yearResult.year, exp)
            
            if (yearResult.isOutdated) {
              outdatedExports.push({ year: yearResult.year, reportId: exp.reportId, endDate: exp.timeTo })
            }
          } else if (yearResult) {
            console.log(`⚠️ [HISTORY EXPORT] Skipping duplicate year ${yearResult.year}: ${exp.reportId} (already have ${fullYearExportsMap.get(yearResult.year).reportId})`)
          }
        })
      
      // Generate suggestions for missing and outdated exports
      generateSuggestions(fullYearExportsMap, outdatedExports)
      
      const fullYearExports = Array.from(fullYearExportsMap.values())
      
      if (fullYearExports.length > 0 && onExportComplete) {
        console.log(`📤 [HISTORY EXPORT] Passing ${fullYearExports.length} unique full-year exports to parent:`, fullYearExports.map(e => `${getYearFromTimeRange(e.timeFrom, e.timeTo)?.year}: ${e.reportId}`))
        onExportComplete(fullYearExports)
      }
      
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Failed to load existing exports:', error)
      
      if (error.response?.status === 429) {
        setError(`Rate limit exceeded (429) - Too many requests sent too quickly. Trading212 servers need a break. Please wait 2-3 minutes before trying again.`)
      } else {
        setError(`Failed to load existing exports: ${error.message}`)
      }
    }
  }

  const generateSuggestions = (existingExportsMap, outdatedExports) => {
    const currentYear = getCurrentYear()
    const suggestions = []
    
    // Check for missing years from 2019 to current year
    for (let year = 2019; year <= currentYear; year++) {
      if (!existingExportsMap.has(year)) {
        suggestions.push({
          type: 'missing',
          year,
          message: `Missing export for year ${year}`,
          action: `Create export from ${year}-01-01 to ${year === currentYear ? 'current date' : year + '-12-31'}`
        })
      }
    }
    
    // Add outdated exports to suggestions
    outdatedExports.forEach(outdated => {
      suggestions.push({
        type: 'outdated',
        year: outdated.year,
        message: `${outdated.year} export is outdated (ends: ${new Date(outdated.endDate).toLocaleDateString()})`,
        action: `Update export to include data up to current date`
      })
    })
    
    console.log(`💡 [HISTORY EXPORT] Generated ${suggestions.length} suggestions:`, suggestions)
    setSuggestions(suggestions)
  }

  const getYearFromTimeRange = (timeFrom, timeTo) => {
    try {
      // Parse dates while preserving UTC timezone
      const fromDate = new Date(timeFrom)
      const toDate = new Date(timeTo)
      
      // Get UTC components to avoid timezone conversion issues
      const fromYear = fromDate.getUTCFullYear()
      const toYear = toDate.getUTCFullYear()
      const fromMonth = fromDate.getUTCMonth()
      const fromDay = fromDate.getUTCDate()
      const fromHour = fromDate.getUTCHours()
      const fromMinute = fromDate.getUTCMinutes()
      const fromSecond = fromDate.getUTCSeconds()
      
      const toMonth = toDate.getUTCMonth()
      const toDay = toDate.getUTCDate()
      
      console.log(`🔍 [HISTORY EXPORT] UTC Debug - fromYear: ${fromYear}, toYear: ${toYear}, fromMonth: ${fromMonth}, fromDay: ${fromDay}, toMonth: ${toMonth}, toDay: ${toDay}, fromHour: ${fromHour}, fromMinute: ${fromMinute}, fromSecond: ${fromSecond}`)
      
      // Check for full-year exports: January 1st to December 31st (any time on Dec 31st is OK)
      const isValidFullYear = (
        fromYear === toYear && // Same year
        fromMonth === 0 && fromDay === 1 && // Starts January 1st
        fromHour === 0 && fromMinute === 0 && fromSecond === 0 && // Starts at midnight UTC
        toMonth === 11 && toDay === 31 // Ends December 31st (any time is OK)
      )
      
      // Special case for current year - accept if it starts Jan 1st and goes to any date in current year
      const isCurrentYearExport = (
        fromYear === getCurrentYear() && toYear === getCurrentYear() &&
        fromMonth === 0 && fromDay === 1 && // Starts January 1st
        fromHour === 0 && fromMinute === 0 && fromSecond === 0 // Starts at midnight UTC
      )
      
      if (isValidFullYear || isCurrentYearExport) {
        console.log(`✅ [HISTORY EXPORT] Found full-year export for ${fromYear}: ${timeFrom} to ${timeTo}`)
        return { year: fromYear, isOutdated: isCurrentYearExport && isCurrentYearOutdated(toDate) }
      }
      
      console.log(`⚠️ [HISTORY EXPORT] Skipping partial/custom export: ${timeFrom} to ${timeTo}`)
      return null
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Error parsing date range:', error)
      return null
    }
  }

  const isCurrentYearOutdated = (exportEndDate) => {
    const today = new Date()
    const exportEnd = new Date(exportEndDate)
    
    // Consider outdated if export ends more than 7 days ago
    const daysDifference = Math.floor((today - exportEnd) / (1000 * 60 * 60 * 24))
    const isOutdated = daysDifference > 7
    
    if (isOutdated) {
      console.log(`📅 [HISTORY EXPORT] Current year export is outdated by ${daysDifference} days (ends: ${exportEndDate})`)
    }
    
    return isOutdated
  }

  const getExistingYearsCovered = () => {
    const coveredYears = new Set()
    const yearToReportIdMap = new Map()
    const currentYear = getCurrentYear()
    
    console.log('🔍 [HISTORY EXPORT] Analyzing existing exports for full-year coverage...')
    
    existingExports
      .filter(exp => exp.status?.toLowerCase() === 'finished')
      .forEach(exp => {
        const yearResult = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
        if (yearResult && !yearResult.isOutdated) {
          // Special case: Don't mark current year as covered - always allow re-export for current year
          if (yearResult.year !== currentYear) {
            coveredYears.add(yearResult.year)
            yearToReportIdMap.set(yearResult.year, exp.reportId)
            console.log(`📋 [HISTORY EXPORT] Year ${yearResult.year} already covered by Report ID: ${exp.reportId}`)
          } else {
            console.log(`📅 [HISTORY EXPORT] Current year ${yearResult.year} export exists but will allow re-export for latest data: ${exp.reportId}`)
          }
        } else if (yearResult && yearResult.isOutdated) {
          console.log(`⚠️ [HISTORY EXPORT] Year ${yearResult.year} export is outdated, will be re-exported: ${exp.reportId}`)
        }
      })
    
    const years = Array.from(coveredYears).sort((a, b) => a - b)
    console.log(`📊 [HISTORY EXPORT] Full years already covered (non-outdated, excluding current year): ${years.join(', ') || 'none'}`)
    console.log(`🔄 [HISTORY EXPORT] Current year ${currentYear} will always be available for re-export`)
    
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

    // Show which years already exist
    const alreadyExistingYears = requestedYears.filter(year => existingYears.includes(year))
    
    if (alreadyExistingYears.length > 0) {
      console.log(`ℹ️ [HISTORY EXPORT] Years that already have exports: ${alreadyExistingYears.join(', ')}`)
      
      // Add existing exports to the results display
      const existingReports = alreadyExistingYears.map(year => {
        const reportId = yearToReportIdMap.get(year)
        const exportData = existingExports.find(exp => exp.reportId === reportId)
        return {
          year,
          reportId,
          timeFrom: exportData?.timeFrom || `${year}-01-01T00:00:00Z`,
          timeTo: exportData?.timeTo || `${year}-12-31T23:59:55Z`,
          status: 'already_exists',
          timestamp: exportData?.timestamp || new Date().toISOString()
        }
      })
      
      setExportedReports(existingReports)
    }

    if (yearsToExport.length === 0) {
      setProgress({ 
        current: 0, 
        total: 0, 
        currentYear: null, 
        status: alreadyExistingYears.length > 0 
          ? `All requested years (${requestedYears.join(', ')}) already have exports! Using existing data.` 
          : `All requested years (${requestedYears.join(', ')}) are already exported!`
      })
      
      // Pass existing export data to parent
      if (alreadyExistingYears.length > 0 && onExportComplete) {
        const existingExportData = alreadyExistingYears
          .map(year => {
            const reportId = yearToReportIdMap.get(year)
            return existingExports.find(exp => exp.reportId === reportId)
          })
          .filter(Boolean)
        
        console.log(`📤 [HISTORY EXPORT] Passing ${existingExportData.length} existing export data to parent:`, existingExportData.map(e => `${getYearFromTimeRange(e.timeFrom, e.timeTo)?.year}: ${e.reportId}`))
        onExportComplete(existingExportData)
      }
      
      setTimeout(() => {
        setProgress({ current: 0, total: 0, currentYear: null, status: '' })
        setIsExporting(false)
      }, 5000)
      
      return
    }

    setProgress({ 
      current: 0, 
      total: yearsToExport.length, 
      currentYear: null, 
      status: alreadyExistingYears.length > 0 
        ? `Found ${alreadyExistingYears.length} existing exports. Need to export ${yearsToExport.length} new years.`
        : `Need to export ${yearsToExport.length} years.`
    })

    try {
      const reports = [...(exportedReports || [])] // Include existing reports
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
          setExportedReports(reports)
          
          // Collect successful report IDs
          if (report.reportId) {
            successfulReportIds.push(report.reportId)
            console.log(`📝 [HISTORY EXPORT] Added Report ID ${report.reportId} for year ${year}`)
          }

          // Successful request - wait base delay before next request
          if (i < yearsToExport.length - 1) {
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
          setExportedReports(reports)

          // If we still get rate limited after retries, increase base delay
          if (yearError.response?.status === 429) {
            const newDelay = Math.min(baseDelay * 2, 120000) // 20s -> 40s -> 80s -> 120s max
            console.log(`⚠️ [HISTORY EXPORT] Persistent rate limiting, increasing delay from ${baseDelay/1000}s to ${newDelay/1000}s`)
            baseDelay = newDelay
            
            setProgress(prev => ({ 
              ...prev, 
              status: `Rate limited, increasing delay to ${baseDelay/1000}s...` 
            }))
            await delay(baseDelay)
          } else {
            console.log(`⏳ [HISTORY EXPORT] Waiting ${baseDelay/1000}s after error before continuing...`)
            await delay(baseDelay)
          }
        }
      }

      const newExports = reports.filter(r => r.status === 'exported').length
      const existingCount = alreadyExistingYears.length
      
      console.log(`🎉 [HISTORY EXPORT] Export process completed. ${newExports}/${yearsToExport.length} new years exported successfully`)
      console.log(`📋 [HISTORY EXPORT] Total: ${newExports} new + ${existingCount} existing = ${newExports + existingCount} years covered`)
      
      setProgress(prev => ({ 
        ...prev, 
        status: `Completed! ${newExports} new exports + ${existingCount} existing = ${newExports + existingCount} years total`
      }))
      
      // Pass successful export data to parent component
      const allSuccessfulExports = reports
        .filter(r => r.status === 'exported')
        .map(r => ({
          reportId: r.reportId,
          timeFrom: r.timeFrom,
          timeTo: r.timeTo,
          status: 'finished',
          downloadLink: null
        }))
      
      if (allSuccessfulExports.length > 0 && onExportComplete) {
        console.log(`📤 [HISTORY EXPORT] Passing ${allSuccessfulExports.length} new export data to parent:`, allSuccessfulExports.map(e => `${e.timeFrom.split('-')[0]}: ${e.reportId}`))
        onExportComplete(allSuccessfulExports)
      }
      
    } catch (error) {
      console.error('❌ [HISTORY EXPORT] Export process failed:', error)
      
      if (error.response?.status === 429) {
        setError(`Export failed: Rate limit exceeded (429) - You've sent too many requests too quickly to Trading212 servers. This is a protective measure. Please wait 5-10 minutes before trying again.`)
      } else {
        setError(`Export failed: ${error.message}`)
      }
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
                  className={`history-export-item ${
                    report.status === 'exported' ? 'success' : 
                    report.status === 'already_exists' ? 'existing' : 'failed'
                  }`}
                >
                  <div className="history-export-item-icon">
                    <i className={`bi ${
                      report.status === 'exported' ? 'bi-check-circle' : 
                      report.status === 'already_exists' ? 'bi-info-circle' : 'bi-x-circle'
                    }`}></i>
                  </div>
                  <div className="history-export-item-content">
                    <div className="history-export-item-title">
                      Year {report.year}
                      {(report.status === 'exported' || report.status === 'already_exists') && (
                        <span className={`badge ${
                          report.status === 'exported' ? 'bg-success' : 'bg-info'
                        } ms-2`}>
                          Report ID: {report.reportId}
                        </span>
                      )}
                    </div>
                    {report.status === 'exported' ? (
                      <small className="text-muted">
                        ✅ New export: {report.timeFrom} to {report.timeTo}
                      </small>
                    ) : report.status === 'already_exists' ? (
                      <small className="text-muted">
                        ℹ️ Already exists: {report.timeFrom} to {report.timeTo}
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

        {/* Suggestions Display */}
        {suggestions.length > 0 && (
          <div className="history-export-suggestions">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-lightbulb me-2"></i>
              Suggestions
            </h6>
            <div className="alert alert-info">
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    <div className="suggestion-icon">
                      <i className={`bi ${suggestion.type === 'missing' ? 'bi-exclamation-circle' : 'bi-clock-history'}`}></i>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-message">{suggestion.message}</div>
                      <small className="suggestion-action text-muted">{suggestion.action}</small>
                    </div>
                  </div>
                ))}
              </div>
              {suggestions.some(s => s.type === 'missing' || s.type === 'outdated') && (
                <div className="mt-3">
                  <small className="text-muted">
                    💡 Tip: Set start year to {Math.min(...suggestions.map(s => s.year))} and click "Start Export" to create/update missing exports
                  </small>
                </div>
              )}
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
            <li>Starts with 20-second delays between requests</li>
            <li>Automatically retries on 429 errors with exponential backoff (20s, 40s, 80s)</li>
            <li>Base delay increases progressively on persistent rate limiting: 20s → 40s → 80s → 120s</li>
            <li>Resets to 20s after successful requests</li>
            <li>Up to 3 retry attempts per year before marking as failed</li>
            <li><strong>Current year special handling:</strong> Always allows re-export for latest data</li>
            <li>Exports include: dividends, interest, orders, and transactions</li>
            <li><strong>Note:</strong> Exports may take time to process on Trading212's servers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HistoryExport
