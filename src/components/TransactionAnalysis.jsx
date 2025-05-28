import React, { useState, useEffect } from 'react'

const TransactionAnalysis = ({ csvData }) => {
  const [actionTypes, setActionTypes] = useState([])
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (csvData && csvData.length > 0) {
      analyzeTransactions()
    }
  }, [csvData])

  const analyzeTransactions = () => {
    setLoading(true)
    
    try {
      console.log('📊 [TRANSACTION ANALYSIS] Analyzing transaction data...')
      console.log(`📈 [TRANSACTION ANALYSIS] Total records: ${csvData.length}`)
      
      // Count action types
      const actionCounts = {}
      
      csvData.forEach(transaction => {
        const action = transaction.Action || 'Unknown'
        if (actionCounts[action]) {
          actionCounts[action]++
        } else {
          actionCounts[action] = 1
        }
      })
      
      // Convert to array and sort by count
      const actionTypesArray = Object.entries(actionCounts)
        .map(([action, count]) => ({
          action,
          count,
          percentage: ((count / csvData.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count)
      
      console.log('📋 [TRANSACTION ANALYSIS] Action types found:', actionTypesArray)
      
      setActionTypes(actionTypesArray)
      setTotalTransactions(csvData.length)
      
    } catch (error) {
      console.error('❌ [TRANSACTION ANALYSIS] Error analyzing transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('buy')) {
      return 'bi-cart-plus text-success'
    } else if (actionLower.includes('sell')) {
      return 'bi-cart-dash text-danger'
    } else if (actionLower.includes('dividend')) {
      return 'bi-cash-coin text-warning'
    } else if (actionLower.includes('interest')) {
      return 'bi-percent text-info'
    } else if (actionLower.includes('deposit')) {
      return 'bi-arrow-down-circle text-primary'
    } else if (actionLower.includes('withdrawal')) {
      return 'bi-arrow-up-circle text-secondary'
    } else {
      return 'bi-question-circle text-muted'
    }
  }

  const getActionBadgeClass = (action) => {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('buy')) {
      return 'bg-success'
    } else if (actionLower.includes('sell')) {
      return 'bg-danger'
    } else if (actionLower.includes('dividend')) {
      return 'bg-warning'
    } else if (actionLower.includes('interest')) {
      return 'bg-info'
    } else if (actionLower.includes('deposit')) {
      return 'bg-primary'
    } else if (actionLower.includes('withdrawal')) {
      return 'bg-secondary'
    } else {
      return 'bg-dark'
    }
  }

  if (!csvData || csvData.length === 0) {
    return (
      <div className="transaction-analysis-container">
        <div className="transaction-analysis-card">
          <div className="transaction-analysis-header">
            <h5 className="transaction-analysis-title">
              <i className="bi bi-graph-up me-2"></i>
              Transaction Analysis
            </h5>
            <p className="transaction-analysis-subtitle">
              Analyze action types and patterns from your trading data
            </p>
          </div>
          
          <div className="transaction-analysis-empty">
            <div className="text-center py-4">
              <i className="bi bi-file-earmark-text display-6 text-muted mb-3"></i>
              <h6 className="text-muted">No transaction data available</h6>
              <p className="text-muted mb-0">
                Export and download your trading history first to see the analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="transaction-analysis-container">
      <div className="transaction-analysis-card">
        <div className="transaction-analysis-header">
          <h5 className="transaction-analysis-title">
            <i className="bi bi-graph-up me-2"></i>
            Transaction Analysis
          </h5>
          <p className="transaction-analysis-subtitle">
            Analysis of {totalTransactions.toLocaleString()} transactions
          </p>
        </div>

        {loading && (
          <div className="alert alert-primary d-flex align-items-center mb-3">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Analyzing transaction data...
          </div>
        )}

        {/* Summary Stats */}
        <div className="transaction-analysis-summary">
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-primary">{totalTransactions.toLocaleString()}</h5>
                  <p className="card-text small mb-0">Total Transactions</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-success">{actionTypes.length}</h5>
                  <p className="card-text small mb-0">Action Types</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 bg-light h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">
                    {actionTypes.length > 0 ? actionTypes[0].action : 'N/A'}
                  </h5>
                  <p className="card-text small mb-0">Most Common</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Types List */}
        {actionTypes.length > 0 && (
          <div className="transaction-analysis-results">
            <h6 className="fw-medium mb-3">
              <i className="bi bi-list-ul me-2"></i>
              Action Types Breakdown
            </h6>
            
            <div className="transaction-analysis-list">
              {actionTypes.map((actionType, index) => (
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

        {/* Debug Info */}
        <div className="transaction-analysis-debug">
          <details className="mt-3">
            <summary className="text-muted small cursor-pointer">
              <i className="bi bi-bug me-1"></i>
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-light rounded small">
              <div><strong>Total CSV Records:</strong> {csvData.length}</div>
              <div><strong>Unique Action Types:</strong> {actionTypes.length}</div>
              <div><strong>Sample Actions:</strong></div>
              <ul className="mb-0">
                {actionTypes.slice(0, 5).map((type, idx) => (
                  <li key={idx}>{type.action} ({type.count}x)</li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default TransactionAnalysis
