import os
import json
import pandas as pd
import praw
from flask import Flask, jsonify, request, send_from_directory, make_response
from flask_cors import CORS

# --- Configuration ---
IMAGES_DIR = "Files/Images"
VIDEOS_DIR = "Files/Videos"
UPLOADED_IMAGES_DIR = "Uploaded Files/Images"
UPLOADED_VIDEOS_DIR = "Uploaded Files/Videos"
DELETED_DIR = "deleted_files"
CSV_FILE = "users.csv"
ACCOUNTS_FILE = "accounts.json"

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app)

# --- Reddit Client Initialization ---
def get_reddit_instance(account_username):
    try:
        with open(ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            accounts = json.load(f)
        
        account = next((acc for acc in accounts if acc['username'] == account_username), None)

        if not account:
            raise Exception(f"Account '{account_username}' not found in {ACCOUNTS_FILE}")

        reddit = praw.Reddit(
            client_id=account["client_id"],
            client_secret=account["client_secret"],
            username=account["username"],
            password=account["password"],
            user_agent=account["user_agent"],
        )
        print(f">> Reddit API client initialized successfully for {account_username}.")
        return reddit, account.get("subreddit")
    except Exception as e:
        print(f">> Failed to initialize Reddit API client for {account_username}: {e}")
        return None, None

# --- Helper function to get user map ---
def get_user_map():
    try:
        # Ensure the CSV is read with utf-8 encoding
        df = pd.read_csv(CSV_FILE, encoding='utf-8')
        return dict(zip(df["Username"], df["Name"]))
    except FileNotFoundError:
        return {}

# --- API ROUTES ---

# Static route to serve image previews with caching
@app.route('/images/<path:filename>')
def serve_image(filename):
    response = make_response(send_from_directory(IMAGES_DIR, filename))
    # Cache image previews in the browser for 1 hour
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

# Static route to serve video previews
@app.route('/videos/<path:filename>')
def serve_video(filename):
    return send_from_directory(VIDEOS_DIR, filename)


# [GET] Fetch available accounts
@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    try:
        with open(ACCOUNTS_FILE, 'r', encoding='utf-8') as f:
            accounts = json.load(f)
        account_usernames = [acc['username'] for acc in accounts]
        return jsonify(account_usernames)
    except FileNotFoundError:
        return jsonify({"message": "accounts.json not found."}), 500
    except Exception as e:
        return jsonify({"message": f"Error reading accounts: {e}"}), 500

# [POST] Delete a file
@app.route('/api/files/delete', methods=['POST'])
def delete_file():
    data = request.json
    filename = data.get("filename")
    file_type = data.get("type")

    if not filename:
        return jsonify({"message": "Filename is required."}), 400

    if file_type == 'image':
        source_dir = IMAGES_DIR
    elif file_type == 'video':
        source_dir = VIDEOS_DIR
    else:
        return jsonify({"message": "Invalid file type."}), 400
        
    source_path = os.path.join(source_dir, filename)
    destination_path = os.path.join(DELETED_DIR, filename)

    try:
        if not os.path.exists(DELETED_DIR):
            os.makedirs(DELETED_DIR)
            
        if os.path.exists(source_path):
            os.rename(source_path, destination_path)
            print(f">> Moved {filename} to {DELETED_DIR}")
            return jsonify({"success": True, "message": f"{filename} deleted successfully."})
        else:
            return jsonify({"message": "File not found."}), 404
            
    except Exception as e:
        print(f"Error deleting file: {e}")
        return jsonify({"message": f"Failed to delete file: {e}"}), 500


# [GET] Fetch pending posts with pagination
@app.route('/api/posts/pending', methods=['GET'])
def get_pending_posts():
    post_type = request.args.get('type', 'images')
    if post_type == 'images':
        FILES_DIR = IMAGES_DIR
        file_extensions = (".jpg", ".jpeg", ".png")
    elif post_type == 'videos':
        FILES_DIR = VIDEOS_DIR
        file_extensions = (".mp4", ".mov", ".avi", ".mkv")
    else:
        return jsonify({"message": "Invalid post type specified."}), 400

    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
    except (ValueError, TypeError):
        page = 1
        limit = 10
        
    user_map = get_user_map()
    posts_by_user = {}

    if not os.path.exists(FILES_DIR):
        os.makedirs(FILES_DIR)

    sorted_files = sorted(os.listdir(FILES_DIR))

    for file_name in sorted_files:
        if file_name.lower().endswith(file_extensions):
            try:
                username = file_name.split('_175')[0]
            except IndexError:
                print(f">> Skipping file due to missing underscore: {file_name}")
                continue

            if username in user_map:
                if username not in posts_by_user:
                    posts_by_user[username] = {
                        "username": username,
                        "name": user_map[username],
                        "titlePreview": f'"{user_map[username]}"',
                        "files": [],
                        "fileCount": 0,
                    }
                posts_by_user[username]["files"].append(file_name)
                posts_by_user[username]["fileCount"] += 1
            else:
                print(f">> Skipping file due to user not in users.csv: {file_name}")


    pending_posts = list(posts_by_user.values())
    
    start_index = (page - 1) * limit
    end_index = start_index + limit
    paginated_posts = pending_posts[start_index:end_index]
    has_more = len(pending_posts) > end_index

    return jsonify({"posts": paginated_posts, "hasMore": has_more})

# [GET] Fetch subreddit flairs
@app.route('/api/flairs', methods=['GET'])
def get_flairs():
    account_username = request.args.get('account')
    if not account_username:
        return jsonify({"message": "Account username is required."}), 400
        
    reddit, subreddit_name = get_reddit_instance(account_username)

    if not reddit:
        return jsonify({"message": "Reddit client not initialized for the selected account."}), 500
    try:
        subreddit = reddit.subreddit(subreddit_name)
        flairs = [{"id": flair["id"], "text": flair["text"]} for flair in subreddit.flair.link_templates]
        return jsonify(flairs)
    except Exception as e:
        print(f"Error fetching flairs: {e}")
        return jsonify({"message": f"Failed to fetch flairs from Reddit: {e}"}), 500

# [POST] Upload a post
@app.route('/api/posts/upload', methods=['POST'])
def upload_post():
    data = request.json
    account_username = data.get("accountUsername")
    username = data.get("username")
    caption = data.get("caption")
    flair_id = data.get("flairId")
    images_to_upload = data.get("imagesToUpload")

    if not all([account_username, username, flair_id, images_to_upload]):
        return jsonify({"message": "Missing required fields."}), 400
        
    reddit, subreddit_name = get_reddit_instance(account_username)

    if not reddit:
        return jsonify({"message": "Reddit client not initialized."}), 500

    valid_images_to_upload = []
    for img in images_to_upload:
        if os.path.exists(os.path.join(IMAGES_DIR, img)):
            valid_images_to_upload.append(img)
        else:
            print(f"!! Skipping non-existent file: {img}")

    if not valid_images_to_upload:
        return jsonify({"message": "Upload failed: No valid images found on server."}), 400

    try:
        user_map = get_user_map()
        name = user_map.get(username)
        title = f'"{name}"'
        if caption:
            import re
            stripped_caption = re.sub('<[^<]+?>', '', caption)
            title += f" - {stripped_caption}"

        subreddit = reddit.subreddit(subreddit_name)
        submission = None

        if len(valid_images_to_upload) == 1:
            image_path = os.path.join(IMAGES_DIR, valid_images_to_upload[0])
            print(f"⬆>> Uploading single image for {username} with title: {title}")
            submission = subreddit.submit_image(title=title, image_path=image_path)
        else:
            gallery_items = [{"image_path": os.path.join(IMAGES_DIR, img)} for img in valid_images_to_upload]
            print(f">> Uploading gallery of {len(gallery_items)} images for {username} with title: {title}")
            submission = subreddit.submit_gallery(title=title, images=gallery_items)
        
        submission.flair.select(flair_id)
        print(f">> Successfully posted for {username}")

        if not os.path.exists(UPLOADED_IMAGES_DIR):
            os.makedirs(UPLOADED_IMAGES_DIR)
        for img in valid_images_to_upload:
            os.rename(os.path.join(IMAGES_DIR, img), os.path.join(UPLOADED_IMAGES_DIR, img))
        print(f">> Moved {len(valid_images_to_upload)} files to Uploaded directory.")

        return jsonify({
            "success": True, 
            "message": "Upload successful!", 
            "url": f"https://www.reddit.com{submission.permalink}"
        })
    except Exception as e:
        print(f"Error during upload: {e}")
        return jsonify({"message": f"Upload failed: {str(e)}"}), 500

# [POST] Upload a video post
@app.route('/api/posts/upload_video', methods=['POST'])
def upload_video_post():
    data = request.json
    account_username = data.get("accountUsername")
    username = data.get("username")
    caption = data.get("caption")
    flair_id = data.get("flairId")
    video_to_upload = data.get("videoToUpload")

    if not all([account_username, username, flair_id, video_to_upload]):
        return jsonify({"message": "Missing required fields."}), 400

    reddit, subreddit_name = get_reddit_instance(account_username)

    if not reddit:
        return jsonify({"message": "Reddit client not initialized."}), 500

    video_path = os.path.join(VIDEOS_DIR, video_to_upload)
    if not os.path.exists(video_path):
        return jsonify({"message": "Upload failed: Video not found on server."}), 400

    # Create a temporary path for the no-audio, re-encoded video
    temp_video_path = os.path.join(VIDEOS_DIR, "temp_" + video_to_upload)

    try:
        # Use a more robust ffmpeg command to re-encode the video to a highly compatible format
        import subprocess
        command = [
            'ffmpeg',
            '-i', video_path,
            '-vcodec', 'libx264',      # Explicitly use the H.264 codec
            '-pix_fmt', 'yuv420p',    # Standard pixel format for web compatibility
            '-preset', 'fast',       # Balance between speed and quality
            '-an',                   # Remove the audio track
            '-y',                    # Overwrite output file if it exists
            temp_video_path
        ]
        print(f">> Processing video: {' '.join(command)}")
        subprocess.run(command, check=True, capture_output=True, timeout=300) # 5-minute timeout

        user_map = get_user_map()
        name = user_map.get(username)
        title = f'"{name}"'
        if caption:
            import re
            stripped_caption = re.sub('<[^<]+?>', '', caption)
            title += f" - {stripped_caption}"

        subreddit = reddit.subreddit(subreddit_name)
        print(f"⬆>> Uploading processed video for {username} with title: {title}")
        submission = subreddit.submit_video(title=title, video_path=temp_video_path, thumbnail_path=None, without_websockets=True)
        
        if submission is None:
            raise Exception("Video submission failed to return a valid post. This might be a processing issue on Reddit's side or an invalid video format.")

        submission.flair.select(flair_id)
        print(f">> Successfully posted video for {username}")

        if not os.path.exists(UPLOADED_VIDEOS_DIR):
            os.makedirs(UPLOADED_VIDEOS_DIR)
        
        os.rename(video_path, os.path.join(UPLOADED_VIDEOS_DIR, video_to_upload))
        print(f">> Moved {video_to_upload} to Uploaded directory.")

        return jsonify({
            "success": True, 
            "message": "Upload successful!", 
            "url": f"https://www.reddit.com{submission.permalink}"
        })
    except subprocess.CalledProcessError as e:
        error_output = e.stderr.decode('utf-8') if e.stderr else 'No error output.'
        print(f"!! FFmpeg failed: {error_output}")
        return jsonify({"message": f"Video processing failed. Ensure ffmpeg is installed correctly and the video file is not corrupt. FFmpeg error: {error_output}"}), 500
    except subprocess.TimeoutExpired:
        print("!! FFmpeg timed out.")
        return jsonify({"message": "Video processing timed out. The video may be too long or complex."}), 500
    except Exception as e:
        print(f"Error during video upload: {e}")
        return jsonify({"message": f"Upload failed: {str(e)}"}), 500
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)


