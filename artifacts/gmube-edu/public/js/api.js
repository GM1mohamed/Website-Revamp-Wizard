function api(endpoint, method, body) {
    var headers = {
        'apikey': SUPABASE_CONFIG.ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_CONFIG.ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    var options = { method: method || 'GET', headers: headers };
    if (body && method !== 'DELETE') options.body = JSON.stringify(body);
    if (method === 'DELETE') delete options.body;

    return fetch(SUPABASE_CONFIG.URL + '/rest/v1/' + endpoint, options)
        .then(function(response) {
            if (method === 'DELETE') {
                if (response.ok) return { success: true };
                return response.text().then(function(t) { throw new Error('API Error: ' + response.status + ' - ' + t); });
            }
            if (!response.ok) return response.text().then(function(t) { throw new Error('API Error: ' + response.status + ' - ' + t); });
            return response.text().then(function(text) {
                if (!text || text.trim() === '') return [];
                try { return JSON.parse(text); } catch(e) { return []; }
            });
        })
        .catch(function(error) { throw error; });
}

function extractYouTubeId(url) {
    if (!url) return null;
    var patterns = [/(?:youtube\.com\/watch\?v=)([^&]+)/, /(?:youtu\.be\/)([^?]+)/, /(?:youtube\.com\/embed\/)([^?]+)/, /(?:youtube\.com\/shorts\/)([^?]+)/];
    for (var i = 0; i < patterns.length; i++) { var m = url.match(patterns[i]); if (m) return m[1]; }
    return null;
}

function getYouTubeEmbedUrl(youtubeUrl, options) {
    var videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) return null;
    var params = { modestbranding: 1, rel: 0, showinfo: 0, controls: 1, autoplay: options && options.autoplay ? 1 : 0 };
    var qs = Object.keys(params).map(function(k) { return k + '=' + params[k]; }).join('&');
    return 'https://www.youtube.com/embed/' + videoId + '?' + qs;
}

function getVideos(category) {
    var endpoint = 'videos?select=*&order=created_at.desc';
    if (category && category !== 'الكل') endpoint += '&category=eq.' + encodeURIComponent(category);
    return api(endpoint);
}

function getVideoById(id) {
    return api('videos?id=eq.' + id).then(function(v) { return v && v.length > 0 ? v[0] : null; });
}

function addVideo(title, category, grade, url, fileId, userId, userName, playlistId, playlistName, thumbnail, sourceType) {
    var data = { title: title, category: category, grade: grade, url: url, file_id: fileId || null, user_id: userId, user_name: userName, playlist_id: playlistId || null, playlist_name: playlistName || null, thumbnail: thumbnail || null, source_type: sourceType || SOURCE_TYPES.YOUTUBE, views: 0, likes: 0, avg_rating: 0, rating_count: 0 };
    return api('videos', 'POST', data).then(function(result) {
        if (playlistId) return updatePlaylistVideoCount(playlistId).then(function() { return result; });
        return result;
    });
}

function updateVideoViews(id, views) { return api('videos?id=eq.' + id, 'PATCH', { views: views }); }
function updateVideoLikes(id, likes) { return api('videos?id=eq.' + id, 'PATCH', { likes: likes }); }
function updateVideoRating(id, avgRating, ratingCount) { return api('videos?id=eq.' + id, 'PATCH', { avg_rating: avgRating, rating_count: ratingCount }); }

function deleteVideo(id) {
    return api('videos?id=eq.' + id + '&select=playlist_id').then(function(videos) {
        var playlistId = (videos && videos.length > 0) ? videos[0].playlist_id : null;
        return api('videos?id=eq.' + id, 'DELETE').then(function() {
            if (playlistId) return updatePlaylistVideoCount(playlistId);
        });
    });
}

function getTeachers() { return api('teachers?select=*&order=created_at.desc'); }

function addTeacher(name, subject, secret) {
    return api('teachers', 'POST', { name: name, subject: subject, secret: secret, user_id: 'teacher_' + Date.now() });
}

function addStudent(name, grade, secret) {
    return api('students', 'POST', { name: name, grade: grade, secret: secret, user_id: 'student_' + Date.now() });
}

function deleteTeacher(id) { return api('teachers?id=eq.' + id, 'DELETE'); }
function deleteStudent(id) { return api('students?id=eq.' + id, 'DELETE'); }

