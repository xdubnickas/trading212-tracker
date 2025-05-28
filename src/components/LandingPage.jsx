import React, { useState, useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import Trading212Service from '../services/Trading212Service'
import '../styles/LandingPage.css'

const LandingPage = ({ onApiKeySubmit, onUseDemoData, verificationError }) => {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveApiKey, setSaveApiKey] = useState(false)
  const [showSaveWarning, setShowSaveWarning] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 100
    })

    // Check for saved API key
    const savedApiKey = Trading212Service.getSavedApiKey()
    if (savedApiKey && !verificationError) {
      setApiKey(savedApiKey)
      setSaveApiKey(true)
    }

    // If there's a verification error, clear the API key field
    if (verificationError) {
      console.log('⚠️ [LANDING] Verification error detected, clearing API key field')
      setApiKey('')
      setSaveApiKey(false)
      setShowSaveWarning(false)
      
      // Auto-scroll to the error message
      setTimeout(() => {
        const errorElement = document.querySelector('.alert-danger')
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [verificationError])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim(), saveApiKey)
    }
  }

  const handleSaveToggle = (checked) => {
    setSaveApiKey(checked)
    if (checked) {
      setShowSaveWarning(true)
      // Add animation to checkbox
      const checkbox = document.querySelector("#saveApiKey")
      if (checkbox) {
        checkbox.classList.add('checkbox-animate')
        setTimeout(() => checkbox.classList.remove('checkbox-animate'), 300)
      }
    } else {
      setShowSaveWarning(false)
      Trading212Service.clearSavedApiKey()
    }
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Feature data
  const features = [
    {
      icon: 'bi-pie-chart',
      iconClass: 'feature-icon-primary',
      title: 'Portfolio Analytics',
      description: 'Comprehensive overview with total value, performance metrics, and detailed insights into your investment portfolio.',
      features: [
        { icon: 'bi-graph-up', label: 'Performance', color: 'text-success' },
        { icon: 'bi-calculator', label: 'Analytics', color: 'text-primary' },
        { icon: 'bi-trophy', label: 'Insights', color: 'text-warning' }
      ]
    },
    {
      icon: 'bi-bar-chart',
      iconClass: 'feature-icon-success',
      title: 'Interactive Charts',
      description: 'Beautiful Chart.js powered visualizations including pie charts for allocation and line charts for performance tracking.',
      features: [
        { icon: 'bi-pie-chart', label: 'Allocation', color: 'text-info' },
        { icon: 'bi-graph-down', label: 'Trends', color: 'text-danger' },
        { icon: 'bi-bar-chart', label: 'History', color: 'text-success' }
      ]
    },
    {
      icon: 'bi-phone',
      iconClass: 'feature-icon-info',
      title: 'Modern Design',
      description: 'Bootstrap-powered responsive interface that adapts perfectly to any device - desktop, tablet, or mobile.',
      features: [
        { icon: 'bi-laptop', label: 'Desktop', color: 'text-primary' },
        { icon: 'bi-tablet', label: 'Tablet', color: 'text-secondary' },
        { icon: 'bi-phone', label: 'Mobile', color: 'text-info' }
      ]
    }
  ]

  const steps = [
    { step: '1', title: 'Login to Trading212', desc: 'Access your Trading212 account through the web browser' },
    { step: '2', title: 'Navigate to Settings', desc: 'Find the API section in your account settings' },
    { step: '3', title: 'Generate API Key', desc: 'Create a new Public API (v0) key for this application' },
    { step: '4', title: 'Copy & Connect', desc: 'Copy the generated key and paste it in the form above' }
  ]

  return (
    <div className="min-vh-100 w-100">
      {/* Hero Section */}
      <section className="landing-hero text-white position-relative">
        <div className="container-fluid">
          <div className="row justify-content-center align-items-center" style={{ minHeight: '90vh' }}>
            <div className="col-12 col-lg-10 text-center hero-content">
              <h1 className="hero-title mb-5" data-aos="fade-up">
                <i className="bi bi-graph-up me-3"></i>
                Trading212 Portfolio Dashboard
              </h1>
              
              <p className="hero-subtitle mb-6" data-aos="fade-up" data-aos-delay="200" style={{ marginBottom: '3rem' }}>
                Experience the future of portfolio management with our modern React application. 
                Beautiful charts, real-time data, and responsive design - all in one place.
              </p>
              
              <div className="d-flex justify-content-center gap-2 gap-md-4 flex-wrap mb-6" data-aos="fade-up" data-aos-delay="400" style={{ marginBottom: '3rem' }}>
                <button 
                  className="btn btn-hero btn-hero-primary"
                  onClick={() => scrollToSection('api-setup')}
                >
                  <i className="bi bi-rocket-takeoff me-2"></i>
                  Get Started
                </button>
                <button 
                  className="btn btn-hero btn-hero-secondary"
                  onClick={onUseDemoData}
                >
                  <i className="bi bi-play-circle me-2"></i>
                  Try Demo
                </button>
              </div>
              
              <div className="mb-5" data-aos="fade-up" data-aos-delay="600" style={{ marginBottom: '3rem' }}>
                <small className="opacity-75 fs-6">
                  <i className="bi bi-shield-check me-2"></i>
                  Secure • Fast • Responsive
                </small>
              </div>

              {/* Scroll Down Button - Now inside hero-content */}
              <div className="mt-5" data-aos="fade-up" data-aos-delay="800">
                <button 
                  className="scroll-down-btn" 
                  onClick={() => scrollToSection('features')}
                >
                  <i className="bi bi-chevron-down"></i>
                  <span className="ms-2 d-none d-md-inline">Scroll Down</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-5 bg-light position-relative w-100">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h2 className="fw-bold mb-3" data-aos="fade-up">
                Powerful Features
              </h2>
              <p className="text-muted lead" data-aos="fade-up" data-aos-delay="100">
                Everything you need to manage your Trading212 portfolio effectively
              </p>
            </div>
          </div>
          
          <div className="row g-4 justify-content-center">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-4 col-md-6 d-flex">
                <div 
                  className="feature-card card text-center"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <div className="card-body d-flex flex-column">
                    <div className={`feature-icon-wrapper ${feature.iconClass} mx-auto`}>
                      <i className={`${feature.icon} fs-3`}></i>
                    </div>
                    <div className="feature-content">
                      <h5 className="feature-title">{feature.title}</h5>
                      <p className="feature-description">{feature.description}</p>
                      <div className="feature-items row text-center">
                        {feature.features.map((item, idx) => (
                          <div key={idx} className="col-4">
                            <i className={`${item.icon} ${item.color}`}></i>
                            <small className="d-block text-muted">{item.label}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Setup Section */}
      <section id="api-setup" className="py-5 api-setup-section position-relative w-100">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8 col-xl-6">
              <div className="text-center mb-5" data-aos="fade-up">
                <h2 className="fw-bold mb-3">Connect Your Account</h2>
                <p className="text-muted lead">Securely connect your Trading212 account to access real portfolio data</p>
              </div>

              {/* API Key Form */}
              <div className="api-form-card card mb-5" data-aos="fade-up" data-aos-delay="200">
                <div className="card-body p-5">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="apiKey" className="form-label fw-semibold mb-3">
                        <i className="bi bi-key me-2"></i>
                        Trading212 API Key
                      </label>
                      <div className="input-group">
                        <input
                          type={showApiKey ? "text" : "password"}
                          className="form-control api-key-input"
                          id="apiKey"
                          placeholder="Paste your Trading212 API key here..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary px-4"
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{borderRadius: '0 15px 15px 0'}}
                        >
                          <i className={`bi ${showApiKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      </div>
                      
                      {/* Verification Error - Enhanced visibility */}
                      {verificationError && (
                        <div className="alert alert-danger mt-3 border-danger" data-aos="fade-in" style={{ borderWidth: '2px' }}>
                          <div className="d-flex align-items-start">
                            <i className="bi bi-exclamation-triangle-fill text-danger me-2 mt-1 flex-shrink-0" style={{ fontSize: '1.2rem' }}></i>
                            <div className="flex-grow-1">
                              <h6 className="alert-heading mb-2 fw-bold text-danger">
                                <i className="bi bi-x-circle me-1"></i>
                                API Key Verification Failed
                              </h6>
                              <p className="mb-2 fw-medium">{verificationError}</p>
                              <div className="alert alert-warning mb-2 py-2 px-3">
                                <small className="fw-bold">
                                  <i className="bi bi-lightbulb me-1"></i>
                                  Quick Fix: Clear the saved API key below and enter a new valid key
                                </small>
                              </div>
                              <small className="text-muted">
                                <i className="bi bi-info-circle me-1"></i>
                                Please verify that your Trading212 API access is enabled and the key is correct.
                              </small>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Save API Key Option */}
                      <div className="mt-3">
                        <div className="form-check checkbox-container">
                          <input
                            className="form-check-input enhanced-checkbox"
                            type="checkbox"
                            id="saveApiKey"
                            checked={saveApiKey}
                            onChange={(e) => handleSaveToggle(e.target.checked)}
                          />
                          <label className="form-check-label enhanced-label" htmlFor="saveApiKey">
                            <i className="bi bi-hdd me-2"></i>
                            Remember API key (localStorage)
                          </label>
                        </div>
                      </div>

                      {/* Security Warning */}
                      {showSaveWarning && (
                        <div className="alert alert-warning mt-3 mb-0" data-aos="fade-in">
                          <div className="d-flex align-items-start">
                            <i className="bi bi-exclamation-triangle-fill text-warning me-2 mt-1 flex-shrink-0"></i>
                            <div>
                              <h6 className="alert-heading mb-1 fw-bold">Security Warning</h6>
                              <p className="mb-1 small">
                                Your API key will be stored permanently in localStorage.
                              </p>
                              <div className="alert alert-info mb-2 p-2">
                                <strong>⚠️ Stays saved until manually deleted!</strong>
                              </div>
                              <ul className="mb-0 small">
                                <li>Only use on your personal computer</li>
                                <li>Extremely dangerous on shared/public computers</li>
                                <li>Key survives browser restarts</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="form-text mt-3">
                        <i className="bi bi-shield-check text-success me-1"></i>
                        Your API key will be verified before proceeding.
                      </div>
                    </div>

                    {/* Clear Saved Data Button */}
                    {apiKey && Trading212Service.hasSavedApiKey() && (
                      <div className="mb-4">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            Trading212Service.clearSavedApiKey()
                            setApiKey('')
                            setSaveApiKey(false)
                            setShowSaveWarning(false)
                          }}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Clear Saved API Key
                        </button>
                      </div>
                    )}

                    <div className="d-grid">
                      <button type="submit" className="btn btn-connect btn-lg">
                        <i className="bi bi-shield-check me-2"></i>
                        Verify & Connect
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* How to get API key */}
              <div className="info-card card" data-aos="fade-up" data-aos-delay="400">
                <div className="card-header p-4">
                  <h5 className="card-title mb-0 fw-bold">
                    <i className="bi bi-question-circle me-2"></i>
                    How to get your Trading212 API Key
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-4">
                    {steps.map((item, index) => (
                      <div 
                        key={index} 
                        className="col-md-6"
                        data-aos="fade-left"
                        data-aos-delay={index * 100}
                      >
                        <div className="d-flex align-items-start">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '30px', height: '30px', flexShrink: 0}}>
                            <small className="fw-bold">{item.step}</small>
                          </div>
                          <div>
                            <h6 className="fw-semibold mb-1">{item.title}</h6>
                            <p className="mb-0 small text-muted">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="alert alert-info mt-4 mb-0" data-aos="fade-up" data-aos-delay="600">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-lightbulb-fill text-info me-2 mt-1"></i>
                      <div>
                        <h6 className="alert-heading mb-1">Important Notes</h6>
                        <ul className="mb-0 small">
                          <li>You need an active Trading212 account with API access enabled</li>
                          <li>Only the Public API (v0) is supported by this application</li>
                          <li>Your API key provides read-only access to your portfolio data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Component */}
      <footer className="landing-footer py-5 w-100">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6" data-aos="fade-right">
              <h5 className="fw-bold mb-2">Trading212 Portfolio Dashboard</h5>
              <p className="mb-0 opacity-75">
                Built with ❤️ using React, Bootstrap, and Chart.js
              </p>
              <div className="mt-2">
                {['React', 'Bootstrap', 'Chart.js', 'Vite'].map((tech, index) => (
                  <span 
                    key={tech}
                    className="badge bg-light text-dark me-2"
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
                className="btn btn-outline-light btn-lg me-3"
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
    </div>
  )
}

export default LandingPage
