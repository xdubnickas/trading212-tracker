import React from 'react'
import '../styles/Footer.css'

const Footer = ({ onUseDemoData }) => {
  const technologies = ['React', 'Bootstrap', 'Chart.js', 'Vite']

  return (
    <footer className="landing-footer py-5">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6" data-aos="fade-right">
            <h5 className="fw-bold mb-2">Trading212 Portfolio Dashboard</h5>
            <p className="mb-0 opacity-75">
              Built with ❤️ using React, Bootstrap, and Chart.js
            </p>
            <div className="mt-2">
              {technologies.map((tech, index) => (
                <span 
                  key={tech}
                  className="badge bg-light text-dark me-2 tech-badge"
                  data-aos="zoom-in"
                  data-aos-delay={index * 100}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="col-md-6 text-md-end mt-4 mt-md-0" data-aos="fade-left">
            <button 
              className="btn btn-outline-light btn-lg me-3 footer-demo-btn"
              onClick={onUseDemoData}
            >
              <i className="bi bi-play-circle me-2"></i>
              Try Demo
            </button>
            <br className="d-md-none" />
            <small className="opacity-75 mt-2 d-block">
              No API key required for demo mode
            </small>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