function getComments(videoId) { return api('comments?video_id=eq.' + videoId + '&order=created_at.desc'); }

function addComment(videoId, userId, userName, text, rating) {
    return api('comments', 'POST', { video_id: videoId, user_id: userId, user_name: userName, text: text, rating: rating });
}

function getPlaylists(teacherId) { return api('playlists?teacher_id=eq.' + teacherId + '&order=created_at.desc'); }

function createPlaylist(name, teacherId, teacherName, subject) {
    return api('playlists', 'POST', { name: name, teacher_id: teacherId, teacher_name: teacherName, subject: subject, video_count: 0 });
}

function updatePlaylistVideoCount(playlistId) {
    return api('videos?playlist_id=eq.' + playlistId + '&select=id').then(function(videos) {
        return api('playlists?id=eq.' + playlistId, 'PATCH', { video_count: videos ? videos.length : 0 });
    });
}

function deletePlaylist(id) { return api('playlists?id=eq.' + id, 'DELETE'); }

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    var k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function uploadThumbnailToTelegram(file, onProgress) {
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.'));
    if (!file.type.startsWith('image/')) return Promise.reject(new Error('يرجى اختيار ملف صورة صالح.'));
    var formData = new FormData();
    formData.append('chat_id', TELEGRAM_CONFIG.CHAT_ID);
    formData.append('photo', file);
    formData.append('disable_notification', true);
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', function(e) { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); });
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.ok) {
                        var fileId = data.result.photo[data.result.photo.length - 1].file_id;
                        fetch('https://api.telegram.org/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/getFile?file_id=' + fileId)
                            .then(function(r) { return r.json(); })
                            .then(function(fd) {
                                if (fd.ok) resolve({ url: 'https://api.telegram.org/file/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/' + fd.result.file_path, file_id: fileId });
                                else reject(new Error('Failed to get file path'));
                            }).catch(reject);
                    } else reject(new Error('Telegram API Error: ' + (data.description || 'Unknown')));
                } catch(e) { reject(new Error('Failed to parse response')); }
            } else reject(new Error('Upload failed: ' + xhr.status));
        });
        xhr.addEventListener('error', function() { reject(new Error('فشل الاتصال بالخادم.')); });
        xhr.open('POST', 'https://api.telegram.org/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/sendPhoto');
        xhr.timeout = 60000;
        xhr.send(formData);
    });
}

function uploadToTelegram(file, onProgress) {
    if (file.size > 50 * 1024 * 1024) return Promise.reject(new Error('حجم الفيديو كبير جداً. الحد الأقصى 50 ميجابايت. حجمك: ' + formatFileSize(file.size)));
    var formData = new FormData();
    formData.append('chat_id', TELEGRAM_CONFIG.CHAT_ID);
    formData.append('video', file);
    formData.append('supports_streaming', true);
    formData.append('disable_notification', true);
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', function(e) { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); });
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.ok) {
                        var fileId = data.result.video.file_id;
                        fetch('https://api.telegram.org/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/getFile?file_id=' + fileId)
                            .then(function(r) { return r.json(); })
                            .then(function(fd) {
                                if (fd.ok) resolve({ url: 'https://api.telegram.org/file/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/' + fd.result.file_path, file_id: fileId });
                                else reject(new Error('Failed to get file path'));
                            }).catch(reject);
                    } else {
                        var msg = data.description || 'Unknown error';
                        if (data.error_code === 413) msg = 'حجم الفيديو كبير جداً. الحد الأقصى 50 ميجابايت.';
                        reject(new Error('Telegram API Error: ' + msg));
                    }
                } catch(e) { reject(new Error('Failed to parse response')); }
            } else reject(new Error('Upload failed: ' + xhr.status));
        });
        xhr.addEventListener('error', function() { reject(new Error('فشل الاتصال بالخادم.')); });
        xhr.addEventListener('timeout', function() { reject(new Error('انتهت مهلة الرفع.')); });
        xhr.open('POST', 'https://api.telegram.org/bot' + TELEGRAM_CONFIG.BOT_TOKEN + '/sendVideo');
        xhr.timeout = 300000;
        xhr.send(formData);
    });
}
