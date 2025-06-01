import React, { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const InterestAnalysis = ({ csvData = [] }) => {
  const [showAllInterests, setShowAllInterests] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('ALL')

  const analyzeInterests = () => {
    if (!csvData || csvData.length === 0) {
      console.log('💰 [INTEREST ANALYSIS] No CSV data available for analysis')
      return {
        totalCount: 0,
        totalByCurrency: {},
        interestDetails: [],
        monthlyData: {},
        yearlyData: {},
        currencies: [],
        dateRange: null
      }
    }

    console.log('💰 [INTEREST ANALYSIS] Analyzing', csvData.length, 'transactions for interest payments')
    
    // Filter only interest on cash transactions
    const interestTransactions = csvData.filter(transaction => 
      transaction.Action && transaction.Action.toLowerCase() === 'interest on cash'
    )

    console.log('💰 [INTEREST ANALYSIS] Found', interestTransactions.length, 'interest transactions')

    const totalCount = interestTransactions.length
    const totalByCurrency = {}
    const interestDetails = []
    const monthlyData = {}
    const yearlyData = {}
    const currencies = new Set()

    interestTransactions.forEach((transaction, index) => {
      const amount = parseFloat(transaction.Total) || 0
      const currency = transaction['Currency (Total)'] || 'EUR'
      const date = new Date(transaction.Time)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const yearKey = date.getFullYear().toString()

      // Track currencies
      currencies.add(currency)

      // Total by currency
      if (!totalByCurrency[currency]) {
        totalByCurrency[currency] = { total: 0, count: 0 }
      }
      totalByCurrency[currency].total += amount
      totalByCurrency[currency].count += 1

      // Interest details
      interestDetails.push({
        date: transaction.Time,
        amount: amount,
        currency: currency,
        notes: transaction.Notes || 'Interest on cash',
        id: transaction.ID,
        originalIndex: index
      })

      // Monthly data by currency
      if (!monthlyData[currency]) {
        monthlyData[currency] = {}
      }
      if (!monthlyData[currency][monthKey]) {
        monthlyData[currency][monthKey] = { total: 0, count: 0 }
      }
      monthlyData[currency][monthKey].total += amount
      monthlyData[currency][monthKey].count += 1

      // Yearly data by currency
      if (!yearlyData[currency]) {
        yearlyData[currency] = {}
      }
      if (!yearlyData[currency][yearKey]) {
        yearlyData[currency][yearKey] = { total: 0, count: 0 }
      }
      yearlyData[currency][yearKey].total += amount
      yearlyData[currency][yearKey].count += 1

      console.log(`💰 [INTEREST ANALYSIS] Interest payment: ${currency} ${amount} on ${transaction.Time}`)
    })

    // Sort details by date (newest first)
    interestDetails.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Date range analysis
    const dates = interestTransactions
      .map(t => new Date(t.Time))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b)
    
    const dateRange = dates.length > 0 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      totalDays: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
    } : null

    console.log('💰 [INTEREST ANALYSIS] Total by currency:', totalByCurrency)
    console.log('💰 [INTEREST ANALYSIS] Currencies found:', Array.from(currencies))

    return {
      totalCount,
      totalByCurrency,
      interestDetails,
      monthlyData,
      yearlyData,
      currencies: Array.from(currencies).sort(),
      dateRange
    }
  }

  const analysis = analyzeInterests()

  // Get filtered data based on selected currency
  const getFilteredData = () => {
    if (selectedCurrency === 'ALL') {
      return analysis.interestDetails
    }
    return analysis.interestDetails.filter(interest => interest.currency === selectedCurrency)
  }

  // Prepare currency distribution chart
  const prepareCurrencyChartData = () => {
    if (Object.keys(analysis.totalByCurrency).length === 0) return null

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)'
    ]

    const labels = Object.keys(analysis.totalByCurrency)
    const data = labels.map(currency => analysis.totalByCurrency[currency].total)

    return {
      labels: labels.map(currency => `${currency} (${analysis.totalByCurrency[currency].count})`),
      datasets: [
        {
          label: 'Interest by Currency',
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 2,
          hoverBackgroundColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '0.9')),
        },
      ],
    }
  }

  // Prepare monthly interest trend chart
  const prepareMonthlyTrendData = () => {
    if (Object.keys(analysis.monthlyData).length === 0) return null

    // Get all months across all currencies
    const allMonths = new Set()
    Object.values(analysis.monthlyData).forEach(currencyData => {
      Object.keys(currencyData).forEach(month => allMonths.add(month))
    })

    const sortedMonths = Array.from(allMonths).sort()

    const colors = [
      'rgb(59, 130, 246)',
      'rgb(16, 185, 129)',
      'rgb(245, 158, 11)',
      'rgb(239, 68, 68)',
      'rgb(139, 92, 246)'
    ]

    const datasets = Object.keys(analysis.monthlyData).map((currency, index) => ({
      label: currency,
      data: sortedMonths.map(month => 
        analysis.monthlyData[currency][month]?.total || 0
      ),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
      tension: 0.1,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
    }))

    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-')
        const date = new Date(year, monthNum - 1)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      }),
      datasets: datasets,
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
        borderColor: '#00a7e1',
        borderWidth: 2,
        cornerRadius: 8,
        padding: 12,
      },
    },
  }

  const lineChartOptions = {
    ...chartOptions,
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

  const currencyChartData = prepareCurrencyChartData()
  const monthlyTrendData = prepareMonthlyTrendData()
  const filteredInterests = getFilteredData()

  return (
    <div className="interest-analysis-container">
      <div className="interest-analysis-card">
        <div className="interest-analysis-header">
          <h5 className="interest-analysis-title">
            <i className="bi bi-percent me-2"></i>
            Interest on Cash Analysis
          </h5>
          <p className="interest-analysis-subtitle">
            Comprehensive analysis of your interest earnings from cash holdings
          </p>
        </div>

        {analysis.totalCount > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">{analysis.totalCount}</h5>
                    <p className="card-text small mb-0">Total Payments</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">{analysis.currencies.length}</h5>
                    <p className="card-text small mb-0">Currencies</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">
                      {analysis.dateRange ? Math.ceil(analysis.dateRange.totalDays / 30) : 0}
                    </h5>
                    <p className="card-text small mb-0">Months Tracked</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-warning">
                      {Object.values(analysis.totalByCurrency).reduce((sum, curr) => sum + curr.total, 0).toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">Total (All Currencies)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Totals */}
            <div className="row g-3 mb-4">
              {Object.entries(analysis.totalByCurrency).map(([currency, data]) => (
                <div key={currency} className="col-md-4">
                  <div className="card border-0 bg-success bg-opacity-10">
                    <div className="card-body text-center">
                      <h5 className="card-title text-success">
                        +{data.total.toFixed(4)} {currency}
                      </h5>
                      <p className="card-text small mb-0">
                        {data.count} payment{data.count !== 1 ? 's' : ''}
                        <br />
                        <small className="text-muted">
                          Avg: {(data.total / data.count).toFixed(4)} {currency}
                        </small>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="row g-4 mb-4">
              {/* Currency Distribution */}
              {currencyChartData && (
                <div className="col-md-6">
                  <div className="card border-0">
                    <div className="card-header bg-light">
                      <h6 className="fw-medium mb-0">
                        <i className="bi bi-pie-chart me-2"></i>
                        Interest by Currency
                      </h6>
                      <small className="text-muted">
                        Distribution of interest payments across currencies
                      </small>
                    </div>
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Doughnut data={currencyChartData} options={chartOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Trend */}
              {monthlyTrendData && (
                <div className="col-md-6">
                  <div className="card border-0">
                    <div className="card-header bg-light">
                      <h6 className="fw-medium mb-0">
                        <i className="bi bi-graph-up me-2"></i>
                        Monthly Interest Trend
                      </h6>
                      <small className="text-muted">
                        Interest earnings over time by currency
                      </small>
                    </div>
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Line data={monthlyTrendData} options={lineChartOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interest Details */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-medium mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Interest Payment Details ({filteredInterests.length})
                </h6>
                <div className="d-flex gap-2 align-items-center">
                  {/* Currency Filter */}
                  <select 
                    className="form-select form-select-sm"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    style={{ width: '150px' }}
                  >
                    <option value="ALL">All Currencies</option>
                    {analysis.currencies.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowAllInterests(!showAllInterests)}
                  >
                    <i className={`bi ${showAllInterests ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                    {showAllInterests ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>

              {showAllInterests && (
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInterests.map((interest, index) => (
                        <tr key={index}>
                          <td>
                            <small>
                              {new Date(interest.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          </td>
                          <td>
                            <span className="text-success fw-medium">
                              +{interest.amount.toFixed(4)}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {interest.currency}
                            </span>
                          </td>
                          <td>
                            <div className="text-wrap" style={{ maxWidth: '300px' }}>
                              <small className="text-muted">
                                {interest.notes}
                              </small>
                              {interest.id && (
                                <div>
                                  <small className="text-muted opacity-75">
                                    ID: {interest.id}
                                  </small>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <th colSpan="2">
                          {selectedCurrency === 'ALL' ? 'Total (All Currencies):' : `Total (${selectedCurrency}):`}
                        </th>
                        <th className="text-success">
                          {selectedCurrency === 'ALL' 
                            ? Object.values(analysis.totalByCurrency).reduce((sum, curr) => sum + curr.total, 0).toFixed(4)
                            : analysis.totalByCurrency[selectedCurrency]?.total.toFixed(4) || '0.0000'
                          }
                        </th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Date Range Info */}
            {analysis.dateRange && (
              <div className="alert alert-light">
                <h6 className="fw-medium mb-2">
                  <i className="bi bi-calendar-range me-2"></i>
                  Analysis Period
                </h6>
                <small className="text-muted">
                  <strong>From:</strong> {analysis.dateRange.earliest.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <br />
                  <strong>To:</strong> {analysis.dateRange.latest.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <br />
                  <strong>Duration:</strong> {analysis.dateRange.totalDays} days
                  ({Math.ceil(analysis.dateRange.totalDays / 30)} months)
                </small>
              </div>
            )}
          </>
        ) : (
          <div className="alert alert-info d-flex align-items-center">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>No interest payments found</strong>
              <br />
              <small>No "Interest on cash" transactions were found in your trading history data</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterestAnalysis
