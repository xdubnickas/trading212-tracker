import React, { useState, useEffect } from 'react'
import Trading212Service from '../services/Trading212Service'

const HistoryDownload = ({ apiKey, reportIds = [], onCsvDataLoaded }) => {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [processingCsv, setProcessingCsv] = useState(false)
  const [csvStats, setCsvStats] = useState(null)
  const [pollingStatus, setPollingStatus] = useState({ active: false, message: '', reportId: null })

  useEffect(() => {
    // Auto-fetch when reportIds are provided
    if (reportIds.length > 0) {
      console.log('📥 [HISTORY DOWNLOAD] Auto-fetching exports for report IDs:', reportIds)
      fetchExportHistory()
    }
  }, [reportIds, apiKey])

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
      setError(`Error: ${err.response?.status || 'Unknown'} - ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const waitForExportCompletion = async (reportId, maxAttempts = 30, delayMs = 10000) => {
    console.log(`⏳ [HISTORY DOWNLOAD] Waiting for export ${reportId} to complete...`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setPollingStatus({
          active: true,
          message: `Checking export ${reportId} status... (${attempt}/${maxAttempts})`,
          reportId
        })

        console.log(`🔄 [HISTORY DOWNLOAD] Attempt ${attempt}/${maxAttempts} - Checking export ${reportId}`)
        
        const service = new Trading212Service(apiKey)
        const allExports = await service.getExportHistory()
        const targetExport = allExports.find(exp => exp.reportId === reportId)
        
        if (!targetExport) {
          throw new Error(`Export ${reportId} not found`)
        }
        
        console.log(`📊 [HISTORY DOWNLOAD] Export ${reportId} status: ${targetExport.status}`)
        
        if (targetExport.status?.toLowerCase() === 'finished') {
          console.log(`✅ [HISTORY DOWNLOAD] Export ${reportId} is ready!`)
          setPollingStatus({ active: false, message: '', reportId: null })
          return targetExport
        }
        
        if (targetExport.status?.toLowerCase() === 'failed') {
          throw new Error(`Export ${reportId} failed on Trading212 servers`)
        }
        
        // Still processing, wait before next check
        if (attempt < maxAttempts) {
          const waitTime = delayMs / 1000
          console.log(`⏳ [HISTORY DOWNLOAD] Export ${reportId} still processing, waiting ${waitTime}s before retry...`)
          setPollingStatus({
            active: true,
            message: `Export ${reportId} still processing, waiting ${waitTime}s... (${attempt}/${maxAttempts})`,
            reportId
          })
          await delay(delayMs)
        }
        
      } catch (error) {
        console.error(`❌ [HISTORY DOWNLOAD] Error checking export ${reportId} status:`, error)
        setPollingStatus({ active: false, message: '', reportId: null })
        throw error
      }
    }
    
    setPollingStatus({ active: false, message: '', reportId: null })
    throw new Error(`Export ${reportId} did not complete after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 60000} minutes)`)
  }

  const processCsvData = async (exportsList) => {
    setProcessingCsv(true)
    setCsvData([])
    setCsvStats(null)

    try {
      console.log('📊 [HISTORY DOWNLOAD] Processing CSV data for report IDs:', reportIds)
      
      // Filter exports to only our report IDs
      let targetExports = exportsList.filter(exp => reportIds.includes(exp.reportId))
      
      console.log(`📋 [HISTORY DOWNLOAD] Found ${targetExports.length} target exports`)
      
      // Wait for any processing exports to complete
      const updatedExports = []
      for (const exportItem of targetExports) {
        if (exportItem.status?.toLowerCase() === 'processing') {
          try {
            console.log(`⏳ [HISTORY DOWNLOAD] Export ${exportItem.reportId} is processing, waiting for completion...`)
            const completedExport = await waitForExportCompletion(exportItem.reportId)
            updatedExports.push(completedExport)
          } catch (error) {
            console.error(`❌ [HISTORY DOWNLOAD] Failed to wait for export ${exportItem.reportId}:`, error)
            updatedExports.push(exportItem) // Keep original even if failed
          }
        } else {
          updatedExports.push(exportItem)
        }
      }
      
      // Now filter only finished exports with download links
      const finishedExports = updatedExports.filter(exp => 
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

      setCsvData(allCsvData)
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
      
      // Update exports list with completed ones
      setExports(prev => {
        const updated = [...prev]
        updatedExports.forEach(updatedExport => {
          const index = updated.findIndex(exp => exp.reportId === updatedExport.reportId)
          if (index !== -1) {
            updated[index] = updatedExport
          }
        })
        return updated
      })
      
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

  const handleDownload = async (downloadLink, reportId, timeFrom, timeTo) => {
    try {
      console.log(`📥 [HISTORY DOWNLOAD] Downloading report ${reportId}...`)
      
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadLink
      link.download = `trading212_export_${reportId}_${timeFrom.split('T')[0]}_to_${timeTo.split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`✅ [HISTORY DOWNLOAD] Download started for report ${reportId}`)
    } catch (error) {
      console.error(`❌ [HISTORY DOWNLOAD] Download failed for report ${reportId}:`, error)
      setError(`Download failed: ${error.message}`)
    }
  }

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

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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

        {/* Report IDs Display */}
        {reportIds.length > 0 && (
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
