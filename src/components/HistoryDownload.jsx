import React, { useState, useEffect } from 'react'
import Trading212Service from '../services/Trading212Service'

const HistoryDownload = ({ apiKey, reportIds = [], exportData = [], onCsvDataLoaded }) => {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingCsv, setProcessingCsv] = useState(false)
  const [csvStats, setCsvStats] = useState(null)
  const [pollingStatus, setPollingStatus] = useState({ active: false, message: '', reportId: null })

  // Helper function to extract year from export
  const getYearFromExport = (exportItem) => {
    if (!exportItem?.timeFrom) return null
    
    try {
      const fromDate = new Date(exportItem.timeFrom)
      const toDate = new Date(exportItem.timeTo)
      
      const fromYear = fromDate.getUTCFullYear()
      const toYear = toDate.getUTCFullYear()
      const fromMonth = fromDate.getUTCMonth()
      const fromDay = fromDate.getUTCDate()
      const fromHour = fromDate.getUTCHours()
      const fromMinute = fromDate.getUTCMinutes()
      const fromSecond = fromDate.getUTCSeconds()
      
      const toMonth = toDate.getUTCMonth()
      const toDay = toDate.getUTCDate()
      
      // Check for full-year exports: January 1st to December 31st OR current year partial
      const isValidFullYear = (
        fromYear === toYear && // Same year
        fromMonth === 0 && fromDay === 1 && // Starts January 1st
        fromHour === 0 && fromMinute === 0 && fromSecond === 0 && // Starts at midnight UTC
        (toMonth === 11 && toDay === 31) // Ends December 31st (any time is OK)
      )
      
      // Special case for current year - accept if it starts Jan 1st
      const isCurrentYearExport = (
        fromYear === new Date().getFullYear() && toYear === new Date().getFullYear() &&
        fromMonth === 0 && fromDay === 1 && // Starts January 1st
        fromHour === 0 && fromMinute === 0 && fromSecond === 0 // Starts at midnight UTC
      )
      
      if (isValidFullYear || isCurrentYearExport) {
        return fromYear
      }
      
      return null
    } catch (error) {
      console.error('❌ [HISTORY DOWNLOAD] Error parsing export date range:', error)
      return null
    }
  }

  useEffect(() => {
    // Use existing export data instead of making API calls
    if (exportData.length > 0) {
      console.log('📥 [HISTORY DOWNLOAD] Using existing export data, no API call needed:', exportData.length, 'exports')
      
      // Merge with existing exports but keep only one per year (latest)
      setExports(prev => {
        const mergedExports = [...prev]
        
        exportData.forEach(newExport => {
          const existingIndex = mergedExports.findIndex(exp => {
            const existingYear = getYearFromExport(exp)
            const newYear = getYearFromExport(newExport)
            return existingYear === newYear && existingYear !== null
          })
          
          if (existingIndex !== -1) {
            // Replace existing export for this year with newer one
            console.log(`🔄 [HISTORY DOWNLOAD] Replacing existing export for year ${getYearFromExport(newExport)} with newer one: ${newExport.reportId}`)
            mergedExports[existingIndex] = newExport
          } else {
            // Add new export for year that doesn't exist
            console.log(`➕ [HISTORY DOWNLOAD] Adding new export for year ${getYearFromExport(newExport)}: ${newExport.reportId}`)
            mergedExports.push(newExport)
          }
        })
        
        console.log(`📊 [HISTORY DOWNLOAD] Final exports count: ${mergedExports.length} (max 1 per year)`)
        return mergedExports
      })
      
      processCsvData(exportData)
    } else if (reportIds.length > 0) {
      console.log('📥 [HISTORY DOWNLOAD] Have report IDs but no export data, fetching from API:', reportIds)
      fetchExportHistory()
    }
  }, [exportData, reportIds, apiKey])

  const fetchExportHistory = async () => {
    if (!apiKey) {
      setError('No API key provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 [HISTORY DOWNLOAD] Fetching export history...')
      const service = new Trading212Service(apiKey)
      const data = await service.getExportHistory()
      
      console.log('✅ [HISTORY DOWNLOAD] Export history loaded:', data)
      setExports(data || [])
      
      // Auto-process CSV data if we have specific report IDs
      if (reportIds.length > 0) {
        await processCsvData(data || [])
      }
    } catch (err) {
      console.error('❌ [HISTORY DOWNLOAD] Failed to fetch export history:', err)
      
      if (err.response?.status === 429) {
        setError(`Rate limit exceeded (429) - Too many requests sent too quickly. Trading212 servers are protecting against overload. Please wait 20-30 seconds before refreshing.`)
      } else {
        setError(`Error: ${err.response?.status || 'Unknown'} - ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }


  const processCsvData = async (exportsList) => {
    setProcessingCsv(true)
    setCsvStats(null)

    try {
      console.log('📊 [HISTORY DOWNLOAD] Processing CSV data from export data:', exportsList.length, 'exports')
      
      // Use exportsList directly - these should already be filtered full-year exports
      let targetExports = exportsList
      
      // If we still have reportIds for backward compatibility, filter by them
      if (reportIds.length > 0 && exportData.length === 0) {
        console.log('📋 [HISTORY DOWNLOAD] Filtering by report IDs for backward compatibility:', reportIds)
        targetExports = exportsList.filter(exp => reportIds.includes(exp.reportId))
      }
      
      console.log(`📋 [HISTORY DOWNLOAD] Processing ${targetExports.length} target exports`)
      
      // Log what we're processing
      targetExports.forEach(exp => {
        console.log(`📅 [HISTORY DOWNLOAD] Export ${exp.reportId}: ${exp.timeFrom} to ${exp.timeTo} (${exp.status})`)
      })

      // Now filter only finished exports with download links
      const finishedExports = targetExports.filter(exp => 
        exp.status?.toLowerCase() === 'finished' && exp.downloadLink
      )
      
      console.log(`📥 [HISTORY DOWNLOAD] ${finishedExports.length} exports ready for download`)

      const allCsvData = []
      let totalTransactions = 0
      let dateRange = { earliest: null, latest: null }

      for (const exportItem of finishedExports) {
        try {
          console.log(`📥 [HISTORY DOWNLOAD] Downloading CSV for report ${exportItem.reportId}...`)
          
          // Fetch CSV data
          const csvText = await fetchCsvThroughProxy(exportItem.downloadLink)
          const csvRows = parseCsv(csvText)
          
          console.log(`✅ [HISTORY DOWNLOAD] Report ${exportItem.reportId}: ${csvRows.length} rows`)
          
          // Add report metadata to each row
          const enhancedRows = csvRows.map(row => ({
            ...row,
            reportId: exportItem.reportId,
            reportTimeFrom: exportItem.timeFrom,
            reportTimeTo: exportItem.timeTo
          }))
          
          allCsvData.push(...enhancedRows)
          totalTransactions += csvRows.length
          
          // Track date range
          if (exportItem.timeFrom) {
            const fromDate = new Date(exportItem.timeFrom)
            if (!dateRange.earliest || fromDate < dateRange.earliest) {
              dateRange.earliest = fromDate
            }
          }
          
          if (exportItem.timeTo) {
            const toDate = new Date(exportItem.timeTo)
            if (!dateRange.latest || toDate > dateRange.latest) {
              dateRange.latest = toDate
            }
          }
          
        } catch (csvError) {
          console.error(`❌ [HISTORY DOWNLOAD] Failed to process CSV for report ${exportItem.reportId}:`, csvError)
        }
      }

      // Sort by date if possible
      allCsvData.sort((a, b) => {
        if (a.Time && b.Time) {
          return new Date(a.Time) - new Date(b.Time)
        }
        return 0
      })

      setCsvStats({
        totalTransactions,
        totalReports: finishedExports.length,
        dateRange,
        dataTypes: getDataTypes(allCsvData)
      })

      console.log(`🎉 [HISTORY DOWNLOAD] CSV processing completed: ${totalTransactions} transactions from ${finishedExports.length} reports`)
      
      // Pass CSV data to parent component for analysis
      if (onCsvDataLoaded && allCsvData.length > 0) {
        console.log(`📤 [HISTORY DOWNLOAD] Passing ${allCsvData.length} CSV records to parent for analysis`)
        onCsvDataLoaded(allCsvData)
      }
      
      // Don't update exports list here to avoid duplicates - it's already managed in useEffect
      
    } catch (error) {
      console.error('❌ [HISTORY DOWNLOAD] CSV processing failed:', error)
      setError(`CSV processing failed: ${error.message}`)
    } finally {
      setProcessingCsv(false)
      setPollingStatus({ active: false, message: '', reportId: null })
    }
  }

  const fetchCsvThroughProxy = async (downloadLink) => {
    try {
      // Extract the path from the S3 URL for proxy
      const url = new URL(downloadLink)
      const proxyPath = `/csv-proxy${url.pathname}${url.search}`
      
      console.log(`🔄 [HISTORY DOWNLOAD] Using proxy path: ${proxyPath}`)
      
      const response = await fetch(proxyPath, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,*/*'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Proxy fetch failed: HTTP ${response.status}`)
      }
      
      const csvText = await response.text()
      console.log(`✅ [HISTORY DOWNLOAD] CSV data fetched successfully (${csvText.length} characters)`)
      
      return csvText
    } catch (error) {
      console.error('❌ [HISTORY DOWNLOAD] Proxy fetch failed:', error)
      throw new Error(`Failed to download CSV: ${error.message}. CORS policy prevents direct download.`)
    }
  }

  const parseCsv = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length === headers.length) {
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })
        rows.push(row)
      }
    }

    return rows
  }

  const getDataTypes = (data) => {
    const types = new Set()
    data.forEach(row => {
      if (row.Action) types.add(row.Action)
      if (row.Type) types.add(row.Type)
    })
    return Array.from(types)
  }

  const getFilteredExports = () => {
    if (reportIds.length === 0) {
      return exports
    }
    return exports.filter(exp => reportIds.includes(exp.reportId))
  }

  // Removed unused handleDownload function

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'finished':
        return <span className="badge bg-success">Finished</span>
      case 'processing':
        return <span className="badge bg-warning">Processing</span>
      case 'failed':
        return <span className="badge bg-danger">Failed</span>
      default:
        return <span className="badge bg-secondary">{status || 'Unknown'}</span>
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const filteredExports = getFilteredExports()

  // Removing unused function
  // const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  return (
    <div className="history-download-container">
      <div className="history-download-card">
        <div className="history-download-header">
          <h5 className="history-download-title">
            <i className="bi bi-file-earmark-spreadsheet me-2"></i>
            Trading Data Analysis
          </h5>
          <p className="history-download-subtitle">
            Automatically download and analyze CSV data from exported reports
          </p>
        </div>

        {/* Report Data Display */}
        {exportData.length > 0 && (
          <div className="alert alert-info d-flex align-items-center mb-3">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>Using existing export data ({exportData.length} export(s))</strong>
              <br />
              <small>No additional API calls needed - data received from export process</small>
            </div>
          </div>
        )}

        {/* Report IDs Display - only show if no exportData */}
        {reportIds.length > 0 && exportData.length === 0 && (
          <div className="alert alert-info d-flex align-items-center mb-3">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>Tracking {reportIds.length} export(s)</strong>
              <br />
              <small>Report IDs: {reportIds.join(', ')}</small>
            </div>
          </div>
        )}

        {/* Polling Status */}
        {pollingStatus.active && (
          <div className="alert alert-warning d-flex align-items-center mb-3">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            {pollingStatus.message}
          </div>
        )}

        {/* Processing Status */}
        {(loading || processingCsv) && !pollingStatus.active && (
          <div className="alert alert-primary d-flex align-items-center mb-3">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            {loading ? 'Checking export status...' : 'Processing CSV data...'}
          </div>
        )}

        {/* CSV Stats */}
        {csvStats && (
          <div className="history-download-stats">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-graph-up me-2"></i>
              Data Summary
            </h6>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">{csvStats.totalTransactions}</h5>
                    <p className="card-text small mb-0">Total Transactions</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">{csvStats.totalReports}</h5>
                    <p className="card-text small mb-0">Reports Processed</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-warning">{csvStats.dataTypes.length}</h5>
                    <p className="card-text small mb-0">Data Types</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">
                      {csvStats.dateRange.earliest ? 
                        Math.ceil((csvStats.dateRange.latest - csvStats.dateRange.earliest) / (1000 * 60 * 60 * 24)) : 0}
                    </h5>
                    <p className="card-text small mb-0">Days Range</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Export List */}
        {filteredExports.length > 0 && (
          <div className="history-download-results">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-medium mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Export Reports {reportIds.length > 0 && `(${filteredExports.length} matched)`}
              </h6>
              <button
                className="btn btn-primary btn-sm"
                onClick={fetchExportHistory}
                disabled={loading || !apiKey}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>

            <div className="history-download-list">
              {filteredExports.map((exportItem, index) => (
                <div key={index} className="history-download-item">
                  <div className="history-download-item-header">
                    <div className="history-download-item-info">
                      <h6 className="history-download-item-title">
                        Report ID: {exportItem.reportId}
                        {getStatusBadge(exportItem.status)}
                      </h6>
                      <div className="history-download-item-dates">
                        <small className="text-muted">
                          <i className="bi bi-calendar-range me-1"></i>
                          {formatDate(exportItem.timeFrom)} - {formatDate(exportItem.timeTo)}
                        </small>
                      </div>
                    </div>
                    <div className="history-download-item-actions">
                      {exportItem.status?.toLowerCase() === 'finished' && exportItem.downloadLink ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Data Loaded
                        </span>
                      ) : exportItem.status?.toLowerCase() === 'processing' ? (
                        <span className="badge bg-warning">
                          <i className="bi bi-clock me-1"></i>
                          Processing...
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="bi bi-x-circle me-1"></i>
                          Not Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="history-download-info">
          <h6 className="fw-medium mb-2">
            <i className="bi bi-info-circle me-2"></i>
            Automated Processing
          </h6>
          <ul className="mb-0">
            <li>CSV data is automatically downloaded and combined from all finished exports</li>
            <li>Waits for "Processing" exports to complete (up to 5 minutes per export)</li>
            <li>Checks export status every 10 seconds until ready</li>
            <li>Data is sorted chronologically and enhanced with report metadata</li>
            <li>All transaction types are included: orders, dividends, interest, transfers</li>
            <li>Processing happens automatically when export reports are completed</li>
            <li>Combined data can be used for advanced analysis and visualization</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HistoryDownload
