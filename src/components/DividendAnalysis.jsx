import React, { useState } from 'react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

const DividendAnalysis = ({ csvData = [] }) => {
  const [showAllDividends, setShowAllDividends] = useState(false)
  const [showAllTopStocks, setShowAllTopStocks] = useState(false)

  const analyzeDividends = () => {
    if (!csvData || csvData.length === 0) {
      console.log('📊 [DIVIDEND ANALYSIS] No CSV data available for dividend analysis')
      return {
        totalDividends: 0,
        dividendCount: 0,
        dividendDetails: [],
        dividendsByStock: {},
        dividendsByMonth: {},
        dividendsByYear: {},
        dividendsByType: {},
        averageDividend: 0,
        topDividendStocks: [],
        dateRange: null
      }
    }

    console.log('📊 [DIVIDEND ANALYSIS] Analyzing dividend data from', csvData.length, 'transactions')

    // Filter dividend transactions - including all dividend types
    const dividendTransactions = csvData.filter(transaction => 
      transaction.Action && (
        transaction.Action.toLowerCase().includes('dividend') ||
        transaction.Action.toLowerCase() === 'dividend (dividend)' ||
        transaction.Action.toLowerCase() === 'dividend (dividend manufactured payment)' ||
        transaction.Action.toLowerCase() === 'dividend (tax exempted)'
      )
    )

    console.log('💰 [DIVIDEND ANALYSIS] Found', dividendTransactions.length, 'dividend transactions')

    if (dividendTransactions.length === 0) {
      return {
        totalDividends: 0,
        dividendCount: 0,
        dividendDetails: [],
        dividendsByStock: {},
        dividendsByMonth: {},
        dividendsByYear: {},
        dividendsByType: {},
        averageDividend: 0,
        topDividendStocks: [],
        dateRange: null
      }
    }

    let totalDividends = 0
    const dividendDetails = []
    const dividendsByStock = {}
    const dividendsByMonth = {}
    const dividendsByYear = {}
    const dividendsByType = {}

    dividendTransactions.forEach((transaction, index) => {
      const amount = parseFloat(transaction.Total) || 0
      const ticker = transaction.Ticker || 'Unknown'
      const date = new Date(transaction.Time)
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      
      // Extract dividend type from Action field
      let dividendType = 'Regular Dividend'
      const action = transaction.Action || ''
      
      if (action.toLowerCase().includes('manufactured payment')) {
        dividendType = 'Manufactured Payment'
      } else if (action.toLowerCase().includes('tax exempted')) {
        dividendType = 'Tax Exempted'
      } else if (action.toLowerCase().includes('dividend')) {
        dividendType = 'Regular Dividend'
      }

      console.log(`💸 [DIVIDEND ANALYSIS] Processing ${dividendType}:`, {
        ticker,
        amount,
        date: transaction.Time,
        action: action
      })

      totalDividends += amount

      dividendDetails.push({
        date: transaction.Time,
        ticker: ticker,
        amount: amount,
        currency: transaction['Currency (Total)'] || 'EUR',
        shares: parseFloat(transaction['No. of shares']) || 0,
        name: transaction.Name || ticker,
        id: transaction.ID,
        type: dividendType,
        originalAction: action,
        originalIndex: index
      })

      // Group by stock
      if (!dividendsByStock[ticker]) {
        dividendsByStock[ticker] = {
          ticker,
          name: transaction.Name || ticker,
          total: 0,
          count: 0,
          dividends: [],
          byType: {}
        }
      }
      dividendsByStock[ticker].total += amount
      dividendsByStock[ticker].count += 1
      dividendsByStock[ticker].dividends.push({
        date: transaction.Time,
        amount: amount,
        shares: parseFloat(transaction['No. of shares']) || 0,
        type: dividendType
      })
      
      // Track by type for each stock
      if (!dividendsByStock[ticker].byType[dividendType]) {
        dividendsByStock[ticker].byType[dividendType] = { total: 0, count: 0 }
      }
      dividendsByStock[ticker].byType[dividendType].total += amount
      dividendsByStock[ticker].byType[dividendType].count += 1

      // Group by month (all years combined)
      if (!dividendsByMonth[month]) {
        dividendsByMonth[month] = {
          month,
          total: 0,
          count: 0,
          byType: {}
        }
      }
      dividendsByMonth[month].total += amount
      dividendsByMonth[month].count += 1
      
      if (!dividendsByMonth[month].byType[dividendType]) {
        dividendsByMonth[month].byType[dividendType] = { total: 0, count: 0 }
      }
      dividendsByMonth[month].byType[dividendType].total += amount
      dividendsByMonth[month].byType[dividendType].count += 1

      // Group by year
      if (!dividendsByYear[year]) {
        dividendsByYear[year] = {
          year,
          total: 0,
          count: 0,
          byType: {}
        }
      }
      dividendsByYear[year].total += amount
      dividendsByYear[year].count += 1
      
      if (!dividendsByYear[year].byType[dividendType]) {
        dividendsByYear[year].byType[dividendType] = { total: 0, count: 0 }
      }
      dividendsByYear[year].byType[dividendType].total += amount
      dividendsByYear[year].byType[dividendType].count += 1

      // Group by dividend type
      if (!dividendsByType[dividendType]) {
        dividendsByType[dividendType] = {
          type: dividendType,
          total: 0,
          count: 0,
          stocks: new Set(),
          details: []
        }
      }
      dividendsByType[dividendType].total += amount
      dividendsByType[dividendType].count += 1
      dividendsByType[dividendType].stocks.add(ticker)
      dividendsByType[dividendType].details.push({
        date: transaction.Time,
        ticker,
        name: transaction.Name || ticker,
        amount,
        shares: parseFloat(transaction['No. of shares']) || 0
      })
    })

    // Convert stocks Set to count for each type
    Object.keys(dividendsByType).forEach(type => {
      dividendsByType[type].uniqueStocks = dividendsByType[type].stocks.size
      delete dividendsByType[type].stocks // Remove Set object for cleaner data
    })

    console.log('💰 [DIVIDEND ANALYSIS] Dividends by type:', dividendsByType)

    // Sort dividend details by date (newest first)
    dividendDetails.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Calculate average dividend
    const averageDividend = totalDividends / dividendTransactions.length

    // Get top dividend paying stocks
    const topDividendStocks = Object.values(dividendsByStock)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Date range
    const dates = dividendTransactions
      .map(t => new Date(t.Time))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b)

    const dateRange = dates.length > 0 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      totalDays: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
    } : null

    return {
      totalDividends,
      dividendCount: dividendTransactions.length,
      dividendDetails,
      dividendsByStock,
      dividendsByMonth,
      dividendsByYear,
      dividendsByType,
      averageDividend,
      topDividendStocks,
      dateRange
    }
  }

  const analysis = analyzeDividends()

  // Prepare monthly dividends chart data
  const prepareMonthlyDividendsChart = () => {
    if (Object.keys(analysis.dividendsByMonth).length === 0) return null

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Monthly Dividends (All Years Combined)',
          data: monthNames.map((_, index) => {
            const month = index + 1
            return analysis.dividendsByMonth[month]?.total || 0
          }),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(34, 197, 94, 0.9)',
        },
      ],
    }
  }

  // Prepare yearly dividends chart data
  const prepareYearlyDividendsChart = () => {
    if (Object.keys(analysis.dividendsByYear).length === 0) return null

    const years = Object.keys(analysis.dividendsByYear).sort()
    
    return {
      labels: years,
      datasets: [
        {
          label: 'Annual Dividends',
          data: years.map(year => analysis.dividendsByYear[year].total),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    }
  }

  // Prepare dividend types chart data
  const prepareDividendTypesChart = () => {
    if (Object.keys(analysis.dividendsByType).length === 0) return null

    const types = Object.keys(analysis.dividendsByType)
    const colors = {
      'Regular Dividend': 'rgba(34, 197, 94, 0.8)',
      'Manufactured Payment': 'rgba(59, 130, 246, 0.8)',
      'Tax Exempted': 'rgba(168, 85, 247, 0.8)'
    }
    
    return {
      labels: types,
      datasets: [
        {
          label: 'Dividend Amount by Type',
          data: types.map(type => analysis.dividendsByType[type].total),
          backgroundColor: types.map(type => colors[type] || 'rgba(107, 114, 128, 0.8)'),
          borderColor: types.map(type => colors[type]?.replace('0.8', '1') || 'rgb(107, 114, 128)'),
          borderWidth: 2,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#22c55e',
        borderWidth: 2,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value) {
            return '€' + value.toFixed(2)
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#22c55e',
        borderWidth: 2,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const type = context.label
            const typeData = analysis.dividendsByType[type]
            const percentage = ((typeData.total / analysis.totalDividends) * 100).toFixed(1)
            return [
              `${type}: €${typeData.total.toFixed(2)}`,
              `${typeData.count} payments (${percentage}%)`,
              `${typeData.uniqueStocks} unique stocks`
            ]
          },
        },
      },
    },
  }

  const monthlyChart = prepareMonthlyDividendsChart()
  const yearlyChart = prepareYearlyDividendsChart()
  const typesChart = prepareDividendTypesChart()

  return (
    <div className="dividend-analysis-container">
      <div className="transaction-analysis-card">
        <div className="transaction-analysis-header">
          <h5 className="transaction-analysis-title">
            <i className="bi bi-cash-coin me-2"></i>
            Dividend Analysis
          </h5>
          <p className="transaction-analysis-subtitle">
            Comprehensive analysis of dividend payments from your portfolio
          </p>
        </div>

        {analysis.dividendCount > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 bg-success bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">
                      €{analysis.totalDividends.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Total Dividends
                      <br />
                      <small className="text-muted">All time earnings</small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 bg-info bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">
                      {analysis.dividendCount}
                    </h5>
                    <p className="card-text small mb-0">
                      Dividend Payments
                      <br />
                      <small className="text-muted">Total transactions</small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 bg-warning bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-warning">
                      €{analysis.averageDividend.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Average Payment
                      <br />
                      <small className="text-muted">Per transaction</small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border-0 bg-primary bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">
                      {Object.keys(analysis.dividendsByType).length}
                    </h5>
                    <p className="card-text small mb-0">
                      Dividend Types
                      <br />
                      <small className="text-muted">Different categories</small>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dividend Types Summary */}
            {Object.keys(analysis.dividendsByType).length > 0 && (
              <div className="mb-4">
                <h6 className="fw-medium mb-3">
                  <i className="bi bi-pie-chart me-2"></i>
                  Dividend Types Breakdown
                </h6>
                
                <div className="row g-3 mb-4">
                  {Object.values(analysis.dividendsByType).map((typeData, index) => {
                    const percentage = ((typeData.total / analysis.totalDividends) * 100).toFixed(1)
                    const avgPerPayment = typeData.total / typeData.count
                    
                    let badgeClass = 'bg-success'
                    let iconClass = 'bi-cash-coin'
                    
                    if (typeData.type === 'Manufactured Payment') {
                      badgeClass = 'bg-info'
                      iconClass = 'bi-gear-fill'
                    } else if (typeData.type === 'Tax Exempted') {
                      badgeClass = 'bg-warning'
                      iconClass = 'bi-shield-check'
                    }
                    
                    return (
                      <div key={typeData.type} className="col-md-4">
                        <div className="card border-0 bg-light">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title mb-0">
                                <i className={`bi ${iconClass} me-2`}></i>
                                {typeData.type}
                              </h6>
                              <span className={`badge ${badgeClass}`}>
                                {percentage}%
                              </span>
                            </div>
                            <p className="card-text mb-2">
                              <strong className="text-success">€{typeData.total.toFixed(2)}</strong>
                            </p>
                            <div className="d-flex justify-content-between">
                              <small className="text-muted">
                                {typeData.count} payments
                              </small>
                              <small className="text-muted">
                                {typeData.uniqueStocks} stocks
                              </small>
                            </div>
                            <div className="mt-2">
                              <small className="text-muted">
                                Avg: €{avgPerPayment.toFixed(2)}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            {(monthlyChart || yearlyChart || typesChart) && (
              <div className="row g-4 mb-4">
                {typesChart && (
                  <div className="col-md-4">
                    <div className="card border-0">
                      <div className="card-header bg-light">
                        <h6 className="fw-medium mb-0">
                          <i className="bi bi-pie-chart me-2"></i>
                          Dividend Types Distribution
                        </h6>
                        <small className="text-muted">
                          By total amount received
                        </small>
                      </div>
                      <div className="card-body">
                        <div style={{ height: '300px' }}>
                          <Doughnut data={typesChart} options={doughnutOptions} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {monthlyChart && (
                  <div className="col-md-4">
                    <div className="card border-0">
                      <div className="card-header bg-light">
                        <h6 className="fw-medium mb-0">
                          <i className="bi bi-bar-chart me-2"></i>
                          Monthly Dividend Pattern
                        </h6>
                        <small className="text-muted">
                          Dividends by month (all years combined)
                        </small>
                      </div>
                      <div className="card-body">
                        <div style={{ height: '300px' }}>
                          <Bar data={monthlyChart} options={chartOptions} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {yearlyChart && (
                  <div className="col-md-4">
                    <div className="card border-0">
                      <div className="card-header bg-light">
                        <h6 className="fw-medium mb-0">
                          <i className="bi bi-graph-up me-2"></i>
                          Annual Dividend Trend
                        </h6>
                        <small className="text-muted">
                          Total dividends received per year
                        </small>
                      </div>
                      <div className="card-body">
                        <div style={{ height: '300px' }}>
                          <Line data={yearlyChart} options={chartOptions} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Dividend Stocks */}
            {analysis.topDividendStocks.length > 0 && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-medium mb-0">
                    <i className="bi bi-trophy me-2"></i>
                    Top Dividend Paying Stocks
                  </h6>
                  {analysis.topDividendStocks.length > 5 && (
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() => setShowAllTopStocks(!showAllTopStocks)}
                    >
                      <i className={`bi ${showAllTopStocks ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                      {showAllTopStocks ? 'Show Top 5 Only' : `Show All ${analysis.topDividendStocks.length}`}
                    </button>
                  )}
                </div>
                
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Stock</th>
                        <th>Total Dividends</th>
                        <th>Payments</th>
                        <th>Types</th>
                        <th>Average per Payment</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllTopStocks ? analysis.topDividendStocks : analysis.topDividendStocks.slice(0, 5))
                        .map((stock, index) => {
                        const percentage = (stock.total / analysis.totalDividends) * 100
                        const avgPerPayment = stock.total / stock.count
                        const types = Object.keys(stock.byType || {})
                        
                        return (
                          <tr key={stock.ticker}>
                            <td>
                              <span className="badge bg-success">{index + 1}</span>
                            </td>
                            <td>
                              <div>
                                <strong>{stock.ticker}</strong>
                                <br />
                                <small className="text-muted">{stock.name}</small>
                              </div>
                            </td>
                            <td>
                              <strong className="text-success">€{stock.total.toFixed(2)}</strong>
                            </td>
                            <td>
                              <span className="badge bg-info">{stock.count}</span>
                            </td>
                            <td>
                              <div>
                                {types.map(type => {
                                  let badgeClass = 'bg-success'
                                  if (type === 'Manufactured Payment') badgeClass = 'bg-info'
                                  else if (type === 'Tax Exempted') badgeClass = 'bg-warning'
                                  
                                  return (
                                    <span key={type} className={`badge ${badgeClass} me-1 mb-1`} style={{ fontSize: '0.7em' }}>
                                      {type.split(' ')[0]} ({stock.byType[type].count})
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                            <td>
                              €{avgPerPayment.toFixed(2)}
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                                  <div
                                    className="progress-bar bg-success"
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  ></div>
                                </div>
                                <small>{percentage.toFixed(1)}%</small>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {!showAllTopStocks && analysis.topDividendStocks.length > 5 && (
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan="7" className="text-center py-2">
                            <small className="text-muted">
                              Showing top 5 of {analysis.topDividendStocks.length} dividend-paying stocks
                            </small>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* All Dividends Details */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-medium mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  All Dividend Payments ({analysis.dividendCount})
                </h6>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={() => setShowAllDividends(!showAllDividends)}
                >
                  <i className={`bi ${showAllDividends ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                  {showAllDividends ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {showAllDividends && (
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Stock</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Shares</th>
                        <th>Per Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.dividendDetails.map((dividend, index) => {
                        const perShare = dividend.shares > 0 ? dividend.amount / dividend.shares : 0
                        
                        let badgeClass = 'bg-success'
                        if (dividend.type === 'Manufactured Payment') badgeClass = 'bg-info'
                        else if (dividend.type === 'Tax Exempted') badgeClass = 'bg-warning'
                        
                        return (
                          <tr key={index}>
                            <td>
                              <small>
                                {new Date(dividend.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </small>
                            </td>
                            <td>
                              <div>
                                <strong>{dividend.ticker}</strong>
                                <br />
                                <small className="text-muted">{dividend.name}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7em' }}>
                                {dividend.type}
                              </span>
                            </td>
                            <td>
                              <span className="text-success fw-medium">
                                €{dividend.amount.toFixed(2)}
                              </span>
                            </td>
                            <td>
                              {dividend.shares > 0 ? dividend.shares.toLocaleString() : 'N/A'}
                            </td>
                            <td>
                              <small className="text-muted">
                                {perShare > 0 ? `€${perShare.toFixed(4)}` : 'N/A'}
                              </small>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <th colSpan="3">Total Dividends:</th>
                        <th className="text-success">
                          €{analysis.totalDividends.toFixed(2)}
                        </th>
                        <th colSpan="2"></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="alert alert-info d-flex align-items-center">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>No dividend payments found</strong>
              <br />
              <small>No dividend transactions were found in your trading history data</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DividendAnalysis
