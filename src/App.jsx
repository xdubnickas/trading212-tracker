import { useState, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './App.css'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import Trading212Service from './services/Trading212Service'

function App() {
  const [apiKey, setApiKey] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationError, setVerificationError] = useState(null)
  const [accountData, setAccountData] = useState(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [isManualVerification, setIsManualVerification] = useState(false) // Nový flag

  // Check for stored API key on app load
  useEffect(() => {
    const checkSavedApiKey = async () => {
      const savedApiKey = Trading212Service.getSavedApiKey()
      if (savedApiKey) {
        console.log('🔄 [APP] Found saved API key, verifying silently...')
        setIsManualVerification(false) // Automatic verification
        await handleApiKeySubmit(savedApiKey, false, false) // Don't save, don't show loading
      } else {
        console.log('ℹ️ [APP] No saved API key found')
      }
      setInitialLoadComplete(true)
    }
    
    checkSavedApiKey()
  }, [])

  const handleApiKeySubmit = async (newApiKey, shouldSave = true, showLoading = true) => {
    console.log('🔑 [APP] Starting API key verification process')
    
    if (showLoading) {
      setLoading(true)
      setIsManualVerification(true) // Manual verification from form
    }
    setVerificationError(null)

    try {
      // Verify API key
      const service = new Trading212Service(newApiKey)
      console.log('🌐 [APP] Calling verifyApiKey...')
      
      const verification = await service.verifyApiKey()

      if (verification.success && verification.statusCode === 200) {
        console.log('✅ [APP] API key verification successful')
        console.log('💾 [APP] Saving account data for Dashboard to avoid duplicate API call')
        
        // API key is valid
        setApiKey(newApiKey)
        setIsAuthenticated(true)
        setAccountData(verification.data)
        setVerificationError(null)
        
        if (shouldSave) {
          console.log('💾 [APP] Saving API key to localStorage')
          Trading212Service.saveApiKey(newApiKey, true)
        }
      } else {
        console.warn('⚠️ [APP] API key verification failed:', verification)
        
        // API key is invalid - clear saved key and show error
        setVerificationError(
          `API key verification failed. Status code: ${verification.statusCode}. ${verification.error || 'Invalid API key.'}`
        )
        setIsAuthenticated(false)
        setAccountData(null)
        setApiKey(null)
        
        // Clear invalid saved API key only on manual verification
        if (isManualVerification || showLoading) {
          Trading212Service.clearSavedApiKey()
          console.log('🗑️ [APP] Cleared invalid saved API key')
        }
      }
    } catch (error) {
      console.error('❌ [APP] Connection error during verification:', error)
      
      // Handle network/connection errors
      setVerificationError(`Connection error: ${error.message}`)
      setIsAuthenticated(false)
      setAccountData(null)
      setApiKey(null)
      
      // Only clear saved API key if it's a clear auth failure (401) and manual verification
      if (error.response?.status === 401 && (isManualVerification || showLoading)) {
        Trading212Service.clearSavedApiKey()
        console.log('🗑️ [APP] Cleared invalid saved API key due to 401 error')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleUseDemoData = () => {
    // TODO: Implement demo functionality later
    console.log('Demo mode will be implemented later')
  }

  const handleLogout = () => {
    Trading212Service.clearSavedApiKey()
    setApiKey(null)
    setIsAuthenticated(false)
    setAccountData(null) // Vyčistíme dáta
    setVerificationError(null)
  }

  // Show loading ONLY during MANUAL API key verification
  if (loading && isManualVerification) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Verifying API key...</span>
          </div>
          <p className="text-muted">Verifying API key...</p>
        </div>
      </div>
    )
  }

  // Show loading during initial app load ONLY if no error and not completed
  if (!initialLoadComplete && !verificationError) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading application...</span>
          </div>
          <p className="text-muted">Loading application...</p>
        </div>
      </div>
    )
  }

  // Show dashboard if authenticated
  if (isAuthenticated && apiKey) {
    return (
      <Dashboard 
        apiKey={apiKey} 
        onLogout={handleLogout}
        initialAccountData={accountData}
      />
    )
  }

  // Show landing page (with potential error message) - IMMEDIATELY when error occurs
  return (
    <LandingPage 
      onApiKeySubmit={(apiKey, shouldSave) => handleApiKeySubmit(apiKey, shouldSave, true)}
      onUseDemoData={handleUseDemoData}
      verificationError={verificationError}
    />
  )
}

export default App
