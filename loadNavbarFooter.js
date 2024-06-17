function loadHTML(id, url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            document.getElementById(id).innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading the file:', error);
        });
}

document.addEventListener("DOMContentLoaded", function() {
    loadHTML('navbar-placeholder', 'data/navbar.html');
    loadHTML('footer-placeholder', 'data/footer.html');
});
