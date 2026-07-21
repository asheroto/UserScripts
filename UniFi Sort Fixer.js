// ==UserScript==
// @name         UniFi Sort Fixer
// @namespace    UniFi Sort Fixer
// @version      0.4
// @description  Fixes the alphabetical sorting on UniFi
// @author       asheroto
// @match        https://unifi.ui.com/*
// @icon         https://icons.duckduckgo.com/ip2/ui.com.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function() {
    'use strict';
    // Snapshot console BEFORE the page can override it
    const _log = console.log.bind(console);
    const _warn = console.warn.bind(console);
    const PREFIX = '%c[UniFi Sort Fixer]';
    const STYLE = 'color:#0a84ff;font-weight:bold';
    function LOG(...args) { _log(PREFIX, STYLE, ...args); }
    function WARN(...args) { _warn(PREFIX, STYLE, ...args); }
    LOG('Script loaded at', location.href);
    function ready(fn) {
        if (document.body) fn();
        else document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
    const PAGE_TITLE = 'UniFi Site Manager';
    function onSiteManager() {
        return document.title.trim() === PAGE_TITLE;
    }
    ready(() => {
        LOG('DOM ready, starting');
        let attempts = 0;
        let clicked = false;
        const MAX_ATTEMPTS = 50;
        function clickSiteHeader() {
            if (clicked) {
                LOG('Already clicked, skipping');
                return;
            }
            attempts++;
            const buttons = document.querySelectorAll('span[role="button"]');
            LOG(`Attempt ${attempts}: found ${buttons.length} span[role="button"]`);
            if (buttons.length > 0) {
                const texts = Array.from(buttons).map(el => `"${el.textContent.trim().slice(0, 30)}"`);
                LOG('Texts:', texts.join(', '));
            }
            const btn = Array.from(buttons).find(el => el.textContent.trim() === 'Site');
            if (btn) {
                LOG('Found "Site" — clicking', btn);
                clicked = true;
                btn.click();
                return;
            }
            if (attempts >= MAX_ATTEMPTS) {
                WARN(`Gave up after ${attempts} tries. Dumping header candidates:`);
                const candidates = document.querySelectorAll('[role="button"], [role="columnheader"], th, [class*="header" i]');
                WARN(`Found ${candidates.length} candidates`);
                Array.from(candidates).slice(0, 30).forEach((el, i) => {
                    const text = el.textContent.trim().slice(0, 40);
                    if (text) WARN(`[${i}] <${el.tagName.toLowerCase()}> role="${el.getAttribute('role')}" text="${text}"`, el);
                });
                return;
            }
            setTimeout(clickSiteHeader, 200);
        }
        function tryRun() {
            if (!onSiteManager()) {
                LOG(`Not "${PAGE_TITLE}" (title: "${document.title}") — standing by`);
                return;
            }
            LOG('Starting header search for', location.href);
            attempts = 0;
            clicked = false;
            clickSiteHeader();
        }
        tryRun();
        let lastUrl = location.href;
        let lastTitle = document.title;
        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl || document.title !== lastTitle) {
                LOG('Change:', `${lastTitle} @ ${lastUrl}`, '->', `${document.title} @ ${location.href}`);
                lastUrl = location.href;
                lastTitle = document.title;
                tryRun();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();