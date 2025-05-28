import React from 'react'

const Header = ({ onRefresh }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <a className="navbar-brand fw-bold" href="#">
          <i className="bi bi-graph-up me-2"></i>
          Trading212 Portfólio
        </a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a className="nav-link" href="#dashboard">Dashboard</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#portfolio">Portfólio</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#analytics">Analýza</a>
            </li>
            <li className="nav-item">
              <button className="btn btn-outline-light btn-sm ms-2" onClick={onRefresh}>
                <i className="bi bi-arrow-clockwise me-1"></i>
                Obnoviť
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Header
