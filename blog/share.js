// Function to insert the share menu dynamically
function insertShareMenu() {
	const shareMenuHTML = `
		<div class="share-menu">
			<button id="share-button" class="share-button" aria-label="Share this page" title="Share"></button>
			<div id="share-menu" class="dropdown-content">
				<a id="whatsappShare" href="#" target="_blank">
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.19-.31a8.19 8.19 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.2-8.25 8.2Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.98-.14.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48c-.16 0-.43.06-.65.31-.23.25-.87.85-.87 2.07 0 1.23.89 2.41 1.01 2.58.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.5.16.94.14 1.29.08.39-.06 1.23-.5 1.4-.99.17-.48.17-.9.12-.98-.05-.09-.19-.14-.44-.26Z"/></svg> WhatsApp
				</a>
				<a id="copyURL" href="#" onclick="copyShortURL(event)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5.5A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"/></svg> Copy URL
				</a>
			</div>
		</div>
	`;

	// Insert into the body (you can change the position as needed)
	document.body.insertAdjacentHTML("beforeend", shareMenuHTML);
}

// Function to shorten URL using TinyURL
async function shortenWithTinyURL(longUrl) {
	const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
	return response.text();
}

// Function to update share links dynamically
async function updateShareLinks() {
	const pageTitle = document.title;
	const addressLine = document.querySelector(".info-table tr:nth-child(3) td")?.innerText.trim() || ""; 
	const shortUrl = await shortenWithTinyURL(window.location.href);
	const message = `${pageTitle}${addressLine ? ", " + addressLine : ""} - ${shortUrl}`;

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
	insertShareMenu(); // Insert the share menu dynamically
	updateShareLinks(); // Update the share links

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
});
