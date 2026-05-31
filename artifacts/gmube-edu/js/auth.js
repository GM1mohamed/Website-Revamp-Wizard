function login(type, name, secret) {
    var table = type === 'teacher' ? 'teachers' : 'students';
    var endpoint = table + '?name=eq.' + encodeURIComponent(name) + '&secret=eq.' + encodeURIComponent(secret);
    return api(endpoint).then(function(data) {
        if (data && data.length > 0) {
            var user = data[0];
            var session = { type: type, name: user.name, user_id: user.user_id, id: user.id, subject: user.subject || null, grade: user.grade || null };
            saveSession(session);
            return session;
        } else {
            throw new Error('بيانات الدخول غير صحيحة');
        }
    });
}

function saveSession(session) { localStorage.setItem('gmube_edu_session', JSON.stringify(session)); }
function getSession() { var s = localStorage.getItem('gmube_edu_session'); return s ? JSON.parse(s) : null; }
function isLoggedIn() { return getSession() !== null; }
function isTeacher() { var s = getSession(); return s && s.type === 'teacher'; }
function isStudent() { var s = getSession(); return s && s.type === 'student'; }

function logout() {
    localStorage.removeItem('gmube_edu_session');
    var onRoot = !window.location.pathname.includes('/pages/');
    window.location.href = onRoot ? 'login.html' : '../login.html';
}

function requireAuth() {
    if (!isLoggedIn()) {
        var onRoot = !window.location.pathname.includes('/pages/');
        window.location.href = onRoot ? 'login.html' : '../login.html';
        return false;
    }
    return true;
}

function requireTeacher() {
    if (!requireAuth()) return false;
    if (!isTeacher()) {
        var onRoot = !window.location.pathname.includes('/pages/');
        window.location.href = onRoot ? 'index.html' : '../index.html';
        return false;
    }
    return true;
}
