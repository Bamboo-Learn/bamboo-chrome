
chrome.runtime.onInstalled.addListener(function () {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher()
			],
			actions: [
				// open the popup when icon is clicked
				new chrome.declarativeContent.ShowPageAction()
			]
		}]);
	});
});


// TODO: if on app.bamboolearn.com then hide the overlay