# [GET] Fetch all users from CSV
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        if not os.path.exists(CSV_FILE):
             return jsonify([]) # Return empty list if file doesn't exist
        df = pd.read_csv(CSV_FILE, encoding='utf-8')
        return jsonify(df.to_dict('records'))
    except Exception as e:
        return jsonify({"message": f"Error reading users CSV: {str(e)}"}), 500

# [POST] Add a new user to CSV
@app.route('/api/users/add', methods=['POST'])
def add_user():
    data = request.json
    new_name = data.get("name")
    new_username = data.get("username")

    if not new_name or not new_username:
        return jsonify({"message": "Name and Username are required."}), 400

    try:
        if os.path.exists(CSV_FILE):
            df = pd.read_csv(CSV_FILE, encoding='utf-8')
            if new_username in df['Username'].values:
                return jsonify({"message": f"Username '{new_username}' already exists."}), 409
        else:
            df = pd.DataFrame(columns=['Name', 'Username'])

        # Using pandas.concat instead of append
        new_entry = pd.DataFrame([{'Name': new_name, 'Username': new_username}])
        df = pd.concat([df, new_entry], ignore_index=True)
        
        # Sort alphabetically by name
        df.sort_values(by='Name', inplace=True, key=lambda col: col.str.lower())
        
        # Save back to CSV
        df.to_csv(CSV_FILE, index=False, encoding='utf-8')
        
        return jsonify({"success": True, "message": "User added successfully."})
    except Exception as e:
        return jsonify({"message": f"Failed to add user: {str(e)}"}), 500

# --- Start Server ---
if __name__ == '__main__':
    # Create necessary directories on startup
    for directory in [IMAGES_DIR, VIDEOS_DIR, UPLOADED_IMAGES_DIR, UPLOADED_VIDEOS_DIR, DELETED_DIR]:
        if not os.path.exists(directory):
            os.makedirs(directory)
    
    app.run(host='0.0.0.0', port=5000, debug=True)