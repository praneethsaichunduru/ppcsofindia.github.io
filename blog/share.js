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
