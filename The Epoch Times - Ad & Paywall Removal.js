// ==UserScript==
// @name            The Epoch Times - Ads & Paywall Removal
// @namespace       The Epoch Times - Ads & Paywall Removal
// @version         1.0
// @description     Removes ads and paywall on The Epoch Times.
// @author          asheroto
// @license         MIT
// @match           https://www.theepochtimes.com/*
// @icon            https://www.theepochtimes.com/favicon.ico
// @grant           GM_addElement
// @grant           GM_log
// ==/UserScript==

// ==OpenUserScript==
// @author          asheroto
// ==/OpenUserScript==

/* jshint esversion: 6 */

(function () {
	// List of CSS changes (instant ad removal)
	const css = `
		#ad_right_top_300x250_1 { display: none; }
		#article_ad_right_middle_300x250_1,
		#article_ad_right_middle_300x250_2,
		#article_ad_right_top_300x250_1,
		#article_ad_right_top_300x250_2,
		#in_article_ads_0,
		#in_article_ads_1,
		#in_article_ads_2,
		#in_article_ads_3,
		#in_article_ads_4,
		#in_article_ads_5,
		#in_article_ads_6,
		#in_article_ads_7,
		#in_article_ads_8,
		#inside_ad_336x280_1,
		#inside_ad_336x280_2,
		#landing-page { display: none; }
		#main { height: unset !important; overflow: unset !important; }
		#main > div { border-top: unset; margin-top: 0px; }
		#modal-COMMON { display: none !important; }
		#partnership { display: none; }
		.home-wall { display: none; }
		.login_wrapper { display: none; }
		.right_col.noprint > div { margin: unset !important; }
		.soft_stikcy { display: none !important; }
		.top_ad { display: none; }
		#footer { display: block !important; }
	`;


	// Apply the styles above to document stylesheet
	async function applyStyles(css) {
		const head = document.head || document.getElementsByTagName("head")[0];
		const style = document.createElement("style");
		head.appendChild(style);
		style.appendChild(document.createTextNode(css));
	}

	// Hide any items that have a prefix listed in the adListIds array
	async function hideAds() {
		const adListIds = ["in_article", "inside_ad", "article_ad", "ad_"];
		const elements = document.querySelectorAll('[id^="' + adListIds.join('"], [id^="') + '"], [class^="' + adListIds.join('"], [class^="') + '"]');
		elements.forEach(function (element) {
			element.style.display = "none";
			console.log("Hidden: " + element);
		});
	}

	// Every 0.5 seconds, check if any item from the blacklist array is included in the src value of an item, and if so, hide that item, ends loop after 5 seconds
	async function removeElements() {
		const blacklist = ["doubleclick.", "amazon-adsystem", "adnxs", "ads."];
		const tags = ["script", "iframe"];

		// Loop until timeout is reached
		const startTime = Date.now();
		while (Date.now() - startTime < 5000) {
			tags.forEach(function (tag) {
				const elements = document.querySelectorAll(tag);
				Array.from(elements).forEach(function (element) {
					if (blacklist.some(function (url) { return element.src.includes(url); })) {
						element.style.display = "none";
						console.log("Hidden: " + element);
					}
				});
			});

			// Wait for 0.5 seconds before checking again
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		// Log when removal loop is stopped
		console.log("Stopped removal loop");
	}

	// Modal will be hidden in CSS above, but this will help it out a little and enable the scrollbars again
	waitForElement("#modal-COMMON", () => {
		const modal = document.querySelector("#modal-COMMON");
		modal.className = modal.className.replaceAll("is-open", "is-closed");
		document.body.classList.remove("free_user", "hidden");
		document.body.style.overflow = "";
		console.log("Removed modal, enabled scrollbars");
	}, 250, 9000);


	// Function to wait until an element exists
	async function waitForElement(selector, callback, checkFrequencyInMs, timeoutInMs) {
		doLog("Waiting for element: " + selector);
		const startTimeInMs = Date.now();
		let elapsedTimeInMs = 0;
		try {
			while (elapsedTimeInMs < timeoutInMs) {
				const element = document.querySelector(selector);
				if (element) {
					callback(element);
					doLog("Element found: " + selector);
					return;
				} else {
					await new Promise(resolve => setTimeout(resolve, checkFrequencyInMs));
					elapsedTimeInMs = Date.now() - startTimeInMs;
				}
			}
			doLog("Timed out waiting for element: " + selector);
		} catch (error) {
			doLog("Error waiting for element: " + selector + ". " + error);
		}
	}

	// Prefix for console log
	const logPrefix = "[Ads & Paywall Removal]";

	// Console logging function
	function doLog(msg) {
		console.log(logPrefix + " " + msg);
	};

	// Run everything
	applyStyles(css);
	hideAds();
	removeElements();
});