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
    const pathMatch = url.match(/^\/csv-proxy\/(.*)/)
    const csvPath = pathMatch ? pathMatch[1] : ''
    
    // Build S3 URL
    const s3Url = `https://tzswiy3zk5dms05cfeo.s3.eu-central-1.amazonaws.com/${csvPath}`
    
    console.log(`📥 [CSV-PROXY] ${request.method} ${csvPath} -> ${s3Url}`)

    // Forward the request to S3
    const proxyResponse = await fetch(s3Url, {
      method: request.method,
      headers: {
        'User-Agent': 'Trading212-Tracker/1.0'
      }
    })

    // Get response data
    const data = await proxyResponse.text()

    // Forward status and data
    response.status(proxyResponse.status)
    response.setHeader('Content-Type', 'text/csv')
    
    return response.send(data)

  } catch (error) {
    console.error('❌ [CSV-PROXY] Error:', error)
    return response.status(500).json({ 
      error: 'CSV proxy error', 
      message: error.message 
    })
  }
}
