// ==UserScript==
// @name            Facebook Blocks
// @version         0.3
// @description     Removes the section titled "Sponsored" on the right side of Facebook in the messenger area and removes the stories
// @author          asheroto
// @license         MIT
// @icon            https://facebook.com/favicon.ico
// @match           https://www.facebook.com/
// @namespace       https://greasyfork.org/en/scripts/422348-facebook-block-sponsored-section-in-messenger
// @grant           GM_addElement
// ==/UserScript==

// ==OpenUserScript==
// @author          asheroto
// ==/OpenUserScript==

/* jshint esversion: 6 */

(function () {
	let xpath = function (xpathToExecute) {
		let result = [];
		let nodesSnapshot = document.evaluate(xpathToExecute, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
			result.push(nodesSnapshot.snapshotItem(i));
		}
		return result;
	};

	let thePath = "//div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div[3]/div/div/div[1]/div/div[1]/span/div";

	// Run every 0.5 seconds
	let intv = 500;
	let go = setInterval(pollDOM, intv);

	// Clear after 5 seconds
	let intvEnd = 5000;
	setTimeout(function () { clearInterval(go); }, intvEnd);

	function pollDOM() {
		try {
			if (xpath(thePath)[0].children[0].children.length) {
				xpath(thePath)[0].children[0].remove();
			}
		}
		catch (e) { }
	}

	setTimeout(function () {
		thePath = "/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div[2]/div/div/div/div[2]";
		if (xpath(thePath)[0].length) {
			xpath(thePath)[0].remove();
		}
	}, 1500);

	thePath = "/html/body/div[1]/div/div[1]/div/div[5]/div/div/div[3]/div/div/div[1]/div[1]/div/div[2]/div/div/div[1]/div/div[1]/span";
	intv = 500;
	go = setInterval(pollDOM, intv);
	intvEnd = 5000;
	setTimeout(function () { clearInterval(go); }, intvEnd);
})();