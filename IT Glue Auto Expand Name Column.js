// ==UserScript==
// @name         IT Glue - Auto Expand Name Column
// @namespace    asheroto
// @version      0.0.2
// @description  Automatically expands the Name column on IT Glue tables by simulating a real mouse drag on the column-resizer.
// @match        https://*.itglue.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DRAG_DISTANCE_PX = 300;
    const SETTLE_MS = 1500;
    const POST_LOAD_DELAY_MS = 1000;
    const POST_NAV_DELAY_MS = 500;
    const MAX_WAIT_MS = 30000;

    // If the Name column is already at least this wide, skip the drag.
    const ALREADY_WIDE_PX = 400;

    function isTargetPage() {
        return /\/passwords\/?$/.test(location.pathname);
    }

    let handledTables = new WeakSet();

    function fireMouseEvent(type, target, x, y) {
        const evt = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
        });
        target.dispatchEvent(evt);
    }

    function dragResizer(resizer, distance) {
        const rect = resizer.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endX = startX + distance;

        fireMouseEvent('mousedown', resizer, startX, startY);

        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            const x = startX + (distance * i) / steps;
            fireMouseEvent('mousemove', document, x, startY);
        }

        fireMouseEvent('mouseup', document, endX, startY);
    }

    function waitForResizerToSettle(table) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            let lastSignature = '';
            let lastChangeAt = Date.now();

            const tick = () => {
                if (Date.now() - startedAt > MAX_WAIT_MS) {
                    reject(new Error('Timed out waiting for resizer to settle'));
                    return;
                }

                if (!document.contains(table)) {
                    reject(new Error('Table detached from DOM'));
                    return;
                }

                if (!isTargetPage()) {
                    reject(new Error('Navigated away from target page'));
                    return;
                }

                const nameTh = table.querySelector('th.column-name');
                const resizer = nameTh?.querySelector('div.column-resizer');

                if (!resizer) {
                    lastChangeAt = Date.now();
                    setTimeout(tick, 150);
                    return;
                }

                const thRect = nameTh.getBoundingClientRect();
                const rRect = resizer.getBoundingClientRect();
                const signature = `${thRect.width}|${rRect.left}|${rRect.width}|${rRect.height}`;

                if (signature !== lastSignature) {
                    lastSignature = signature;
                    lastChangeAt = Date.now();
                    setTimeout(tick, 150);
                    return;
                }

                if (Date.now() - lastChangeAt >= SETTLE_MS && rRect.width > 0 && rRect.height > 0) {
                    resolve({ resizer, nameTh });
                    return;
                }

                setTimeout(tick, 150);
            };

            tick();
        });
    }

    async function expandNameColumn(table) {
        if (handledTables.has(table)) return;
        handledTables.add(table);

        try {
            const { resizer, nameTh } = await waitForResizerToSettle(table);

            const currentWidth = nameTh.getBoundingClientRect().width;
            if (currentWidth >= ALREADY_WIDE_PX) {
                console.log(
                    '[IT Glue Expand] Name column already',
                    Math.round(currentWidth),
                    'px (>=', ALREADY_WIDE_PX, 'px), skipping drag'
                );
                return;
            }

            dragResizer(resizer, DRAG_DISTANCE_PX);
            console.log(
                '[IT Glue Expand] Name column was',
                Math.round(currentWidth),
                'px — dragged by', DRAG_DISTANCE_PX, 'px'
            );
        } catch (err) {
            console.warn('[IT Glue Expand]', err.message);
            handledTables.delete(table);
        }
    }

    function scanForTables(root = document) {
        if (!isTargetPage()) return;
        const tables = root.querySelectorAll('div.react-table');
        tables.forEach(expandNameColumn);
    }

    let observer = null;

    function startObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver((mutations) => {
            if (!isTargetPage()) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('div.react-table')) {
                        expandNameColumn(node);
                    } else {
                        scanForTables(node);
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function handleNavigation() {
        console.log('[IT Glue Expand] Navigation detected:', location.href);
        handledTables = new WeakSet();

        if (!isTargetPage()) {
            console.log('[IT Glue Expand] Not a /passwords page, skipping');
            return;
        }

        setTimeout(() => {
            scanForTables();
        }, POST_NAV_DELAY_MS);
    }

    function hookHistoryNavigation() {
        const origPush = history.pushState;
        const origReplace = history.replaceState;

        history.pushState = function (...args) {
            const result = origPush.apply(this, args);
            window.dispatchEvent(new Event('itglue:locationchange'));
            return result;
        };

        history.replaceState = function (...args) {
            const result = origReplace.apply(this, args);
            window.dispatchEvent(new Event('itglue:locationchange'));
            return result;
        };

        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('itglue:locationchange'));
        });

        let lastUrl = location.href;
        window.addEventListener('itglue:locationchange', () => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                handleNavigation();
            }
        });
    }

    function start() {
        startObserver();
        hookHistoryNavigation();
        scanForTables();
    }

    function whenWindowLoaded() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', () => resolve(), { once: true });
            }
        });
    }

    (async () => {
        await whenWindowLoaded();
        await new Promise((r) => setTimeout(r, POST_LOAD_DELAY_MS));
        console.log('[IT Glue Expand] Starting after window load + grace period');
        start();
    })();
})();