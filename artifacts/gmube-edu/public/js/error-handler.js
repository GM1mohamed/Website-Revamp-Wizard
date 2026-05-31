window.addEventListener('error', function(e) { console.error('خطأ عام:', e.message); });
window.addEventListener('unhandledrejection', function(event) { console.error('Unhandled Promise:', event.reason); event.preventDefault(); });

function handleApiError(error) {
    if (!error) return 'حدث خطأ غير متوقع';
    var message = error.message || error.toString();
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) return 'فشل الاتصال. تحقق من اتصال الإنترنت.';
    if (message.includes('401') || message.includes('Unauthorized')) return 'لم تعد لديك صلاحيات. يرجى تسجيل الدخول مجدداً.';
    if (message.includes('404')) return 'المورد غير موجود.';
    if (message.includes('500')) return 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
    return message;
}

function handleUploadError(error) {
    var message = error.message || error.toString();
    if (message.includes('413') || message.includes('too large')) return 'حجم الملف كبير جداً.';
    if (message.includes('timeout')) return 'انتهت مهلة الرفع. يرجى المحاولة مجدداً.';
    return handleApiError(error);
}

function showToast(msg, type, dur) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast ' + (type || '');
    setTimeout(function() { t.classList.add('show'); }, 10);
    setTimeout(function() { t.classList.remove('show'); }, (dur || 3000));
}

function esc(t) { if (!t) return ''; var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function fmt(n) { n = n || 0; if (n >= 1000000) return (n/1000000).toFixed(1) + 'M'; if (n >= 1000) return (n/1000).toFixed(1) + 'K'; return n.toString(); }
function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' }); } catch(e) { return d; } }
