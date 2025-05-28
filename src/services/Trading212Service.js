import axios from 'axios'

// Trading212 API Base Configuration - using proxy in development
const API_BASE_URL = import.meta.env.DEV ? '/api' : 'https://live.trading212.com/api/v0'

class Trading212Service {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.cachedData = null // Cache pre overené dáta
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
  }

  // Verify API key by testing account/cash endpoint
  async verifyApiKey() {
    try {
      // Development mock mode - bypass API for testing
      if (import.meta.env.DEV && this.apiKey === 'test123') {
        console.log('🔧 [DEV] Using development mock mode')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const mockData = {
          blocked: 0,
          free: 2500.75,
          invested: 12000.00,
          pieCash: 50.25,
          ppl: 340.50,
          result: 340.50,
          total: 14840.75
        }
        
        // Uložíme mock dáta do cache
        this.cachedData = mockData
        
        return {
          success: true,
          statusCode: 200,
          data: mockData
        }
      }

      console.log('🌐 [API] Verifying API key with URL:', `${API_BASE_URL}/equity/account/cash`)
      console.log('🔑 [API] Using API key:', this.apiKey.substring(0, 10) + '...')
      
      const response = await this.client.get('/equity/account/cash')
      
      console.log('✅ [API] Verification successful, status:', response.status)
      console.log('📊 [API] Account data received:', response.data)
      
      // Uložíme dáta do cache aby sme ich nemuseli znovu načítavať
      this.cachedData = response.data
      
      return {
        success: true,
        statusCode: response.status,
        data: response.data
      }
    } catch (error) {
      console.error('❌ [API] API key verification failed:', error)
      console.log('🔍 [API] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code
      })
      
      // Better error handling for different scenarios
      if (error.response?.status === 429) {
        console.warn('⚠️ [API] Rate limit exceeded (429)')
        return {
          success: false,
          statusCode: 429,
          error: 'Too many requests. Please wait a moment before trying again.',
          data: null
        }
      }
      
      if (error.code === 'ERR_NETWORK') {
        console.error('🌐 [API] Network error occurred')
        return {
          success: false,
          statusCode: 0,
          error: 'Network error - unable to connect to Trading212 API. Check your internet connection.',
          data: null
        }
      }
      
      if (error.response?.status === 401) {
        console.error('🔐 [API] Authentication failed (401)')
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid API key. Please check your Trading212 API key.',
          data: null
        }
      }
      
      if (error.response?.status === 403) {
        console.error('🚫 [API] Access forbidden (403)')
        return {
          success: false,
          statusCode: 403,
          error: 'Access forbidden. Your API key may not have the required permissions.',
          data: null
        }
      }
      
      return {
        success: false,
        statusCode: error.response?.status || 0,
        error: error.message || 'Unknown error occurred',
        data: null
      }
    }
  }

  // Get account cash information
  async getAccountCash() {
    try {
      // Development mock mode - bypass API for testing
      if (import.meta.env.DEV && this.apiKey === 'test123') {
        console.log('🔧 [DEV] Using development mock mode for getAccountCash')
        await new Promise(resolve => setTimeout(resolve, 500))
        return {
          blocked: 0,
          free: 2500.75,
          invested: 12000.00,
          pieCash: 50.25,
          ppl: 340.50,
          result: 340.50,
          total: 14840.75
        }
      }

      // Ak máme cached dáta z overenia, použijeme ich namiesto nového API volania
      if (this.cachedData) {
        console.log('💾 [CACHE] Using cached data from verification, avoiding duplicate API call')
        console.log('📊 [CACHE] Cached data:', this.cachedData)
        const data = this.cachedData
        this.cachedData = null // Vyčistíme cache po použití
        return data
      }

      console.log('🌐 [API] Fetching fresh account cash data from:', `${API_BASE_URL}/equity/account/cash`)
      console.log('🔑 [API] Using API key:', this.apiKey.substring(0, 10) + '...')
      
      const response = await this.client.get('/equity/account/cash')
      
      console.log('✅ [API] Account cash data received successfully')
      console.log('📊 [API] Data:', response.data)
      
      return response.data
    } catch (error) {
      console.error('❌ [API] Error fetching account cash:', error)
      console.log('🔍 [API] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        url: error.config?.url
      })
      
      // Add specific handling for 429 errors
      if (error.response?.status === 429) {
        console.warn('⚠️ [API] Rate limit exceeded in getAccountCash (429)')
        const retryError = new Error('Too many requests. Please wait before trying again.')
        retryError.response = error.response
        throw retryError
      }
      
      throw error
    }
  }

  async exportHistory(exportData) {
    try {
      const response = await this.client.post('/history/exports', exportData)
      return response.data
    } catch (error) {
      console.error('❌ [TRADING212 SERVICE] Export history failed:', error)
      throw error
    }
  }

  async getExportHistory() {
    try {
      const response = await this.client.get('/history/exports')
      return response.data
    } catch (error) {
      console.error('❌ [TRADING212 SERVICE] Get export history failed:', error)
      throw error
    }
  }

  async fetchCsvData(downloadLink) {
    try {
      // Try to use our backend as a proxy to fetch CSV data
      // This would require backend implementation to handle CORS
      const response = await this.client.post('/proxy/csv', {
        url: downloadLink
      })
      return response.data
    } catch (error) {
      console.error('❌ [TRADING212 SERVICE] CSV proxy fetch failed:', error)
      
      // For now, throw error since we don't have backend proxy
      throw new Error('CSV download requires server-side proxy to avoid CORS. Please implement backend proxy endpoint.')
    }
  }

  // Clear cached data manually if needed
  clearCache() {
    console.log('🗑️ [CACHE] Clearing cached data')
    this.cachedData = null
  }

  // Storage management methods
  static saveApiKey(apiKey, persistent = false) {
    if (persistent) {
      localStorage.setItem('trading212_api_key', apiKey)
      sessionStorage.removeItem('trading212_api_key')
    } else {
      sessionStorage.setItem('trading212_api_key', apiKey)
      localStorage.removeItem('trading212_api_key')
    }
  }

  static getSavedApiKey() {
    return localStorage.getItem('trading212_api_key') || 
           sessionStorage.getItem('trading212_api_key')
  }

  static clearSavedApiKey() {
    localStorage.removeItem('trading212_api_key')
    sessionStorage.removeItem('trading212_api_key')
  }

  static hasSavedApiKey() {
    return !!(localStorage.getItem('trading212_api_key') || 
              sessionStorage.getItem('trading212_api_key'))
  }

  static isPersistentlySaved() {
    return !!localStorage.getItem('trading212_api_key')
  }
}

export default Trading212Service
