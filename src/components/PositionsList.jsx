import React from 'react'

const PositionsList = ({ positions }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">Pozície v portfóliu</h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Symbol</th>
                <th>Názov</th>
                <th>Množstvo</th>
                <th>Cena</th>
                <th>Hodnota</th>
                <th>Zmena</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={index}>
                  <td>
                    <span className="fw-bold text-primary">{position.symbol}</span>
                  </td>
                  <td>{position.name}</td>
                  <td>{position.quantity}</td>
                  <td>€{position.currentPrice.toFixed(2)}</td>
                  <td>
                    <span className="fw-bold">€{position.value.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={`badge ${position.change >= 0 ? 'bg-success' : 'bg-danger'}`}>
                      {position.change >= 0 ? '+' : ''}{position.change.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PositionsList
