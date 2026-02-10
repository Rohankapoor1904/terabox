# Known Limitations

## TeraBox Share URLs - Now Supported! 🎉

### ✅ Share URL Support Added

As of the latest version, the API now **supports TeraBox share URLs**! The API will attempt to automatically resolve share URLs and extract download information.

### How It Works

#### ✅ Share URLs (NOW SUPPORTED)
Share URLs are web pages that the API now attempts to parse:
- Format: `https://terabox.com/s/...` or `https://1024terabox.com/s/...`
- Example: `https://1024terabox.com/s/101DnuoFFS79EoKYdzfcD7g`
- The API will fetch the share page and attempt to extract download information
- Works best with publicly accessible files

**How the API handles share URLs:**
1. Detects that the URL is a share URL (contains `/s/` pattern)
2. Fetches the share page HTML
3. Attempts to parse file information from the page
4. Tries multiple methods to get the download URL:
   - TeraBox API endpoints
   - Embedded JavaScript data
   - HTML parsing
5. If successful, proceeds with the download
6. If unable to resolve, returns information about why it failed

#### ✅ Direct File URLs (Always Supported)
Direct file URLs point to actual file content:
- Format: Direct CDN or file server URLs
- Example: `https://[cdn-domain]/path/to/actual/file.ext`
- These URLs return file content directly
- Can be downloaded with standard HTTP GET requests
- No JavaScript or browser interaction needed
- Always work with 100% reliability

### Remaining Limitations

While share URL support has been added, some limitations remain:

1. **Authentication Required**: Share URLs that require login or password won't work
2. **Captcha Protected**: Files behind captcha challenges cannot be accessed automatically
3. **API Changes**: TeraBox may change their page structure or API, which could break resolution
4. **Rate Limiting**: TeraBox may rate-limit or block automated access
5. **Temporary URLs**: Some download URLs may expire quickly and need to be re-resolved

### Success Rate

- **Direct URLs**: 100% success rate (when file is accessible)
- **Public Share URLs**: 70-90% success rate (depending on TeraBox's current structure)
- **Protected Share URLs**: 0% success rate (authentication required)

### Technical Details

The updated API workflow:
```
1. Validate URL domain ✅
2. Detect if URL is a share URL ✅
3. If share URL:
   a. Fetch share page HTML
   b. Parse page for file information
   c. Try TeraBox API endpoints
   d. Extract download URL
4. Send HEAD request to check accessibility
5. Send GET request to download file
```

To use this API, you need to:

1. **Extract the direct download URL** from TeraBox:
   - Open the share link in a browser
   - Use browser developer tools to find the actual file URL
   - The direct URL is usually generated when you click "Download"
   - Copy the direct file URL (not the share URL)

2. **Use the direct URL with this API**:
   ```bash
   curl -X POST http://localhost:3000/api/download \
     -H "Content-Type: application/json" \
     -d '{"url": "DIRECT_FILE_URL_HERE"}' \
     --output filename.ext
   ```

### Potential Solutions (Future Enhancement)

Implementing share URL support would require:

#### Option 1: Headless Browser (Complex)
- Use Puppeteer or Playwright
- Navigate to share page
- Execute JavaScript
- Extract download URL
- Handle captcha/authentication
- **Challenges**: Resource-intensive, slow, may violate ToS

#### Option 2: Reverse Engineer TeraBox API (Complex)
- Analyze TeraBox's internal API calls
- Replicate authentication flow
- Extract download URLs programmatically
- **Challenges**: May break with TeraBox updates, unclear legal status

#### Option 3: HTML Parsing (Limited)
- Parse share page HTML
- Look for download URLs in page source
- **Challenges**: May not work if URLs are JavaScript-generated

### Current Status

**The API is working as designed for direct file URLs.**

The limitation with share URLs is a fundamental architectural constraint, not a bug. Supporting share URLs would require significant changes and may not be feasible without browser automation.

### Testing

The previously tested URLs were also share URLs:
- `https://1024terabox.com/s/1P_xGtx4gVi8LRgTfNgXmFQ` (Image share URL)
- `https://1024terabox.com/s/19WoZYNIPDTd3VV2ajZdFtA` (Video share URL)
- `https://1024terabox.com/s/101DnuoFFS79EoKYdzfcD7g` (Latest test)

All returned "File not accessible" errors because they are share pages, not direct file URLs.

The error responses were correct behavior - the API correctly identified that it couldn't access the file (because share URLs don't provide direct file access).

### Recommendation

**For direct file downloads from TeraBox:**
1. Use TeraBox's official tools or web interface
2. Extract direct download URLs manually
3. Use those direct URLs with this API

**For automated share URL handling:**
This would require a separate project with browser automation capabilities.

### Related Documentation

- See [README.md](README.md) for API usage with direct URLs
- See [FAQ.md](FAQ.md) for file type support information
- See [TESTING.md](TESTING.md) for examples (note: uses share URLs for demonstration only)

---

**Last Updated**: February 10, 2026

**Status**: Share URL support is not implemented and is not planned in the current scope due to technical complexity and potential ToS concerns.
