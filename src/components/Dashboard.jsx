import React, { useState, useEffect, useRef } from 'react'
import { Pie, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import Trading212Service from '../services/Trading212Service'
import HistoryExport from './HistoryExport'
import HistoryDownload from './HistoryDownload'
import TransactionAnalysis from './TransactionAnalysis'
import DividendAnalysis from './DividendAnalysis'
import InterestAnalysis from './InterestAnalysis'
import StockTradingAnalysis from './StockTradingAnalysis'
import '../styles/Dashboard.css'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Dashboard = ({ apiKey, onLogout, initialAccountData = null }) => {
  const [accountData, setAccountData] = useState(initialAccountData)
  const [loading, setLoading] = useState(!initialAccountData)
  const [error, setError] = useState(null)
  const [exportedReportIds, setExportedReportIds] = useState([])
  const [exportData, setExportData] = useState([])
  const [csvData, setCsvData] = useState([])
  const [showScrollNavbar, setShowScrollNavbar] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [scrollDirection, setScrollDirection] = useState('up')
  const hasInitialized = useRef(false)
  const serviceRef = useRef(null)

  useEffect(() => {
    // Ak máme initial dáta z App.jsx, nemusíme volať API
    if (initialAccountData) {
      console.log('💾 [DASHBOARD] Using initial account data from verification, skipping API call')
      console.log('📊 [DASHBOARD] Initial data:', initialAccountData)
      setAccountData(initialAccountData)
      setLoading(false)
      return
    }

    // Zabráni duplikovaným volaniám v development strict mode
    if (hasInitialized.current) return
    hasInitialized.current = true

    fetchAccountData()
  }, [initialAccountData])

  const fetchAccountData = async () => {
    if (!apiKey) {
      setError('No API key provided')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [DASHBOARD] Fetching fresh account data (manual refresh or no initial data)')
      
      // Vytvoríme service ak neexistuje
      if (!serviceRef.current) {
        console.log('🆕 [DASHBOARD] Creating new Trading212Service instance')
        serviceRef.current = new Trading212Service(apiKey)
      }
      
      const data = await serviceRef.current.getAccountCash()
      
      console.log('✅ [DASHBOARD] Account data loaded successfully')
      setAccountData(data)
    } catch (err) {
      console.error('❌ [DASHBOARD] Failed to fetch account data:', err)
      
      if (err.response?.status === 429) {
        setError('Rate limit exceeded (429) - Too many requests sent too quickly to Trading212. This protects their servers from overload. Please wait 20-30 seconds before refreshing.')
      } else {
        setError(`Error: ${err.response?.status || 'Unknown'} - ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    console.log('🔄 [DASHBOARD] Manual refresh triggered - will call API')
    
    // Reset pre manual refresh
    hasInitialized.current = false
    setTimeout(() => {
      hasInitialized.current = true
      fetchAccountData()
    }, 100)
  }

  const handleExportComplete = (exportDataArray) => {
    console.log('📝 [DASHBOARD] Received exported data:', exportDataArray.length, 'exports')
    
    setExportData(prev => {
      const yearMap = new Map()
      
      // First, process existing exports
      prev.forEach(exp => {
        const year = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
        if (year !== null) {
          const existing = yearMap.get(year)
          if (!existing) {
            yearMap.set(year, exp)
          } else {
            // Keep the one with the latest end date
            const existingEndDate = new Date(existing.timeTo)
            const newEndDate = new Date(exp.timeTo)
            if (newEndDate > existingEndDate) {
              yearMap.set(year, exp)
            }
          }
        }
      })
      
      // Then, process new exports (newer ones replace older ones for same year)
      exportDataArray.forEach(newExport => {
        const year = getYearFromTimeRange(newExport.timeFrom, newExport.timeTo)
        if (year !== null) {
          const existing = yearMap.get(year)
          if (!existing) {
            console.log(`📊 [DASHBOARD] Adding export for year ${year}: ${newExport.reportId}`)
            yearMap.set(year, newExport)
          } else {
            // Keep the one with the latest end date
            const existingEndDate = new Date(existing.timeTo)
            const newEndDate = new Date(newExport.timeTo)
            if (newEndDate > existingEndDate) {
              console.log(`📊 [DASHBOARD] Replacing export for year ${year}: ${existing.reportId} with newer ${newExport.reportId} (${newExport.timeTo} > ${existing.timeTo})`)
              yearMap.set(year, newExport)
            } else {
              console.log(`📊 [DASHBOARD] Keeping existing export for year ${year}: ${existing.reportId} (${existing.timeTo} >= ${newExport.timeTo})`)
            }
          }
        }
      })
      
      const combined = Array.from(yearMap.values())
      console.log('📊 [DASHBOARD] Updated export data list:', combined.length, 'total exports (exactly 1 per year, most recent only)')
      
      // Log final state
      combined.forEach(exp => {
        const year = getYearFromTimeRange(exp.timeFrom, exp.timeTo)
        console.log(`📅 [DASHBOARD] Year ${year}: ${exp.reportId} (${exp.timeTo})`)
      })
      
      return combined
    })

    // Keep reportIds for backward compatibility
    const reportIds = exportDataArray.map(exp => exp.reportId)
    setExportedReportIds(prev => {
      const combined = [...new Set([...prev, ...reportIds])]
      return combined
    })
  }

  const getYearFromTimeRange = (timeFrom, timeTo) => {
    if (!timeFrom || !timeTo) return null
    
    try {
      const fromDate = new Date(timeFrom)
      const toDate = new Date(timeTo)
      
      const fromYear = fromDate.getUTCFullYear()
      const toYear = toDate.getUTCFullYear()
      const fromMonth = fromDate.getUTCMonth()
      const fromDay = fromDate.getUTCDate()
      const fromHour = fromDate.getUTCHours()
      const fromMinute = fromDate.getUTCMinutes()
      const fromSecond = fromDate.getUTCSeconds()
      
      const toMonth = toDate.getUTCMonth()
      const toDay = toDate.getUTCDate()
      
      // Check for full-year exports
      const isValidFullYear = (
        fromYear === toYear && 
        fromMonth === 0 && fromDay === 1 && 
        fromHour === 0 && fromMinute === 0 && fromSecond === 0 && 
        toMonth === 11 && toDay === 31
      )
      
      // Special case for current year
      const isCurrentYearExport = (
        fromYear === new Date().getFullYear() && toYear === new Date().getFullYear() &&
        fromMonth === 0 && fromDay === 1 && 
        fromHour === 0 && fromMinute === 0 && fromSecond === 0
      )
      
      if (isValidFullYear || isCurrentYearExport) {
        return fromYear
      }
      
      return null
    } catch (error) {
      console.error('❌ [DASHBOARD] Error parsing date range:', error)
      return null
    }
  }

  const handleCsvDataLoaded = (data) => {
    console.log('📊 [DASHBOARD] Received CSV data:', data.length, 'transactions')
    setCsvData(data)
  }

  // Chart data preparation
  const prepareChartData = () => {
    if (!accountData) return null

    const portfolioData = {
      labels: ['Free Cash', 'Invested'],
      datasets: [
        {
          data: [accountData.free, accountData.invested],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(59, 130, 246)',
          ],
          borderWidth: 3,
          hoverBackgroundColor: [
            'rgba(16, 185, 129, 0.9)',
            'rgba(59, 130, 246, 0.9)',
          ],
          hoverBorderWidth: 4,
        },
      ],
    }

    const performanceData = {
      labels: ['Performance Metrics'],
      datasets: [
        {
          label: 'Realized P&L',
          data: [accountData.result],
          backgroundColor: accountData.result >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
          borderColor: accountData.result >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
          borderWidth: 0,
          borderRadius: 8,
          hoverBackgroundColor: accountData.result >= 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        },
        {
          label: 'Interest/PPL',
          data: [accountData.ppl],
          backgroundColor: accountData.ppl >= 0 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)',
          borderColor: accountData.ppl >= 0 ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)',
          borderWidth: 0,
          borderRadius: 8,
          hoverBackgroundColor: accountData.ppl >= 0 ? 'rgba(59, 130, 246, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        },
      ],
    }

    return { portfolioData, performanceData }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: '500',
            family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          },
          color: '#ffffff',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        footerColor: '#ffffff',
        borderColor: '#00a7e1',
        borderWidth: 2,
        cornerRadius: 12,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
          weight: '500',
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            const value = context.parsed || context.raw
            const label = context.label
            
            // Custom descriptions for portfolio data
            if (label === 'Free Cash') {
              return `Free Cash: €${value.toFixed(2)} - Available for trading`
            } else if (label === 'Invested') {
              return `Invested: €${value.toFixed(2)} - Currently in positions`
            }
            
            return `${label}: €${value.toFixed(2)}`
          },
        },
      },
    },
  }

  const barChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        footerColor: '#ffffff',
        borderColor: '#00a7e1',
        borderWidth: 2,
        cornerRadius: 12,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
          weight: '500',
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            const datasetLabel = context.dataset.label
            
            // Custom descriptions for performance data
            if (datasetLabel === 'Realized P&L') {
              return `Realized P&L: €${value.toFixed(2)} - Profit/Loss from closed positions`
            } else if (datasetLabel === 'Interest/PPL') {
              return `Interest/PPL: €${value.toFixed(2)} - Interest earnings and profit participating loans`
            }
            
            return `${datasetLabel}: €${value.toFixed(2)}`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          color: '#ffffff',
          font: {
            size: 12,
            weight: '500',
          },
          callback: function(value) {
            return '€' + value.toFixed(0)
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#ffffff',
          font: {
            size: 12,
            weight: '600',
          },
        },
      },
    },
  }

  const chartData = prepareChartData()

  // Scroll detection for floating navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Determine scroll direction
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down')
      } else {
        setScrollDirection('up')
      }
      
      // Show navbar when scrolling up and not at the top
      if (scrollDirection === 'up' && currentScrollY > 200) {
        setShowScrollNavbar(true)
      } else if (scrollDirection === 'down' || currentScrollY <= 100) {
        setShowScrollNavbar(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, scrollDirection])

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const offsetTop = element.offsetTop - 100 // Account for navbar height
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      })
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="text-center">
          <div className="spinner-border mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted fw-medium">Loading Trading212 data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Main Header */}
      <nav className="dashboard-navbar">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="dashboard-brand">
            <i className="bi bi-kanban me-2"></i>
            Portfolio Analytics Dashboard
          </span>
          <div className="d-flex gap-3">
            <button 
              className="btn btn-outline-light"
              onClick={handleRefresh}
              title="Refresh account data from Trading212"
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Refresh Data
            </button>
            <button 
              className="btn btn-outline-light"
              onClick={onLogout}
              title="Logout and return to login screen"
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Section Navigation */}
      <nav className={`floating-section-navbar ${showScrollNavbar ? 'show' : ''}`}>
        <div className="container">
          <div className="d-flex justify-content-center align-items-center">
            <div className="btn-group" role="group">
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('overview-section')}
                title="Portfolio Overview"
              >
                <i className="bi bi-house me-1"></i>
                Overview
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('export-section')}
                title="Export Trading History"
              >
                <i className="bi bi-download me-1"></i>
                Export
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('transaction-analysis-section')}
                title="Transaction Analysis"
              >
                <i className="bi bi-graph-up me-1"></i>
                Transactions
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('dividend-analysis-section')}
                title="Dividend Analysis"
              >
                <i className="bi bi-cash-coin me-1"></i>
                Dividends
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('interest-analysis-section')}
                title="Interest Analysis"
              >
                <i className="bi bi-percent me-1"></i>
                Interest
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('charts-section')}
                title="Trading Data Analysis"
              >
                <i className="bi bi-bar-chart me-1"></i>
                Charts
              </button>
              <button 
                className="btn btn-outline-light btn-sm"
                onClick={() => scrollToSection('stock-trading-section')}
                title="Stock Trading Analysis"
              >
                <i className="bi bi-graph-up-arrow me-1"></i>
                Trading
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* API Status */}
        <div className="dashboard-status-card" id="overview-section">
          <div className="dashboard-status-success">
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong>Connected to Trading212 API</strong>
              <br />
              <small className="dashboard-status-text">
                {initialAccountData ? 'Using cached data from verification' : 'Real-time data from Trading212 Demo API'}
                {' • '}Custom portfolio analytics dashboard
              </small>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="dashboard-error-card">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Account Data */}
        {accountData && (
          <>
            {/* Key Metrics Cards */}
            <div className="dashboard-metrics-grid">
              <div className="dashboard-metric-card dashboard-metric-total">
                <div className="dashboard-metric-icon">
                  <i className="bi bi-cash-stack"></i>
                </div>
                <div className="dashboard-metric-content">
                  <h6 className="dashboard-metric-title">Total</h6>
                  <h3 className="dashboard-metric-value">€{accountData.total.toFixed(2)}</h3>
                </div>
              </div>

              <div className="dashboard-metric-card dashboard-metric-free">
                <div className="dashboard-metric-icon">
                  <i className="bi bi-currency-euro"></i>
                </div>
                <div className="dashboard-metric-content">
                  <h6 className="dashboard-metric-title">Free Cash</h6>
                  <h3 className="dashboard-metric-value">€{accountData.free.toFixed(2)}</h3>
                </div>
              </div>

              <div className="dashboard-metric-card dashboard-metric-invested">
                <div className="dashboard-metric-icon">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <div className="dashboard-metric-content">
                  <h6 className="dashboard-metric-title">Invested</h6>
                  <h3 className="dashboard-metric-value">€{accountData.invested.toFixed(2)}</h3>
                </div>
              </div>

              <div className={`dashboard-metric-card ${accountData.result >= 0 ? 'dashboard-metric-profit' : 'dashboard-metric-loss'}`}>
                <div className="dashboard-metric-icon">
                  <i className={`bi ${accountData.result >= 0 ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle'}`}></i>
                </div>
                <div className="dashboard-metric-content">
                  <h6 className="dashboard-metric-title">Realized P&L</h6>
                  <h3 className="dashboard-metric-value">
                    {accountData.result >= 0 ? '+' : ''}€{accountData.result.toFixed(2)}
                  </h3>
                </div>
              </div>

              <div className={`dashboard-metric-card ${accountData.ppl >= 0 ? 'dashboard-metric-profit' : 'dashboard-metric-loss'}`}>
                <div className="dashboard-metric-icon">
                  <i className={`bi ${accountData.ppl >= 0 ? 'bi-percent' : 'bi-dash-circle'}`}></i>
                </div>
                <div className="dashboard-metric-content">
                  <h6 className="dashboard-metric-title">Interest/PPL</h6>
                  <h3 className="dashboard-metric-value">
                    {accountData.ppl >= 0 ? '+' : ''}€{accountData.ppl.toFixed(2)}
                  </h3>
                </div>
              </div>

              {accountData.pieCash && (
                <div className="dashboard-metric-card dashboard-metric-pie">
                  <div className="dashboard-metric-icon">
                    <i className="bi bi-pie-chart"></i>
                  </div>
                  <div className="dashboard-metric-content">
                    <h6 className="dashboard-metric-title">Pie Cash</h6>
                    <h3 className="dashboard-metric-value">€{accountData.pieCash.toFixed(2)}</h3>
                  </div>
                </div>
              )}
            </div>

            {/* History Export Section */}
            <div className="dashboard-section" id="export-section">
              <HistoryExport 
                apiKey={apiKey} 
                onExportComplete={handleExportComplete}
              />
            </div>

            {/* History Download Section */}
            <div className="dashboard-section">
              <HistoryDownload 
                apiKey={apiKey} 
                reportIds={exportedReportIds}
                exportData={exportData}
                onCsvDataLoaded={handleCsvDataLoaded}
              />
            </div>

            {/* Transaction Analysis Section */}
            <div className="dashboard-section" id="transaction-analysis-section">
              <TransactionAnalysis csvData={csvData} accountData={accountData} />
            </div>

            {/* Dividend Analysis Section */}
            <div className="dashboard-section" id="dividend-analysis-section">
              <DividendAnalysis csvData={csvData} />
            </div>

            {/* Interest Analysis Section */}
            <div className="dashboard-section" id="interest-analysis-section">
              <InterestAnalysis csvData={csvData} />
            </div>

            {/* Charts Section */}
            <div className="dashboard-charts-grid" id="charts-section">
              {/* Portfolio Distribution */}
              <div className="dashboard-chart-card">
                <div className="dashboard-chart-header">
                  <h5 className="dashboard-chart-title">
                    <i className="bi bi-pie-chart me-2"></i>
                    Portfolio Distribution
                  </h5>
                  <small className="dashboard-chart-subtitle">
                    Cash vs Investments
                  </small>
                </div>
                <div className="dashboard-chart-container">
                  {chartData && (
                    <Doughnut 
                      data={chartData.portfolioData} 
                      options={chartOptions}
                    />
                  )}
                </div>
              </div>

              {/* Performance Chart */}
              <div className="dashboard-chart-card">
                <div className="dashboard-chart-header">
                  <h5 className="dashboard-chart-title">
                    <i className="bi bi-bar-chart me-2"></i>
                    Performance Overview
                  </h5>
                  <small className="dashboard-chart-subtitle">
                    Realized P&L vs Interest/PPL
                  </small>
                </div>
                <div className="dashboard-chart-container">
                  {chartData && (
                    <Bar 
                      data={chartData.performanceData} 
                      options={barChartOptions}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Stock Trading Analysis Section */}
            <div className="dashboard-section" id="stock-trading-section">
              <StockTradingAnalysis csvData={csvData} />
            </div>

            {/* Last Updated Info */}
            <div className="dashboard-update-info">
              <i className="bi bi-clock me-2"></i>
              Last updated: {new Date().toLocaleTimeString()}
              {exportedReportIds.length > 0 && (
                <>
                  <br />
                  <small>Tracking {exportedReportIds.length} export report(s)</small>
                </>
              )}
              {csvData.length > 0 && (
                <>
                  <br />
                  <small>Analyzing {csvData.length} transaction(s)</small>
                </>
              )}
              {exportData.length > 0 && (
                <>
                  <br />
                  <small>Tracking {exportData.length} export report(s)</small>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard
