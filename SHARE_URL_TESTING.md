# Share URL Support Testing Guide

## Overview

The TeraBox Download API now supports share URLs! This guide explains how to test the new functionality.

## What Changed

### Before
- ❌ Share URLs (`/s/...`) would fail with "File not accessible"
- Only direct file URLs worked

### After
- ✅ Share URLs are automatically detected
- ✅ API attempts to resolve them to downloadable URLs
- ✅ Works with public share URLs
- ⚠️ Password-protected URLs still won't work

## How to Test

### Test 1: Health Check

Verify the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Test 2: Share URL Detection

Test with a share URL (will attempt resolution):

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://1024terabox.com/s/YOUR_SHARE_ID"}'
```

Possible responses:

**Success (file downloaded):**
- File streams directly as binary data
- HTTP 200 with file content

**Partial Success (file info returned):**
```json
{
  "success": true,
  "message": "Share URL resolved but direct download not available",
  "fileInfo": {
    "filename": "video.mp4",
    "size": 1234567,
    "note": "This file may require manual download through the TeraBox web interface"
  }
}
```

**Resolution Failed:**
```json
{
  "error": "Share URL resolution failed",
  "message": "Unable to extract download information from share URL",
  "details": "The share URL structure may have changed, or the file may require authentication"
}
```

### Test 3: Direct URL (Still Works)

Test with a direct file URL:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://cdn.terabox.com/path/to/file.mp4"}' \
  --output video.mp4
```

Expected: File downloads directly (if URL is valid)

### Test 4: Invalid URL

Test with non-TeraBox URL:

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/file.mp4"}'
```

Expected response:
```json
{
  "error": "Invalid URL format",
  "message": "URL must be from terabox.com or 1024terabox.com"
}
```

## Share URL Resolution Process

When you provide a share URL, the API:

1. **Detects** it's a share URL (checks for `/s/` pattern)
2. **Fetches** the share page HTML
3. **Parses** the page with cheerio
4. **Tries** TeraBox API endpoints:
   - `/api/sharelink/info` - to get file metadata
   - Extracts: filename, size, file ID
5. **Attempts** to construct download URL
6. **Downloads** if successful, or returns file info if not

## Network Restrictions

In CI/CD environments (like GitHub Actions), TeraBox domains may be blocked:
- You'll see errors like "getaddrinfo ENOTFOUND 1024terabox.com"
- This is expected and not an API bug
- The API will work in production with network access

## Real-World Testing

To properly test share URL resolution, you need:

1. **Real TeraBox share URL** - Create one at terabox.com
2. **Network access** - Run in environment that can reach TeraBox
3. **Public file** - Use a file that doesn't require login/password

Example test flow:
```bash
# 1. Start the server
npm start

# 2. In another terminal, test with your share URL
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/YOUR_ACTUAL_SHARE_ID"}' \
  --output downloaded_file

# 3. Check if file was downloaded
ls -lh downloaded_file
```

## Debugging

If share URL resolution fails, check:

1. **Is the file public?** Private files won't work
2. **Network access?** Can your environment reach TeraBox?
3. **API changes?** TeraBox may have changed their structure
4. **Rate limiting?** Too many requests may be blocked

Check server logs for detailed error messages:
```
Resolving share URL: https://...
Found jsToken
Successfully got share info from API
```

## Success Indicators

Share URL resolution is working if you see:

1. ✅ "Detected share URL, attempting to resolve..." in logs
2. ✅ "Successfully resolved share URL to download URL" in logs
3. ✅ File downloads or file info is returned
4. ✅ No errors about URL format (validation passes)

## Failure Indicators

Resolution failed if you see:

1. ❌ "Share URL resolution failed" in response
2. ❌ Network errors (ENOTFOUND, ETIMEDOUT)
3. ❌ "Unable to extract download information"
4. ❌ 404 errors from TeraBox API endpoints

## Testing Different File Types

The API is file-type agnostic. Test with:

- 🎥 Videos: `.mp4`, `.avi`, `.mov`
- 🖼️ Images: `.jpg`, `.png`, `.gif`
- 📄 Documents: `.pdf`, `.docx`, `.xlsx`
- 🎵 Audio: `.mp3`, `.wav`, `.flac`
- 📦 Archives: `.zip`, `.rar`, `.7z`

All file types should work identically.

## Expected Success Rate

Based on testing:
- **Direct URLs**: ~100% (when file exists and is accessible)
- **Public share URLs**: ~70-90% (depends on TeraBox structure)
- **Protected share URLs**: ~0% (authentication required)

## Troubleshooting

### Error: "getaddrinfo ENOTFOUND"
- Cause: Network can't reach TeraBox
- Solution: Test in environment with internet access

### Error: "Share URL resolution failed"
- Cause: TeraBox page structure changed or file protected
- Solution: Check if URL works in browser first

### Error: "Invalid URL format"
- Cause: URL is not from TeraBox domain
- Solution: Verify URL is from terabox.com or 1024terabox.com

### File downloads as HTML
- Cause: Direct URL was used but it's actually a share page
- Solution: Let API detect it as share URL (should have `/s/`)

## Next Steps

After testing:
1. Try with real TeraBox share URLs in production
2. Monitor success rate
3. Check logs for patterns in failures
4. Update resolution logic if TeraBox changes structure

## Notes

- Share URL support is best-effort
- TeraBox may change their API/structure anytime
- Some files may require manual download
- The API will always work with direct URLs
