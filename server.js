const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cheerio = require('cheerio');

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

// Check if URL is a share URL
function isShareURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/s/') || urlObj.pathname.startsWith('/sharing/link');
  } catch (error) {
    return false;
  }
}

// Resolve share URL to get download information
async function resolveShareURL(shareUrl) {
  try {
    console.log('Resolving share URL:', shareUrl);
    
    // Fetch the share page HTML
    const response = await axios.get(shareUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.terabox.com/',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Try to find download information in the page
    // TeraBox typically embeds file info in script tags or data attributes
    
    // Method 1: Look for JSON data in script tags
    const scripts = $('script');
    let fileInfo = null;
    
    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = $(scripts[i]).html();
      if (scriptContent && scriptContent.includes('window.jsToken')) {
        // Try to extract jsToken
        const jsTokenMatch = scriptContent.match(/jsToken\s*:\s*"([^"]+)"/);
        if (jsTokenMatch) {
          console.log('Found jsToken');
        }
      }
      
      // Look for file list data
      if (scriptContent && (scriptContent.includes('yunData') || scriptContent.includes('locals.mset'))) {
        // Extract file information
        const fileListMatch = scriptContent.match(/yunData\.setData\(([\s\S]*?)\);/);
        if (fileListMatch) {
          try {
            // Try to parse the data
            const dataStr = fileListMatch[1];
            // This is complex as it might be nested
            console.log('Found yunData, attempting to parse...');
          } catch (e) {
            console.error('Error parsing yunData:', e.message);
          }
        }
      }
    }
    
    // Method 2: Try to find API endpoint patterns
    // TeraBox often uses /api/list or /share/list endpoints
    const urlObj = new URL(shareUrl);
    const shareId = urlObj.pathname.split('/').pop();
    
    // Try to construct API endpoint
    const apiUrl = `${urlObj.protocol}//${urlObj.hostname}/api/sharelink/info`;
    
    try {
      const apiResponse = await axios.get(apiUrl, {
        params: {
          shorturl: shareId,
          root: 1
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': shareUrl,
        },
        timeout: 10000,
      });
      
      if (apiResponse.data && apiResponse.data.errno === 0) {
        console.log('Successfully got share info from API');
        const fileList = apiResponse.data.list || [];
        if (fileList.length > 0) {
          const file = fileList[0];
          return {
            success: true,
            file: {
              filename: file.server_filename || file.filename,
              size: file.size,
              fsId: file.fs_id,
              shareId: shareId,
              downloadUrl: file.dlink || null,
            }
          };
        }
      }
    } catch (apiError) {
      console.log('API endpoint attempt failed:', apiError.message);
    }
    
    return {
      success: false,
      error: 'Unable to extract download information from share page',
      message: 'The share URL structure may have changed or the file may not be accessible'
    };
    
  } catch (error) {
    console.error('Error resolving share URL:', error.message);
    return {
      success: false,
      error: 'Failed to fetch share page',
      message: error.message
    };
  }
}

// Get download URL from share info
async function getDownloadURL(shareInfo, shareUrl) {
  try {
    const urlObj = new URL(shareUrl);
    
    // If we have a direct download link, return it
    if (shareInfo.file.downloadUrl) {
      return shareInfo.file.downloadUrl;
    }
    
    // Otherwise, try to construct download URL using TeraBox API
    const downloadApiUrl = `${urlObj.protocol}//${urlObj.hostname}/api/download`;
    
    try {
      const response = await axios.get(downloadApiUrl, {
        params: {
          shareid: shareInfo.file.shareId,
          uk: '', // May need to extract from page
          fid: shareInfo.file.fsId,
          sign: '', // May need to extract from page
          timestamp: Math.floor(Date.now() / 1000),
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': shareUrl,
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        timeout: 10000,
      });
      
      // The response might contain the download URL
      if (response.data && response.data.dlink) {
        return response.data.dlink;
      }
    } catch (error) {
      console.log('Download API attempt failed:', error.message);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting download URL:', error.message);
    return null;
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

    let downloadUrl = url;
    
    // Check if this is a share URL that needs resolution
    if (isShareURL(url)) {
      console.log('Detected share URL, attempting to resolve...');
      
      const shareInfo = await resolveShareURL(url);
      
      if (!shareInfo.success) {
        return res.status(404).json({
          error: 'Share URL resolution failed',
          message: shareInfo.message || 'Unable to extract download information from share URL',
          details: 'The share URL structure may have changed, or the file may require authentication'
        });
      }
      
      // Try to get the actual download URL
      const resolvedUrl = await getDownloadURL(shareInfo, url);
      
      if (resolvedUrl) {
        console.log('Successfully resolved share URL to download URL');
        downloadUrl = resolvedUrl;
      } else {
        // If we can't get a direct download URL, return info about the file
        return res.status(200).json({
          success: true,
          message: 'Share URL resolved but direct download not available',
          fileInfo: {
            filename: shareInfo.file.filename,
            size: shareInfo.file.size,
            note: 'This file may require manual download through the TeraBox web interface'
          }
        });
      }
    }

    // For direct URLs or resolved share URLs, proceed with download
    // Check file accessibility with HEAD request
    let headResponse;
    try {
      headResponse = await axios.head(downloadUrl, {
        timeout: 10000, // 10 second timeout
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        },
        beforeRedirect: (options) => {
          // Validate that redirect target is still a TeraBox domain
          if (!isValidTeraBoxURL(options.href)) {
            throw new Error('Redirect to non-TeraBox domain not allowed');
          }
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
        url: downloadUrl,
        responseType: 'stream',
        timeout: 30000, // 30 second timeout for download
        maxRedirects: 5,
        beforeRedirect: (options) => {
          // Validate that redirect target is still a TeraBox domain
          if (!isValidTeraBoxURL(options.href)) {
            throw new Error('Redirect to non-TeraBox domain not allowed');
          }
        }
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
        const urlPath = new URL(downloadUrl).pathname;
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
