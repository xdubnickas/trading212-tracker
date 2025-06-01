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
    // Extract path from URL or query parameter
    const { url, query } = request
    let csvPath = query.path
    
    // Fallback: extract from URL path if query parameter not available
    if (!csvPath) {
      const pathMatch = url.match(/^\/csv-proxy\/(.*)/)
      csvPath = pathMatch ? pathMatch[1] : ''
    }
    
    // If still no path, try the full URL after csv-proxy/
    if (!csvPath) {
      const fullPath = url.replace('/api/csv-proxy', '').replace('/csv-proxy/', '')
      csvPath = fullPath
    }
    
    console.log(`📥 [CSV-PROXY] Raw URL: ${url}`)
    console.log(`📥 [CSV-PROXY] Extracted path: ${csvPath}`)
    
    if (!csvPath) {
      console.error('❌ [CSV-PROXY] No CSV path provided')
      return response.status(400).json({ error: 'No CSV path provided' })
    }
    
    // Build S3 URL - handle both direct S3 URLs and relative paths
    let s3Url
    if (csvPath.startsWith('http')) {
      s3Url = csvPath
    } else {
      s3Url = `https://tzswiy3zk5dms05cfeo.s3.eu-central-1.amazonaws.com/${csvPath}`
    }
    
    console.log(`📥 [CSV-PROXY] ${request.method} -> ${s3Url}`)

    // Forward the request to S3
    const proxyResponse = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Trading212-Tracker/1.0',
        'Accept': 'text/csv,text/plain,*/*'
      }
    })

    console.log(`📥 [CSV-PROXY] S3 Response status: ${proxyResponse.status}`)

    if (!proxyResponse.ok) {
      console.error(`❌ [CSV-PROXY] S3 returned ${proxyResponse.status}: ${proxyResponse.statusText}`)
      return response.status(proxyResponse.status).json({ 
        error: 'S3 fetch failed', 
        status: proxyResponse.status,
        statusText: proxyResponse.statusText
      })
    }

    // Get response data
    const data = await proxyResponse.text()
    
    console.log(`✅ [CSV-PROXY] Successfully fetched ${data.length} characters`)

    // Forward status and data
    response.status(200)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    
    return response.send(data)

  } catch (error) {
    console.error('❌ [CSV-PROXY] Error:', error)
    return response.status(500).json({ 
      error: 'CSV proxy error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
