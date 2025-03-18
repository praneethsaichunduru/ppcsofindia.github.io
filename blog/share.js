// Function to insert the share menu dynamically
function insertShareMenu() {
	const shareMenuHTML = `
		<div class="share-menu">
			<button id="share-button" class="share-button">
				<img src="https://commons.wikimedia.org/wiki/File:Feather-core-share-2.svg" alt="Share">
			</button>
			<div id="share-menu" class="dropdown-content">
				<a id="whatsappShare" href="#" target="_blank">
					<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp"> WhatsApp
				</a>
				<a id="copyURL" href="#" onclick="copyShortURL(event)">
					<img src="https://upload.wikimedia.org/wikipedia/commons/8/8d/Copy_Icon.svg" alt="Copy"> Copy URL
				</a>
			</div>
		</div>
	`;

// Function to shorten URL using TinyURL
async function shortenWithTinyURL(longUrl) {
	const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
	return response.text();
}

// Function to update share links dynamically
async function updateShareLinks() {
	const pageTitle = document.title;
	const shortUrl = await shortenWithTinyURL(window.location.href);
	const message = `${pageTitle} - ${shortUrl}`;

	document.getElementById('whatsappShare').href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
	document.getElementById('copyURL').setAttribute("data-url", message);
}

// Function to copy shortened URL to clipboard
function copyShortURL(event) {
	event.preventDefault();
	const message = event.target.closest('a').getAttribute("data-url");
	navigator.clipboard.writeText(message).then(() => {
		alert("Copied.");
	}).catch(err => console.error('Failed to copy:', err));
}

// Event listener to handle share button toggle
document.addEventListener("DOMContentLoaded", function () {
	const shareButton = document.getElementById("share-button");
	const shareMenu = document.getElementById("share-menu");

	// Toggle menu on click
	shareButton.addEventListener("click", function (event) {
		event.stopPropagation(); // Prevent immediate closing
		shareMenu.classList.toggle("visible");
	});

	// Close menu when clicking outside
	document.addEventListener("click", function (event) {
		if (!shareMenu.contains(event.target) && event.target !== shareButton) {
			shareMenu.classList.remove("visible");
		}
	});

	// Prevent closing when interacting inside the menu
	shareMenu.addEventListener("click", function (event) {
		event.stopPropagation();
	});

	// Update share links
	updateShareLinks();
});
