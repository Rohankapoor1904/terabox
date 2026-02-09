import TeraboxDL

def main():
    # Replace with your Terabox cookie (lang=en; ndus=YOUR_COOKIE_HERE;)
    cookie = "lang=en; ndus=YOUR_COOKIE_HERE;"
    
    # Replace with the Terabox share link
    link = "https://www.terabox.com/s/YOUR_SHARE_LINK"
    
    terabox = TeraboxDL(cookie)
    
    # Get file info
    file_info = terabox.get_file_info(link)
    
    if "error" in file_info:
        print("Error:", file_info["error"])
        return
    
    print("File Name:", file_info["file_name"])
    print("File Size:", file_info["file_size"])
    print("Download Link:", file_info["download_link"])
    
    # Download the file
    result = terabox.download(file_info, save_path="./downloads/")
    
    if "error" in result:
        print("Download Error:", result["error"])
    else:
        print("File downloaded to:", result["file_path"])

if __name__ == "__main__":
    main()