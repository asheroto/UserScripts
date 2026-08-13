// ==UserScript==
// @name         Microsoft Partner Center Sort Fixer
// @namespace    Microsoft Partner Center Sort Fixer
// @version      0.1
// @description  Sorts the Customers list by Name on Microsoft Partner Center
// @author       asheroto
// @match        https://partner.microsoft.com/*
// @icon         https://icons.duckduckgo.com/ip2/microsoft.com.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function() {
    'use strict';
    // Snapshot console BEFORE the page can override it
    const _log = console.log.bind(console);
    const _warn = console.warn.bind(console);
    const PREFIX = '%c[MPC Sort Fixer]';
    const STYLE = 'color:#0a84ff;font-weight:bold';
    function LOG(...args) { _log(PREFIX, STYLE, ...args); }
    function WARN(...args) { _warn(PREFIX, STYLE, ...args); }
    LOG('Script loaded at', location.href);
    function ready(fn) {
        if (document.body) fn();
        else document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
    function onCustomersList() {
        return location.pathname.replace(/\/+$/, '').endsWith('/customers/list');
    }
    // The grid lives inside shadow DOM, so document.querySelectorAll can't see it.
    // Recursively search every shadow root.
    function deepQueryAll(selector, root = document) {
        const results = Array.from(root.querySelectorAll(selector));
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) results.push(...deepQueryAll(selector, el.shadowRoot));
        });
        return results;
    }
    ready(() => {
        LOG('DOM ready, starting');
        let attempts = 0;
        let clicked = false;
        const MAX_ATTEMPTS = 50;
        function clickNameHeader() {
            if (clicked) {
                LOG('Already clicked, skipping');
                return;
            }
            attempts++;
            const buttons = deepQueryAll('th[role="columnheader"] button.data-grid__sort');
            const candidates = buttons.filter(el => el.textContent.trim().startsWith('Name'));
            LOG(`Attempt ${attempts}: found ${candidates.length} "Name" candidates of ${buttons.length} sort buttons`);
            const target = candidates[0];
            if (target) {
                LOG('Found "Name" - clicking', target);
                clicked = true;
                target.click();
                return;
            }
            if (attempts >= MAX_ATTEMPTS) {
                WARN(`Gave up after ${attempts} tries. Dumping header candidates:`);
                const dump = deepQueryAll('[role="button"], [role="columnheader"], th, button');
                WARN(`Found ${dump.length} candidates`);
                Array.from(dump).slice(0, 30).forEach((el2, i) => {
                    const text = el2.textContent.trim().slice(0, 40);
                    if (text) WARN(`[${i}] <${el2.tagName.toLowerCase()}> role="${el2.getAttribute('role')}" text="${text}"`, el2);
                });
                return;
            }
            setTimeout(clickNameHeader, 200);
        }
        function tryRun() {
            if (!onCustomersList()) {
                LOG(`Not on customers list (path: "${location.pathname}") - standing by`);
                return;
            }
            LOG('Starting header search for', location.href);
            attempts = 0;
            clicked = false;
            clickNameHeader();
        }
        tryRun();
        // SPA navigation happens inside shadow DOM where a body observer can't
        // see it, so poll the URL instead
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                LOG('URL change:', lastUrl, '->', location.href);
                lastUrl = location.href;
                tryRun();
            }
        }, 500);
    });
})();
