# TeraBox Download API

A RESTful API that enables users to download **any file type** (images, videos, audio, documents, archives, etc.) directly from TeraBox or 1024TeraBox URLs.

> **Can the API download any media file from TeraBox?**  
> ✅ **YES!** The API is completely file-type agnostic and works with ALL file types - not just media files. See [FAQ.md](FAQ.md) for details.

> ⚠️ **IMPORTANT LIMITATION**: This API only works with **direct file URLs**. It does NOT support TeraBox share URLs (e.g., `https://terabox.com/s/...`). See [LIMITATIONS.md](LIMITATIONS.md) for detailed explanation and workarounds.

## Features

- ✅ **Download ANY file type** - Images, Videos, Audio, Documents, Archives, etc.
- ✅ **File-type agnostic** - No restrictions on content types
- ✅ **Automatic Content-Type detection** - Works with all MIME types
- ✅ URL validation for terabox.com and 1024terabox.com domains
- ✅ File accessibility checking
- ✅ Streaming file downloads with proper headers
- ✅ Comprehensive error handling
- ✅ Rate limiting (20 requests per minute per IP)
- ✅ No sensitive data exposure
- ⚠️ **Works with direct file URLs only** - Share URLs are not supported

## Supported File Types

The API is **completely file-type agnostic** and can download:

- 🖼️ **Images**: JPEG, PNG, GIF, BMP, WebP, SVG, TIFF, etc.
- 🎥 **Videos**: MP4, AVI, MOV, MKV, WebM, FLV, WMV, MPEG, etc.
- 🎵 **Audio**: MP3, WAV, FLAC, AAC, OGG, M4A, WMA, etc.
- 📄 **Documents**: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, RTF, etc.
- 📦 **Archives**: ZIP, RAR, 7Z, TAR, GZ, etc.
- 💾 **Executables & Binaries**: EXE, APK, DMG, ISO, etc.
- 📁 **ANY other file type** that TeraBox can host!

The API automatically detects the Content-Type from TeraBox servers and streams files directly to clients without any file type restrictions.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Rohankapoor1904/terabox.git
cd terabox
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

## API Endpoints

### POST /api/download

Download a file from a TeraBox or 1024TeraBox URL.

**Request Body:**
```json
{
  "url": "https://terabox.com/s/example-file-id"
}
```

**Success Response (200):**
- Returns the file as a stream with appropriate headers:
  - `Content-Type`: The MIME type of the file
  - `Content-Disposition`: attachment with filename
  - `Content-Length`: Size of the file (if available)

**Error Responses:**

- **400 Bad Request** - Invalid URL format
```json
{
  "error": "Invalid URL format",
  "message": "URL must be from terabox.com or 1024terabox.com"
}
```

- **404 Not Found** - File not accessible
```json
{
  "error": "File not found",
  "message": "The requested file is not accessible or does not exist"
}
```

- **429 Too Many Requests** - Rate limit exceeded
```json
{
  "error": "Too many requests, please try again later."
}
```

- **500 Internal Server Error** - Download or server error
```json
{
  "error": "Download failed",
  "message": "Failed to download the file from the server"
}
```

### GET /health

Health check endpoint to verify the server is running.

**Success Response (200):**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### GET /

Root endpoint with API information.

**Success Response (200):**
```json
{
  "message": "TeraBox Download API",
  "endpoints": {
    "download": "POST /api/download",
    "health": "GET /health"
  }
}
```

## Usage Examples

### cURL

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/example-file"}' \
  --output downloaded-file
```

### JavaScript (fetch)

```javascript
fetch('http://localhost:3000/api/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://terabox.com/s/example-file'
  })
})
.then(response => {
  if (response.ok) {
    return response.blob();
  }
  return response.json().then(err => Promise.reject(err));
})
.then(blob => {
  // Handle the downloaded file
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filename.ext';
  a.click();
})
.catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests

response = requests.post(
    'http://localhost:3000/api/download',
    json={'url': 'https://terabox.com/s/example-file'}
)

if response.status_code == 200:
    with open('downloaded-file', 'wb') as f:
        f.write(response.content)
else:
    print('Error:', response.json())
```

## Security Features

- **Rate Limiting**: Protects against abuse with 20 requests per minute per IP
- **URL Validation**: Only accepts URLs from terabox.com and 1024terabox.com domains
- **No Data Exposure**: Sensitive error details are hidden in production
- **Timeout Protection**: Requests timeout after 10 seconds (HEAD) and 30 seconds (download)
- **Input Validation**: All inputs are validated before processing

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (set to 'production' to hide detailed error messages)

## Dependencies

- **express**: Web framework for Node.js
- **axios**: HTTP client for making requests
- **express-rate-limit**: Rate limiting middleware

## License

ISC