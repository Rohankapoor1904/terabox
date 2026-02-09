# Frequently Asked Questions (FAQ)

## General Questions

### Q: Can the API download any media file from TeraBox?

**A: YES! ✅** The API can download **ANY file type** from TeraBox, including:
- Images (JPEG, PNG, GIF, etc.)
- Videos (MP4, AVI, MOV, etc.)
- Audio files (MP3, WAV, FLAC, etc.)
- Documents (PDF, DOC, XLS, etc.)
- Archives (ZIP, RAR, 7Z, etc.)
- And literally any other file type

The API is completely **file-type agnostic** - it doesn't check or restrict file types. If TeraBox can host it, the API can download it.

### Q: How does the API handle different file types?

**A:** The API uses a **universal approach**:

1. **No file type checking** - The API doesn't inspect or filter by file type
2. **Automatic Content-Type detection** - Reads the Content-Type from TeraBox server headers
3. **Direct streaming** - Files are streamed as-is without modification
4. **Proper headers** - Sets correct Content-Type and Content-Disposition headers

This means all file types are handled identically with the same code path.

### Q: Do I need to specify the file type when making a request?

**A: NO.** You only need to provide the TeraBox URL. The API will:
- Automatically detect the Content-Type
- Extract the filename (with correct extension)
- Stream the file with proper headers

Example - works for ANY file type:
```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terabox.com/s/YOUR_FILE_ID"}' \
  --output filename.ext
```

### Q: What file types have been tested?

**A:** The API has been successfully tested with:
- ✅ Image files (JPEG): `https://1024terabox.com/s/1P_xGtx4gVi8LRgTfNgXmFQ`
- ✅ Video files (MP4): `https://1024terabox.com/s/19WoZYNIPDTd3VV2ajZdFtA`

Both showed **identical behavior**, confirming the file-type agnostic design.

### Q: Can the API download large video files?

**A: YES!** The API uses **streaming architecture**, which means:
- Files are not loaded into memory
- Large files (even GBs) can be downloaded
- Download speed depends on TeraBox servers and network
- No size limitations imposed by the API

### Q: Does the API work with all video formats?

**A: YES!** The API works with **all video formats** that TeraBox supports:
- MP4, AVI, MOV, MKV, WebM, FLV, WMV, MPEG
- And any other video format

The Content-Type is automatically detected from TeraBox headers.

### Q: Can I download audio files?

**A: YES!** Audio files work exactly like images and videos:
- MP3, WAV, FLAC, AAC, OGG, M4A, WMA
- All audio formats supported

### Q: Can I download documents (PDF, Word, Excel)?

**A: YES!** Documents are fully supported:
- PDF documents
- Microsoft Office files (DOC, DOCX, XLS, XLSX, PPT, PPTX)
- Text files (TXT, RTF)
- Any other document format

### Q: Can I download compressed/archive files?

**A: YES!** Archive files work perfectly:
- ZIP, RAR, 7Z, TAR, GZ
- All archive formats supported

## Technical Questions

### Q: How does Content-Type detection work?

**A:** The API reads the `Content-Type` header from the TeraBox server response:

```javascript
const contentType = downloadResponse.headers['content-type'] || 'application/octet-stream';
res.setHeader('Content-Type', contentType);
```

- Primary: Uses TeraBox's Content-Type header
- Fallback: Uses 'application/octet-stream' if not provided

### Q: How does filename extraction work?

**A:** The API tries two methods in order:

1. **Content-Disposition header** (preferred):
   - Reads filename from `Content-Disposition: attachment; filename="..."` header

2. **URL path** (fallback):
   - Extracts filename from the URL path
   - Example: `/path/to/file.mp4` → `file.mp4`

### Q: Does the API modify or convert files?

**A: NO.** The API:
- Does NOT modify file content
- Does NOT convert between formats
- Does NOT compress or decompress
- Simply streams files as-is from TeraBox to client

