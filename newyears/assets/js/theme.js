document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('htmx:sseMessage', function(e) {
        if (e.detail.type === 'streamer') {
            updateStreamerName();
        }
    });
});

function updateStreamerName() {
    fetch('/api')
        .then(res => res.json())
        .then(data => {
            const name = data.main.dj.djname;
            const el = document.getElementById('streamer-name');
            if (el) el.textContent = name;
        })
        .catch(err => console.error('error:', err));
}