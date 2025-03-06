function showPopup(message, duration = 5000) {
	// Create popup element
	let popup = document.createElement("div");
	popup.id = "popup";
	popup.innerHTML = message;

	// Apply styles
	popup.style.position = "fixed";
	popup.style.top = "50%";
	popup.style.left = "50%";
	popup.style.transform = "translate(-50%, -50%)";
	popup.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
	popup.style.color = "white";
	popup.style.padding = "20px";
	popup.style.borderRadius = "10px";
	popup.style.zIndex = "1000";
	popup.style.fontFamily = "Arial, sans-serif";
	popup.style.textAlign = "center";
	popup.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.3)";

	// Append popup to the body
	document.body.appendChild(popup);

	// Remove the popup after the specified duration
	setTimeout(function() {
		popup.remove();
	}, duration);
}

// Automatically show the popup when the page loads
window.onload = function() {
	showPopup("To source, catalog, and consolidate the information provided, it took us philatelists a lot of time. Please consider that.");
};
