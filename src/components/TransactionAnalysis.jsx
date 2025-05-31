import React, { useState, useEffect } from 'react'
import { Line, Bar } from 'react-chartjs-2'
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
  Legend
)

const TransactionAnalysis = ({ csvData = [], accountData = null }) => {
  const [showAllOutflows, setShowAllOutflows] = useState(false)
  const [showAllDeposits, setShowAllDeposits] = useState(false)

  const analyzeTransactions = () => {
    if (!csvData || csvData.length === 0) {
      console.log('📊 [TRANSACTION ANALYSIS] No CSV data available for analysis')
      return {
        totalCount: 0,
        actionGroups: {},
        totalDeposits: 0,
        totalWithdrawals: 0,
        depositDetails: [],
        withdrawalDetails: [],
        depositsByMonth: {},
        dateRange: null,
        actionTypes: []
      }
    }

    console.log('📊 [TRANSACTION ANALYSIS] Analyzing', csvData.length, 'transactions')
    
    // Debug: count action types in raw data
    const rawActionCounts = {}
    csvData.forEach(transaction => {
      const action = transaction.Action || 'Unknown'
      rawActionCounts[action] = (rawActionCounts[action] || 0) + 1
    })
    console.log('🔍 [TRANSACTION ANALYSIS] Raw action counts:', rawActionCounts)

    const transactions = csvData
    const totalCount = transactions.length
    
    // Group by transaction type (Action)
    const actionGroups = {}
    let totalDeposits = 0
    let totalWithdrawals = 0
    const depositDetails = []
    const withdrawalDetails = []
    
    transactions.forEach((transaction, index) => {
      const action = transaction.Action || 'Unknown'
      
      if (!actionGroups[action]) {
        actionGroups[action] = []
      }
      actionGroups[action].push(transaction)
      
      // Calculate deposits and withdrawals
      if (action.toLowerCase() === 'deposit' || action.toLowerCase() === 'spending cashback') {
        const amount = parseFloat(transaction.Total) || 0
        totalDeposits += amount
        depositDetails.push({
          date: transaction.Time,
          amount: amount,
          currency: transaction['Currency (Total)'] || 'EUR',
          notes: action.toLowerCase() === 'spending cashback' 
            ? 'Cashback from card spending' 
            : transaction.Notes || '',
          id: transaction.ID,
          type: action.toLowerCase() === 'spending cashback' ? 'Cashback' : 'Deposit',
          originalIndex: index
        })
      } else if (action.toLowerCase() === 'withdrawal' || action.toLowerCase() === 'card debit') {
        const amount = parseFloat(transaction.Total) || 0
        const absoluteAmount = Math.abs(amount) // Make positive for display
        totalWithdrawals += absoluteAmount
        
        // Enhanced debugging for card debit
        if (action.toLowerCase() === 'card debit') {
          console.log(`💳 [TRANSACTION ANALYSIS] Processing card debit ${index + 1}:`, {
            Time: transaction.Time,
            Total: transaction.Total,
            Amount: absoluteAmount,
            'Merchant name': transaction['Merchant name'],
            'Merchant category': transaction['Merchant category'],
            ID: transaction.ID
          })
        }
        
        withdrawalDetails.push({
          date: transaction.Time,
          amount: absoluteAmount,
          currency: transaction['Currency (Total)'] || 'EUR',
          notes: action.toLowerCase() === 'card debit' 
            ? `${transaction['Merchant name'] || 'Card payment'} - ${transaction['Merchant category'] || 'Purchase'}`
            : transaction.Notes || '',
          id: transaction.ID,
          type: action.toLowerCase() === 'card debit' ? 'Card Debit' : 'Withdrawal',
          originalIndex: index
        })
      }
    })

    console.log('💰 [TRANSACTION ANALYSIS] Deposits:', totalDeposits, 'Withdrawals (including card debits):', totalWithdrawals)
    console.log('📋 [TRANSACTION ANALYSIS] Action groups:', Object.keys(actionGroups))
    console.log('💳 [TRANSACTION ANALYSIS] Card debit count in withdrawalDetails:', withdrawalDetails.filter(w => w.type === 'Card Debit').length)
    console.log('🏦 [TRANSACTION ANALYSIS] Withdrawal count in withdrawalDetails:', withdrawalDetails.filter(w => w.type === 'Withdrawal').length)
    console.log('📊 [TRANSACTION ANALYSIS] Total withdrawalDetails:', withdrawalDetails.length)

    // Sort deposits and withdrawals by date (newest first)
    depositDetails.sort((a, b) => new Date(b.date) - new Date(a.date))
    withdrawalDetails.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Group deposits by MONTH (1-12) aggregated from ALL YEARS
    const depositsByMonth = {}
    for (let month = 1; month <= 12; month++) {
      depositsByMonth[month] = {
        month,
        total: 0,
        count: 0,
        deposits: []
      }
    }
    
    depositDetails.forEach(deposit => {
      const date = new Date(deposit.date)
      const month = date.getMonth() + 1 // getMonth() returns 0-11, we want 1-12
      
      depositsByMonth[month].total += deposit.amount
      depositsByMonth[month].count += 1
      depositsByMonth[month].deposits.push(deposit)
    })

    // Date range analysis
    const dates = transactions
      .map(t => new Date(t.Time))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b)
    
    const dateRange = dates.length > 0 ? {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      totalDays: Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
    } : null

    const actionTypes = Object.keys(actionGroups).sort()

    return {
      totalCount,
      actionGroups,
      totalDeposits,
      totalWithdrawals,
      depositDetails,
      withdrawalDetails,
      depositsByMonth,
      dateRange,
      actionTypes
    }
  }

  // Initialize analysis first
  const analysis = analyzeTransactions()

  const getMostCommonAction = () => {
    if (!analysis.actionTypes.length) return 'N/A'
    
    const actionCounts = analysis.actionTypes.map(action => ({
      action,
      count: analysis.actionGroups[action]?.length || 0
    }))
    
    const mostCommon = actionCounts.reduce((max, current) => 
      current.count > max.count ? current : max, { action: 'N/A', count: 0 })
    
    return mostCommon.count > 0 ? `${mostCommon.action} (${mostCommon.count})` : 'N/A'
  }

  // Prepare action types data for LIST FORMAT
  const prepareActionTypesData = () => {
    if (!analysis.actionTypes.length) return []

    const actionTypesData = analysis.actionTypes.map(action => {
      const count = analysis.actionGroups[action]?.length || 0
      const percentage = ((count / analysis.totalCount) * 100).toFixed(1)
      
      return {
        action,
        count,
        percentage: parseFloat(percentage)
      }
    })

    // Sort by count descending
    return actionTypesData.sort((a, b) => b.count - a.count)
  }

  // Helper functions for action types display
  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'deposit': return 'bi bi-arrow-down-circle text-success'
      case 'spending cashback': return 'bi bi-cash-coin text-success'
      case 'withdrawal': return 'bi bi-arrow-up-circle text-danger'
      case 'card debit': return 'bi bi-credit-card text-danger'
      case 'market buy': return 'bi bi-cart-plus text-primary'
      case 'market sell': return 'bi bi-cart-dash text-warning'
      case 'dividend': return 'bi bi-cash-coin text-info'
      case 'interest': return 'bi bi-percent text-secondary'
      case 'limit buy': return 'bi bi-cart-plus-fill text-primary'
      case 'limit sell': return 'bi bi-cart-dash-fill text-warning'
      case 'stop buy': return 'bi bi-stop-circle text-primary'
      case 'stop sell': return 'bi bi-stop-circle text-warning'
      default: return 'bi bi-circle text-muted'
    }
  }

  const getActionBadgeClass = (action) => {
    switch (action.toLowerCase()) {
      case 'deposit': return 'bg-success'
      case 'spending cashback': return 'bg-success'
      case 'withdrawal': return 'bg-danger'
      case 'card debit': return 'bg-danger'
      case 'market buy': return 'bg-primary'
      case 'market sell': return 'bg-warning'
      case 'dividend': return 'bg-info'
      case 'interest': return 'bg-secondary'
      case 'limit buy': return 'bg-primary'
      case 'limit sell': return 'bg-warning'
      case 'stop buy': return 'bg-primary'
      case 'stop sell': return 'bg-warning'
      default: return 'bg-secondary'
    }
  }

  // Prepare deposits by month chart data (12 months aggregated from all years)
  const prepareMonthlyDepositsChartData = () => {
    if (!analysis.depositsByMonth || Object.keys(analysis.depositsByMonth).length === 0) return null

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return {
      labels: monthNames,
      datasets: [
        {
          label: 'Monthly Deposits (All Years Combined)',
          data: monthNames.map((_, index) => {
            const month = index + 1
            return analysis.depositsByMonth[month]?.total || 0
          }),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
          hoverBorderWidth: 3,
        },
      ],
    }
  }

  const barChartOptions = {
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
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            const month = context.label
            const monthData = analysis.depositsByMonth[context.dataIndex + 1]
            return [
              `${month}: €${value.toFixed(2)}`,
              `Deposits: ${monthData?.count || 0}`,
              `All years combined`
            ]
          },
        },
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
            return '€' + value.toFixed(0)
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

  const monthlyDepositsChartData = prepareMonthlyDepositsChartData()
  const actionTypesData = prepareActionTypesData()

  return (
    <div className="transaction-analysis-container">
      <div className="transaction-analysis-card">
        <div className="transaction-analysis-header">
          <h5 className="transaction-analysis-title">
            <i className="bi bi-graph-up me-2"></i>
            Transaction Analysis
          </h5>
          <p className="transaction-analysis-subtitle">
            Comprehensive analysis of your trading history data
          </p>
        </div>

        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-primary">{analysis.totalCount}</h5>
                <p className="card-text small mb-0">Total Transactions</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-warning">{analysis.actionTypes.length}</h5>
                <p className="card-text small mb-0">Action Types</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 bg-light">
              <div className="card-body text-center">
                <h5 className="card-title text-info">{getMostCommonAction()}</h5>
                <p className="card-text small mb-0">Most Common</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Types Distribution as LIST */}
        {actionTypesData.length > 0 && (
          <div className="transaction-analysis-section mb-4">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-list-task me-2"></i>
              Transaction Types Distribution
            </h6>
            <div className="transaction-analysis-list">
              {actionTypesData.map((actionType, index) => (
                <div key={index} className="transaction-analysis-item">
                  <div className="transaction-analysis-item-content">
                    <div className="transaction-analysis-item-header">
                      <div className="transaction-analysis-item-info">
                        <h6 className="transaction-analysis-item-title">
                          <i className={`${getActionIcon(actionType.action)} me-2`}></i>
                          {actionType.action}
                          <span className={`badge ${getActionBadgeClass(actionType.action)} ms-2`}>
                            {actionType.count.toLocaleString()}
                          </span>
                        </h6>
                        <div className="transaction-analysis-item-details">
                          <small className="text-muted">
                            {actionType.percentage}% of all transactions
                          </small>
                        </div>
                      </div>
                      <div className="transaction-analysis-item-stats">
                        <div className="text-end">
                          <div className="fw-bold text-primary">
                            {actionType.count.toLocaleString()}
                          </div>
                          <small className="text-muted">transactions</small>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="progress mt-2" style={{ height: '6px' }}>
                      <div
                        className={`progress-bar ${getActionBadgeClass(actionType.action).replace('bg-', 'bg-')}`}
                        role="progressbar"
                        style={{ width: `${actionType.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Deposits Chart (12 months aggregated from all years) */}
        {monthlyDepositsChartData && (
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card border-0">
                <div className="card-header bg-light">
                  <h6 className="fw-medium mb-0">
                    <i className="bi bi-bar-chart me-2"></i>
                    Monthly Deposits Trend (12 Months - All Years Combined)
                  </h6>
                  <small className="text-muted">
                    Shows total deposits for each month aggregated from all years
                  </small>
                </div>
                <div className="card-body">
                  <div style={{ height: '400px' }}>
                    <Bar data={monthlyDepositsChartData} options={barChartOptions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Money Flow Analysis */}
        {(analysis.totalDeposits > 0 || analysis.totalWithdrawals > 0) && (
          <div className="transaction-analysis-section">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-arrow-down-up me-2"></i>
              Money Flow Analysis
            </h6>
            
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 bg-success bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-success">
                      +€{analysis.totalDeposits.toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Total Deposits ({analysis.depositDetails.length})
                      <br />
                        <small className="text-muted">Bank Deposits + Card Cashbacks</small>
                    </p>
                  </div>
                </div>
              </div>
              
              {analysis.totalWithdrawals > 0 && (
                <div className="col-md-3">
                  <div className="card border-0 bg-danger bg-opacity-10">
                    <div className="card-body text-center">
                      <h5 className="card-title text-danger">
                        -€{analysis.totalWithdrawals.toFixed(2)}
                      </h5>
                      <p className="card-text small mb-0">
                        Total Outflows ({analysis.withdrawalDetails.length})
                        <br />
                        <small className="text-muted">Withdrawals + Card Debits</small>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="col-md-3">
                <div className="card border-0 bg-info bg-opacity-10">
                  <div className="card-body text-center">
                    <h5 className="card-title text-info">
                      €{(analysis.totalDeposits - analysis.totalWithdrawals).toFixed(2)}
                    </h5>
                    <p className="card-text small mb-0">
                      Net Money Flow
                      <br />
                      <small className="text-muted">Deposits - All Outflows</small>
                    </p>
                  </div>
                </div>
              </div>

              {/* Simple Return Calculation */}
              {accountData && accountData.total !== undefined && (
                <div className="col-md-3">
                  {(() => {
                    const netDeposits = analysis.totalDeposits - analysis.totalWithdrawals
                    const currentTotal = accountData.total
                    const simpleReturn = currentTotal - netDeposits
                    const returnPercentage = netDeposits > 0 ? ((simpleReturn / netDeposits) * 100) : 0
                    const isProfit = simpleReturn >= 0
                    
                    return (
                      <div className={`card border-0 ${isProfit ? 'bg-success' : 'bg-danger'} bg-opacity-10`}>
                        <div className="card-body text-center">
                          <h5 className={`card-title ${isProfit ? 'text-success' : 'text-danger'}`}>
                            {isProfit ? '+' : ''}€{simpleReturn.toFixed(2)}
                          </h5>
                          <p className="card-text small mb-0">
                            Simple Return
                            <br />
                            <small className="text-muted">
                              {isProfit ? '+' : ''}{returnPercentage.toFixed(2)}%
                            </small>
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Return Calculation Details */}
            {accountData && accountData.total !== undefined && (
              <div className="alert alert-light mb-4">
                <h6 className="fw-medium mb-2">
                  <i className="bi bi-calculator me-2"></i>
                  Return Calculation
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <small className="text-muted">
                      <strong>Formula:</strong> Current Total - Net Deposits = Simple Return
                      <br />
                      €{accountData.total.toFixed(2)} - €{(analysis.totalDeposits - analysis.totalWithdrawals).toFixed(2)} = 
                      <span className={`fw-medium ${(accountData.total - (analysis.totalDeposits - analysis.totalWithdrawals)) >= 0 ? 'text-success' : 'text-danger'}`}>
                        €{(accountData.total - (analysis.totalDeposits - analysis.totalWithdrawals)).toFixed(2)}
                      </span>
                    </small>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">
                      <strong>Return %:</strong> (Simple Return ÷ Net Deposits) × 100
                      <br />
                      (€{(accountData.total - (analysis.totalDeposits - analysis.totalWithdrawals)).toFixed(2)} ÷ €{(analysis.totalDeposits - analysis.totalWithdrawals).toFixed(2)}) × 100 = 
                      <span className={`fw-medium ${(accountData.total - (analysis.totalDeposits - analysis.totalWithdrawals)) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(analysis.totalDeposits - analysis.totalWithdrawals) > 0 ? 
                          (((accountData.total - (analysis.totalDeposits - analysis.totalWithdrawals)) / (analysis.totalDeposits - analysis.totalWithdrawals)) * 100).toFixed(2) : 
                          '0.00'
                        }%
                      </span>
                    </small>
                  </div>
                </div>
              </div>
            )}

            {/* Summary by Type Cards */}
            {(analysis.depositDetails.length > 0 || analysis.withdrawalDetails.length > 0) && (
              <div className="row g-3 mb-4">
                {(() => {
                  // Group deposits by type
                  const depositsByType = {}
                  analysis.depositDetails.forEach(d => {
                    const type = d.type || 'Deposit'
                    if (!depositsByType[type]) {
                      depositsByType[type] = { count: 0, total: 0 }
                    }
                    depositsByType[type].count += 1
                    depositsByType[type].total += d.amount
                  })

                  // Group withdrawals by type
                  const withdrawalsByType = {}
                  analysis.withdrawalDetails.forEach(w => {
                    const type = w.type || 'Withdrawal'
                    if (!withdrawalsByType[type]) {
                      withdrawalsByType[type] = { count: 0, total: 0 }
                    }
                    withdrawalsByType[type].count += 1
                    withdrawalsByType[type].total += w.amount
                  })
                  
                  return [
                    ...Object.entries(depositsByType).map(([type, data]) => (
                      <div key={`deposit-${type}`} className="col-md-3">
                        <div className="card border-0 bg-light">
                          <div className="card-body p-3 text-center">
                            <h6 className="card-title text-success">
                              <i className={`bi ${type === 'Cashback' ? 'bi-cash-coin' : 'bi-arrow-down-circle'} me-2`}></i>
                              {type}
                            </h6>
                            <p className="card-text mb-1">
                              <strong>+€{data.total.toFixed(2)}</strong>
                            </p>
                            <small className="text-muted">
                              {data.count} transaction{data.count !== 1 ? 's' : ''}
                            </small>
                          </div>
                        </div>
                      </div>
                    )),
                    ...Object.entries(withdrawalsByType).map(([type, data]) => (
                      <div key={`withdrawal-${type}`} className="col-md-3">
                        <div className="card border-0 bg-light">
                          <div className="card-body p-3 text-center">
                            <h6 className="card-title text-danger">
                              <i className={`bi ${type === 'Card Debit' ? 'bi-credit-card' : 'bi-arrow-up-circle'} me-2`}></i>
                              {type}
                            </h6>
                            <p className="card-text mb-1">
                              <strong>-€{data.total.toFixed(2)}</strong>
                            </p>
                            <small className="text-muted">
                              {data.count} transaction{data.count !== 1 ? 's' : ''}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))
                  ]
                })()}
              </div>
            )}

            {/* Expandable All Deposits Table */}
            {analysis.depositDetails.length > 0 && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-medium mb-0">
                    <i className="bi bi-arrow-down-circle me-2"></i>
                    All Deposits & Cashbacks ({analysis.depositDetails.length})
                  </h6>
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={() => setShowAllDeposits(!showAllDeposits)}
                  >
                    <i className={`bi ${showAllDeposits ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                    {showAllDeposits ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {showAllDeposits && (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.depositDetails
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((deposit, index) => (
                          <tr key={index}>
                            <td>
                              <small>
                                {new Date(deposit.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </td>
                            <td>
                              <span className={`badge ${deposit.type === 'Cashback' ? 'bg-info' : 'bg-success'}`}>
                                {deposit.type || 'Deposit'}
                              </span>
                            </td>
                            <td>
                              <span className="text-success fw-medium">
                                +€{deposit.amount.toFixed(2)}
                              </span>
                              <br />
                              <small className="text-muted">
                                {deposit.currency || 'EUR'}
                              </small>
                            </td>
                            <td>
                              <div className="text-wrap" style={{ maxWidth: '300px' }}>
                                <small className="text-muted">
                                  {deposit.notes || 'Bank Transfer'}
                                </small>
                                {deposit.id && (
                                  <div>
                                    <small className="text-muted opacity-75">
                                      ID: {deposit.id}
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
                          <th colSpan="3">Total Deposits & Cashbacks:</th>
                          <th className="text-success">
                            +€{analysis.totalDeposits.toFixed(2)}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Expandable All Outflows Table */}
            {analysis.withdrawalDetails.length > 0 && (
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-medium mb-0">
                    <i className="bi bi-list-ul me-2"></i>
                    All Outflows ({analysis.withdrawalDetails.length})
                  </h6>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowAllOutflows(!showAllOutflows)}
                  >
                    <i className={`bi ${showAllOutflows ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                    {showAllOutflows ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {showAllOutflows && (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.withdrawalDetails
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((withdrawal, index) => (
                          <tr key={index}>
                            <td>
                              <small>
                                {new Date(withdrawal.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                            </small>
                            </td>
                            <td>
                              <span className={`badge ${withdrawal.type === 'Card Debit' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                {withdrawal.type || 'Withdrawal'}
                              </span>
                            </td>
                            <td>
                              <span className="text-danger fw-medium">
                                -€{withdrawal.amount.toFixed(2)}
                              </span>
                              <br />
                              <small className="text-muted">
                                {withdrawal.currency || 'EUR'}
                              </small>
                            </td>
                            <td>
                              <div className="text-wrap" style={{ maxWidth: '300px' }}>
                                <small className="text-muted">
                                  {withdrawal.notes || 'Bank Transfer'}
                                </small>
                                {withdrawal.id && (
                                  <div>
                                    <small className="text-muted opacity-75">
                                      ID: {withdrawal.id}
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
                          <th colSpan="3">Total Outflows:</th>
                          <th className="text-danger">
                            -€{analysis.totalWithdrawals.toFixed(2)}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {analysis.totalCount === 0 && (
          <div className="alert alert-info d-flex align-items-center">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <strong>No transaction data available</strong>
              <br />
              <small>Export and download your trading history to see detailed analysis</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionAnalysis
