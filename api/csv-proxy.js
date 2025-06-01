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
    const { url } = request
    
    console.log(`📥 [CSV-PROXY] Raw request URL: ${url}`)
    console.log(`📥 [CSV-PROXY] Request method: ${request.method}`)
    console.log(`📥 [CSV-PROXY] Request headers:`, JSON.stringify(request.headers, null, 2))
    
    // Extract the original URL from the referer or construct from path
    let csvPath = ''
    
    // Method 1: Extract from URL path after /api/csv-proxy
    if (url.includes('/api/csv-proxy')) {
      const afterProxy = url.split('/api/csv-proxy')[1]
      if (afterProxy && afterProxy.length > 1) {
        csvPath = afterProxy.substring(1) // Remove leading slash
      }
    }
    
    // Method 2: Check if the entire URL after csv-proxy/ is the S3 URL
    if (!csvPath && url.includes('csv-proxy/')) {
      const afterCsvProxy = url.split('csv-proxy/')[1]
      if (afterCsvProxy) {
        csvPath = afterCsvProxy
      }
    }
    
    // Method 3: If still no path, try to extract from referer header
    if (!csvPath && request.headers.referer) {
      const refererMatch = request.headers.referer.match(/csv-proxy\/(.+)/)
      if (refererMatch) {
        csvPath = refererMatch[1]
      }
    }
    
    console.log(`📥 [CSV-PROXY] Extracted CSV path: "${csvPath}"`)
    
    if (!csvPath) {
      console.error('❌ [CSV-PROXY] No CSV path could be extracted from request')
      console.log('📝 [CSV-PROXY] Available data:', {
        url,
        headers: request.headers,
        query: request.query
      })
      return response.status(400).json({ 
        error: 'No CSV path provided',
        debug: {
          url,
          extractedPath: csvPath
        }
      })
    }
    
    // Decode URL-encoded path
    csvPath = decodeURIComponent(csvPath)
    
    // Handle different URL formats
    let s3Url
    if (csvPath.startsWith('http://') || csvPath.startsWith('https://')) {
      // Full URL provided
      s3Url = csvPath
    } else if (csvPath.startsWith('tzswiy3zk5dms05cfeo.s3.eu-central-1.amazonaws.com/')) {
      // S3 domain with path
      s3Url = `https://${csvPath}`
    } else {
      // Just the file path
      s3Url = `https://tzswiy3zk5dms05cfeo.s3.eu-central-1.amazonaws.com/${csvPath}`
    }
    
    console.log(`📥 [CSV-PROXY] Target S3 URL: ${s3Url}`)

    // Forward the request to S3
    const proxyResponse = await fetch(s3Url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Trading212-Tracker/1.0',
        'Accept': 'text/csv,text/plain,*/*',
        'Cache-Control': 'no-cache'
      }
    })

    console.log(`📥 [CSV-PROXY] S3 Response status: ${proxyResponse.status}`)
    console.log(`📥 [CSV-PROXY] S3 Response headers:`, Object.fromEntries(proxyResponse.headers.entries()))

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text()
      console.error(`❌ [CSV-PROXY] S3 returned ${proxyResponse.status}: ${proxyResponse.statusText}`)
      console.error(`❌ [CSV-PROXY] S3 error body:`, errorText)
      
      return response.status(proxyResponse.status).json({ 
        error: 'S3 fetch failed', 
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        s3Url: s3Url,
        s3Response: errorText
      })
    }

    // Get response data
    const data = await proxyResponse.text()
    
    console.log(`✅ [CSV-PROXY] Successfully fetched ${data.length} characters`)

    // Forward status and data
    response.status(200)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader('Content-Disposition', 'attachment; filename="trading212-export.csv"')
    
    return response.send(data)

  } catch (error) {
    console.error('❌ [CSV-PROXY] Error:', error)
    return response.status(500).json({ 
      error: 'CSV proxy error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: request.url
    })
  }
}
