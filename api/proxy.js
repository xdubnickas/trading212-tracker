export default async function handler(request, response) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    response.setHeader('Access-Control-Max-Age', '86400')
    return response.status(200).end()
  }

  // Set CORS headers for actual requests
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')

  try {
    // Extract path from URL
    const { url } = request
    const pathMatch = url.match(/^\/api\/(.*)/)
    const apiPath = pathMatch ? pathMatch[1] : ''
    
    // Build Trading212 API URL
    const trading212Url = `https://live.trading212.com/api/v0/${apiPath}`
    
    console.log(`🔄 [PROXY] ${request.method} ${apiPath} -> ${trading212Url}`)

    // Forward the request to Trading212 API
    const proxyResponse = await fetch(trading212Url, {
      method: request.method,
      headers: {
        'Authorization': request.headers.authorization || '',
        'Content-Type': 'application/json',
        'User-Agent': 'Trading212-Tracker/1.0'
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined
    })

    // Get response data
    const contentType = proxyResponse.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await proxyResponse.json()
    } else {
      data = await proxyResponse.text()
    }

    // Forward status and data
    response.status(proxyResponse.status)
    
    if (contentType) {
      response.setHeader('Content-Type', contentType)
    }
    
    return response.json(data)

  } catch (error) {
    console.error('❌ [PROXY] Error:', error)
    return response.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    })
  }
}
