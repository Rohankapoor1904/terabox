const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());

// Rate limiting middleware - 20 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// URL validation function
function isValidTeraBoxURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if hostname matches terabox.com or 1024terabox.com (with or without www)
    return (
      hostname === 'terabox.com' ||
      hostname === 'www.terabox.com' ||
      hostname === '1024terabox.com' ||
      hostname === 'www.1024terabox.com' ||
      hostname.endsWith('.terabox.com') ||
      hostname.endsWith('.1024terabox.com')
    );
  } catch (error) {
    return false;
  }
}

// POST /api/download endpoint
app.post('/api/download', async (req, res) => {
  try {
    // Validate request body
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required',
        message: 'Please provide a URL in the request body'
      });
    }

    // Validate URL format
    if (!isValidTeraBoxURL(url)) {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'URL must be from terabox.com or 1024terabox.com'
      });
    }

    // Check file accessibility with HEAD request
    let headResponse;
    try {
      headResponse = await axios.head(url, {
        timeout: 10000, // 10 second timeout
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return res.status(404).json({
          error: 'File not found',
          message: 'The requested file is not accessible or does not exist'
        });
      } else if (error.code === 'ECONNABORTED') {
        return res.status(500).json({
          error: 'Request timeout',
          message: 'The server took too long to respond'
        });
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return res.status(404).json({
          error: 'File not accessible',
          message: 'Unable to connect to the file server'
        });
      } else {
        return res.status(404).json({
          error: 'File not accessible',
          message: 'Unable to access the requested file'
        });
      }
    }

    // Download the file
    let downloadResponse;
    try {
      downloadResponse = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000, // 30 second timeout for download
        maxRedirects: 5,
      });
    } catch (error) {
      console.error('Download error:', error.message);
      return res.status(500).json({
        error: 'Download failed',
        message: 'Failed to download the file from the server'
      });
    }

    // Extract content type and filename
    const contentType = downloadResponse.headers['content-type'] || 'application/octet-stream';
    const contentDisposition = downloadResponse.headers['content-disposition'];
    
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    } else {
      // Try to extract filename from URL
      try {
        const urlPath = new URL(url).pathname;
        const urlFilename = urlPath.split('/').pop();
        if (urlFilename) {
          filename = decodeURIComponent(urlFilename);
        }
      } catch (e) {
        // Keep default filename
      }
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (downloadResponse.headers['content-length']) {
      res.setHeader('Content-Length', downloadResponse.headers['content-length']);
    }

    // Stream the file to the response
    downloadResponse.data.pipe(res);

    // Handle stream errors
    downloadResponse.data.on('error', (error) => {
      console.error('Stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream error',
          message: 'Error occurred while streaming the file'
        });
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error.message);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TeraBox Download API',
    endpoints: {
      download: 'POST /api/download',
      health: 'GET /health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TeraBox Download API is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/download`);
});

module.exports = app;
