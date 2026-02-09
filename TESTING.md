# API Testing Guide

This guide provides examples and instructions for testing the TeraBox Download API.

## Prerequisites

1. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## Test Examples

### 1. Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Download File from TeraBox

Download a file from a TeraBox URL:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/YOUR_FILE_ID"}' \
  --output downloaded_file.ext
```

**Successful Response:**
- HTTP Status: 200 OK
- File is streamed directly to `downloaded_file.ext`
- Headers include Content-Type and Content-Disposition

**Error Responses:**

**Invalid URL Format (400):**
```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/file"}'
```
```json
{
  "error": "Invalid URL format",
  "message": "URL must be from terabox.com or 1024terabox.com"
}
```

**File Not Accessible (404):**
```json
{
  "error": "File not accessible",
  "message": "Unable to connect to the file server"
}
```

**Rate Limit Exceeded (429):**
```json
{
  "error": "Too many requests, please try again later."
}
```

### 3. Test with 1024TeraBox URL

The API also supports 1024terabox.com domains:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://1024terabox.com/s/1P_xGtx4gVi8LRgTfNgXmFQ"}' \
  --output image.jpg
```

### 4. Test URL Validation

Test various URL formats to verify validation:

**Valid URLs:**
- `https://terabox.com/s/file123`
- `https://www.terabox.com/s/file123`
- `https://1024terabox.com/s/file123`
- `https://www.1024terabox.com/s/file123`

**Invalid URLs:**
- `https://example.com/file` (wrong domain)
- `not-a-url` (malformed URL)
- Empty or missing URL parameter

## Testing with Different File Types

The API supports downloading any file type from TeraBox:

```bash
# Download an image
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/image123"}' \
  --output photo.jpg

# Download a document
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/doc456"}' \
  --output document.pdf

# Download a video
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/video789"}' \
  --output video.mp4
```

## Rate Limiting Tests

The API limits requests to 20 per minute per IP. Test this:

```bash
# Make 21 requests quickly
for i in {1..21}; do
  echo "Request $i:"
  curl -s -X POST http://localhost:3000/api/download \
    -H "Content-Type: application/json" \
    -d '{"url": "https://terabox.com/s/test"}' | jq .
  echo ""
done
```

After 20 requests, you'll see:
```json
{
  "error": "Too many requests, please try again later."
}
```

## Automated Test Script

Use the provided test script:

```bash
# Create and run the test script
cat > test_api.sh << 'EOF'
#!/bin/bash

echo "Testing TeraBox Download API..."

# Test 1: Health check
echo "1. Health Check:"
curl -s http://localhost:3000/health | jq .

# Test 2: Valid URL format
echo "2. Valid 1024terabox.com URL:"
curl -s -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://1024terabox.com/s/test"}' | jq .

# Test 3: Invalid URL
echo "3. Invalid URL:"
curl -s -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}' | jq .

echo "Tests completed!"
EOF

chmod +x test_api.sh
./test_api.sh
```

## Testing in Different Languages

### JavaScript (Node.js)

```javascript
const axios = require('axios');

async function downloadFile(teraboxUrl) {
  try {
    const response = await axios.post('http://localhost:3000/api/download', {
      url: teraboxUrl
    }, {
      responseType: 'stream'
    });
    
    // Save to file
    const writer = fs.createWriteStream('downloaded_file');
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

downloadFile('https://terabox.com/s/YOUR_FILE_ID');
```

### Python

```python
import requests

def download_file(terabox_url):
    response = requests.post(
        'http://localhost:3000/api/download',
        json={'url': terabox_url}
    )
    
    if response.status_code == 200:
        with open('downloaded_file', 'wb') as f:
            f.write(response.content)
        print('Download successful!')
    else:
        print('Error:', response.json())

download_file('https://terabox.com/s/YOUR_FILE_ID')
```

## Troubleshooting

### Server Not Running
```bash
# Start the server
npm start
```

### DNS Resolution Issues

If you get "Could not resolve host" errors, this typically means:
1. The TeraBox domain is blocked in your network
2. Network firewall restrictions
3. The domain requires special DNS configuration

This is not an API error - the API is working correctly.

### Connection Timeout

If requests timeout:
- Check your internet connection
- Verify TeraBox services are accessible
- The API has built-in timeouts (10s for HEAD, 30s for downloads)

## Network Requirements

For the API to successfully download files:
- Outbound HTTPS access to terabox.com and 1024terabox.com
- DNS resolution for TeraBox domains
- No firewall blocking TeraBox domains

## Security Notes

- The API only accepts URLs from terabox.com and 1024terabox.com
- Redirects are validated to stay within allowed domains
- Rate limiting prevents abuse (20 requests/minute per IP)
- No sensitive data is logged or exposed
- All requests timeout after 30 seconds maximum

## CI/CD Testing

When running in CI/CD environments:
- Network access may be restricted
- TeraBox domains might not be accessible
- The API will still validate URLs and return appropriate errors
- This is expected behavior and not a test failure
