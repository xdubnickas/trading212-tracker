import React from 'react'

const PortfolioSummary = ({ totalValue, currency, performance }) => {
  return (
    <div className="row">
      {/* Total Value Card */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card bg-primary text-white">
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Total Value</h6>
                <h4 className="mb-0">€{totalValue.toLocaleString()}</h4>
              </div>
              <div className="align-self-center">
                <i className="bi bi-wallet2 fs-2"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Performance */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className={`card ${performance.daily >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Today</h6>
                <h5 className="mb-0">
                  {performance.daily >= 0 ? '+' : ''}€{performance.daily.toFixed(2)}
                </h5>
              </div>
              <div className="align-self-center">
                <i className={`bi ${performance.daily >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'} fs-2`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Performance */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className={`card ${performance.weekly >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Week</h6>
                <h5 className="mb-0">
                  {performance.weekly >= 0 ? '+' : ''}€{performance.weekly.toFixed(2)}
                </h5>
              </div>
              <div className="align-self-center">
                <i className={`bi ${performance.weekly >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'} fs-2`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Performance */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className={`card ${performance.yearly >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
          <div className="card-body">
            <div className="d-flex justify-content-between">
              <div>
                <h6 className="card-title">Year</h6>
                <h5 className="mb-0">
                  {performance.yearly >= 0 ? '+' : ''}€{performance.yearly.toFixed(2)}
                </h5>
              </div>
              <div className="align-self-center">
                <i className={`bi ${performance.yearly >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'} fs-2`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PortfolioSummary