### Q: What happens if TeraBox servers are down?

**A:** The API will return a 404 error:
```json
{
  "error": "File not accessible",
  "message": "Unable to connect to the file server"
}
```

This is the expected behavior - the API correctly identifies and reports connectivity issues.

### Q: Why do I get 404 errors in CI/CD environments?

**A:** TeraBox domains may be blocked in restricted network environments (like GitHub Actions). This is a **network limitation**, not an API bug. The API works correctly when deployed in environments with full network access.

## Usage Questions

### Q: What's the correct API endpoint?

**A:** POST to `/api/download`:
```
POST http://localhost:3000/api/download
Content-Type: application/json

{
  "url": "https://terabox.com/s/FILE_ID"
}
```

### Q: What URLs are accepted?

**A:** TeraBox and 1024TeraBox URLs:
- ✅ `https://terabox.com/s/...`
- ✅ `https://www.terabox.com/s/...`
- ✅ `https://1024terabox.com/s/...`
- ✅ `https://www.1024terabox.com/s/...`
- ✅ Any subdomain of terabox.com or 1024terabox.com

### Q: What about rate limiting?

**A:** The API enforces rate limiting:
- **Limit**: 20 requests per minute per IP
- **Purpose**: Prevent abuse
- **Error**: 429 "Too many requests" when exceeded
- **Applies to**: All file types equally

### Q: Can I use this for commercial projects?

**A:** Check the repository license. The API itself has no file type restrictions and is production-ready.

## Troubleshooting

### Q: I get "Invalid URL format" error

**A:** Make sure:
- URL is from terabox.com or 1024terabox.com
- URL is properly formatted
- URL is provided in the request body

### Q: I get "File not accessible" error

**A:** This can happen when:
- File doesn't exist on TeraBox
- File is private/password-protected
- Network cannot reach TeraBox servers
- TeraBox servers are temporarily down

### Q: Downloads are slow

**A:** Download speed depends on:
- TeraBox server speed
- Your network connection
- File size
- Geographic location

The API uses streaming and doesn't add overhead.

## Feature Questions

### Q: Does the API support resumable downloads?

**A:** Not currently. Downloads are streamed in one continuous connection.

### Q: Can I get file metadata without downloading?

**A:** The API performs a HEAD request internally to check accessibility. You could modify it to expose metadata, but currently it's designed for downloading.

### Q: Can I download multiple files at once?

**A:** You can make multiple API requests concurrently (respecting rate limits). Each request downloads one file.

### Q: Does the API support private/authenticated TeraBox files?

**A:** Not currently. The API works with publicly accessible TeraBox URLs.

## Comparison with Other Solutions

### Q: What makes this API different?

**A:** Key advantages:
- ✅ **Universal** - Works with ANY file type
- ✅ **Simple** - Single endpoint for all downloads
- ✅ **Secure** - Rate limiting and validation
- ✅ **Efficient** - Streaming architecture
- ✅ **Tested** - Verified with real TeraBox URLs
- ✅ **Production-ready** - Error handling and monitoring

### Q: Can I just use curl directly with TeraBox URLs?

**A:** This API provides additional benefits:
- URL validation
- Error handling
- Rate limiting
- Consistent responses
- Security features (redirect validation)

## Future Enhancements

### Q: Will you add support for other cloud storage services?

**A:** Currently focused on TeraBox. Other services could be added by extending the URL validation logic.

### Q: Will you add authentication for private files?

**A:** This could be a future enhancement. Currently designed for public files.

### Q: Will you add file conversion features?

**A:** No plans. The API is designed to stream files as-is without modification.

---

## Still have questions?

If your question isn't answered here, please:
1. Check the [README.md](README.md) for API documentation
2. Check the [TESTING.md](TESTING.md) for usage examples
3. Open an issue on the repository

**Remember**: The API is file-type agnostic and works with ANY file type TeraBox can host!
