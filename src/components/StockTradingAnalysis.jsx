import React, { useState, useEffect } from 'react'
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2'
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

const StockTradingAnalysis = ({ csvData = [] }) => {
  const [showAllTrades, setShowAllTrades] = useState(false)
  const [showPositions, setShowPositions] = useState(false)
  const [selectedStock, setSelectedStock] = useState('ALL')
  const [selectedOrderType, setSelectedOrderType] = useState('ALL')

  const analyzeTradingData = () => {
    if (!csvData || csvData.length === 0) {
      console.log('📈 [STOCK TRADING ANALYSIS] No CSV data available for analysis')
      return {
        totalTrades: 0,
        totalBuys: 0,
        totalSells: 0,
        totalInvested: 0,
        totalRealized: 0,
        realizedPnL: 0,
        trades: [],
        positions: {},
        companies: new Set(),
        orderTypes: new Set(),
        monthlyActivity: {},
        topCompanies: [],
        realizedGains: 0,
        realizedLosses: 0,
        dateRange: null
      }
    }

    console.log('📈 [STOCK TRADING ANALYSIS] Analyzing', csvData.length, 'transactions for trading data')
    
    // Filter trading transactions
    const tradingActions = ['market buy', 'limit buy', 'market sell', 'limit sell', 'stop buy', 'stop sell']
    const tradingTransactions = csvData.filter(transaction => 
      transaction.Action && tradingActions.includes(transaction.Action.toLowerCase())
    )

    console.log('📈 [STOCK TRADING ANALYSIS] Found', tradingTransactions.length, 'trading transactions')

    const trades = []
    const positions = {}
    const companies = new Set()
    const orderTypes = new Set()
    const monthlyActivity = {}
    let totalInvested = 0
    let totalRealized = 0
    let realizedGains = 0
    let realizedLosses = 0

    tradingTransactions.forEach((transaction, index) => {
      const action = transaction.Action.toLowerCase()
      const isBuy = action.includes('buy')
      const isSell = action.includes('sell')
      
      const ticker = transaction.Ticker || 'Unknown'
      const name = transaction.Name || ticker
      const shares = parseFloat(transaction['No. of shares']) || 0
      const price = parseFloat(transaction['Price / share']) || 0
      const total = parseFloat(transaction.Total) || 0
      const result = parseFloat(transaction.Result) || 0
      const date = new Date(transaction.Time)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      companies.add(name)
      orderTypes.add(transaction.Action)

      // Track monthly activity
      if (!monthlyActivity[monthKey]) {
        monthlyActivity[monthKey] = { buys: 0, sells: 0, volume: 0, count: 0 }
      }
      monthlyActivity[monthKey].count += 1
      monthlyActivity[monthKey].volume += Math.abs(total)

      if (isBuy) {
        monthlyActivity[monthKey].buys += 1
        totalInvested += total
      } else if (isSell) {
        monthlyActivity[monthKey].sells += 1
        totalRealized += Math.abs(total)
        
        // Track realized P&L for sells
        if (result > 0) {
          realizedGains += result
        } else if (result < 0) {
          realizedLosses += Math.abs(result)
        }
      }

      // Track positions
      if (!positions[ticker]) {
        positions[ticker] = {
          ticker,
          name,
          totalShares: 0,
          totalInvested: 0,
          totalSold: 0,
          totalRealized: 0,
          realizedPnL: 0,
          avgBuyPrice: 0,
          trades: [],
          isOpen: false
        }
      }

      const position = positions[ticker]
      
      if (isBuy) {
        position.totalShares += shares
        position.totalInvested += total
        position.avgBuyPrice = position.totalInvested / position.totalShares
        position.isOpen = position.totalShares > 0
      } else if (isSell) {
        position.totalShares -= shares
        position.totalSold += Math.abs(total)
        position.totalRealized += Math.abs(total)
        position.realizedPnL += result
        position.isOpen = position.totalShares > 0.0001 // Account for floating point precision
      }

      position.trades.push({
        date: transaction.Time,
        action: transaction.Action,
        shares,
        price,
        total,
        result,
        id: transaction.ID
      })

      trades.push({
        date: transaction.Time,
        action: transaction.Action,
        ticker,
        name,
        shares,
        price,
        total,
        result,
        id: transaction.ID,
        isin: transaction.ISIN,
        originalIndex: index
      })

      console.log(`📈 [STOCK TRADING ANALYSIS] ${transaction.Action}: ${ticker} ${shares} @ €${price} = €${total}`)
    })

    // Sort trades by date (newest first)
    trades.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Calculate top companies by volume
    const companyVolumes = {}
    Object.values(positions).forEach(position => {
      const totalVolume = position.totalInvested + position.totalRealized
      companyVolumes[position.name] = totalVolume
    })

    const topCompanies = Object.entries(companyVolumes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, volume]) => ({ name, volume }))

    // Date range analysis
    const dates = tradingTransactions
      .map(t => new Date(t.Time))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b)
    
    const dateRange = dates.length > 0 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      totalDays: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
    } : null

    const totalBuys = trades.filter(t => t.action.toLowerCase().includes('buy')).length
    const totalSells = trades.filter(t => t.action.toLowerCase().includes('sell')).length
    const realizedPnL = realizedGains - realizedLosses

    console.log('📈 [STOCK TRADING ANALYSIS] Analysis complete:', {
      totalTrades: trades.length,
      totalBuys,
      totalSells,
      totalInvested,
      totalRealized,
      realizedPnL,
      uniqueCompanies: companies.size,
      openPositions: Object.values(positions).filter(p => p.isOpen).length
    })

    return {
      totalTrades: trades.length,
      totalBuys,
      totalSells,
      totalInvested,
      totalRealized,
      realizedPnL,
      trades,
      positions,
      companies: Array.from(companies).sort(),
      orderTypes: Array.from(orderTypes).sort(),
      monthlyActivity,
      topCompanies,
      realizedGains,
      realizedLosses,
      dateRange
    }
  }

  const analysis = analyzeTradingData()

  // Get filtered data
  const getFilteredTrades = () => {
    let filtered = analysis.trades

    if (selectedStock !== 'ALL') {
      filtered = filtered.filter(trade => trade.name === selectedStock)
    }

    if (selectedOrderType !== 'ALL') {
      filtered = filtered.filter(trade => trade.action === selectedOrderType)
    }

    return filtered
  }

  // Prepare order types distribution chart
  const prepareOrderTypesChart = () => {
    if (analysis.orderTypes.length === 0) return null

    const orderCounts = {}
    analysis.trades.forEach(trade => {
      orderCounts[trade.action] = (orderCounts[trade.action] || 0) + 1
    })

    const colors = [
      'rgba(34, 197, 94, 0.8)',  // Market Buy - Green
      'rgba(59, 130, 246, 0.8)',  // Limit Buy - Blue
      'rgba(239, 68, 68, 0.8)',   // Market Sell - Red
      'rgba(245, 158, 11, 0.8)',  // Limit Sell - Orange
      'rgba(139, 92, 246, 0.8)',  // Stop orders - Purple
      'rgba(236, 72, 153, 0.8)'   // Others - Pink
    ]

    const labels = Object.keys(orderCounts)
    const data = Object.values(orderCounts)

    return {
      labels: labels.map(type => `${type} (${orderCounts[type]})`),
      datasets: [
        {
          label: 'Order Types',
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare monthly activity chart
  const prepareMonthlyActivityChart = () => {
    if (Object.keys(analysis.monthlyActivity).length === 0) return null

    const sortedMonths = Object.keys(analysis.monthlyActivity).sort()

    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-')
        const date = new Date(year, monthNum - 1)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      }),
      datasets: [
        {
          label: 'Buy Orders',
          data: sortedMonths.map(month => analysis.monthlyActivity[month].buys),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
        {
          label: 'Sell Orders',
          data: sortedMonths.map(month => analysis.monthlyActivity[month].sells),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
        },
      ],
    }
  }

  // Prepare top companies chart
  const prepareTopCompaniesChart = () => {
    if (analysis.topCompanies.length === 0) return null

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(244, 63, 94, 0.8)'
    ]

    return {
      labels: analysis.topCompanies.map(company => 
        company.name.length > 30 ? company.name.substring(0, 30) + '...' : company.name
      ),
      datasets: [
        {
          label: 'Trading Volume',
          data: analysis.topCompanies.map(company => company.volume),
          backgroundColor: colors.slice(0, analysis.topCompanies.length),
          borderColor: colors.slice(0, analysis.topCompanies.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1,
          borderRadius: 8,
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
        borderColor: '#00a7e1',
        borderWidth: 2,
        cornerRadius: 8,
        padding: 12,
      },
    },
  }

  const barChartOptions = {
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

  const orderTypesChartData = prepareOrderTypesChart()
  const monthlyActivityChartData = prepareMonthlyActivityChart()
  const topCompaniesChartData = prepareTopCompaniesChart()
  const filteredTrades = getFilteredTrades()

  // Get open and closed positions
  const openPositions = Object.values(analysis.positions).filter(p => p.isOpen)
  const closedPositions = Object.values(analysis.positions).filter(p => !p.isOpen && p.trades.length > 1)

  return (
    <div className="stock-trading-analysis-container">
      <div className="stock-trading-analysis-card">
        <div className="stock-trading-analysis-header">
          <h5 className="stock-trading-analysis-title">
            <i className="bi bi-graph-up-arrow me-2"></i>
            Stock Trading Analysis
          </h5>
          <p className="stock-trading-analysis-subtitle">
            Comprehensive analysis of your stock trading activity, positions, and performance
          </p>
        </div>

        {analysis.totalTrades > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">{analysis.totalTrades}</h5>
                    <p className="card-text small mb-0">Total Trades</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">{analysis.totalBuys}</h5>
                    <p className="card-text small mb-0">Buy Orders</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-danger">{analysis.totalSells}</h5>
                    <p className="card-text small mb-0">Sell Orders</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">{analysis.companies.length}</h5>
                    <p className="card-text small mb-0">Companies</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-warning">{openPositions.length}</h5>
                    <p className="card-text small mb-0">Open Positions</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card border-0 bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title text-secondary">{closedPositions.length}</h5>
                    <p className="card-text small mb-0">Closed Positions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 bg-primary bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-primary">
                      €{analysis.totalInvested.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Total Invested
                      <br />
                      <small className="text-muted">Buy orders value</small>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-info bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">
                      €{analysis.totalRealized.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Total Realized
                      <br />
                      <small className="text-muted">Sell orders value</small>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className={`card border-0 ${analysis.realizedPnL >= 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10`}>
                  <div className="card-body text-center">
                    <h5 className={`card-title ${analysis.realizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                      {analysis.realizedPnL >= 0 ? '+' : ''}€{analysis.realizedPnL.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Realized P&L
                      <br />
                      <small className="text-muted">
                        Gains: €{analysis.realizedGains.toFixed(2)} | Losses: €{analysis.realizedLosses.toFixed(2)}
                      </small>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-warning bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-warning">
                      {analysis.totalSells > 0 ? ((analysis.realizedPnL / analysis.totalRealized) * 100).toFixed(2) : '0.00'}%
                    </h5>
                    <p className="card-text small mb-0">
                      Return Rate
                      <br />
                      <small className="text-muted">On realized trades</small>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="row g-4 mb-4">
              {/* Order Types Distribution */}
              {orderTypesChartData && (
                <div className="col-md-4">
                  <div className="card border-0">
                    <div className="card-header bg-light">
                      <h6 className="fw-medium mb-0">
                        <i className="bi bi-pie-chart me-2"></i>
                        Order Types Distribution
                      </h6>
                      <small className="text-muted">
                        Breakdown of order types used
                      </small>
                    </div>
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Doughnut data={orderTypesChartData} options={chartOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Activity */}
              {monthlyActivityChartData && (
                <div className="col-md-8">
                  <div className="card border-0">
                    <div className="card-header bg-light">
                      <h6 className="fw-medium mb-0">
                        <i className="bi bi-bar-chart me-2"></i>
                        Monthly Trading Activity
                      </h6>
                      <small className="text-muted">
                        Buy vs Sell orders over time
                      </small>
                    </div>
                    <div className="card-body">
                      <div style={{ height: '300px' }}>
                        <Bar data={monthlyActivityChartData} options={barChartOptions} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Companies Chart */}
            {topCompaniesChartData && (
              <div className="row g-4 mb-4">
                <div className="col-12">
                  <div className="card border-0">
                    <div className="card-header bg-light">
                      <h6 className="fw-medium mb-0">
                        <i className="bi bi-building me-2"></i>
                        Top Companies by Trading Volume
                      </h6>
                      <small className="text-muted">
                        Companies with highest total trading volume (invested + realized)
                      </small>
                    </div>
                    <div className="card-body">
                      <div style={{ height: '400px' }}>
                        <Bar data={topCompaniesChartData} options={{
                          ...barChartOptions,
                          indexAxis: 'y',
                          scales: {
                            ...barChartOptions.scales,
                            x: {
                              ...barChartOptions.scales.y,
                              ticks: {
                                ...barChartOptions.scales.y.ticks,
                                callback: function(value) {
                                  return '€' + value.toFixed(0)
                                },
                              },
                            },
                            y: {
                              ...barChartOptions.scales.x,
                            },
                          },
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ...existing code for positions and trades tables... */}

          </>
        ) : (
          <div className="alert alert-info d-flex align-items-center">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>No trading data found</strong>
              <br />
              <small>No buy or sell transactions were found in your trading history data</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StockTradingAnalysis
