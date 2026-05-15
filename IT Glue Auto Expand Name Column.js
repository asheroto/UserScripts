// ==UserScript==
// @name         IT Glue - Auto Expand Name Column
// @namespace    asheroto
// @version      0.0.1
// @description  Automatically expands the Name column on IT Glue tables by simulating a real mouse drag on the column-resizer.
// @match        https://*.itglue.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // How far to drag the resizer to the right (in pixels).
    const DRAG_DISTANCE_PX = 300;

    // How long the resizer must be "stable" (unchanged position/size) before
    // we treat React as fully hydrated and dispatch the drag.
    const SETTLE_MS = 1500;

    // Extra delay after window 'load' before we even start watching, to let
    // React do its first few render passes.
    const POST_LOAD_DELAY_MS = 1000;

    // Hard cap so we don't wait forever.
    const MAX_WAIT_MS = 30000;

    // Track which tables we've already resized.
    const handledTables = new WeakSet();

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

    // Wait until the resizer has been in the DOM with a stable position
    // for SETTLE_MS — our proxy for "React has finished hydrating".
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
                    resolve(resizer);
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
            const resizer = await waitForResizerToSettle(table);
            dragResizer(resizer, DRAG_DISTANCE_PX);
            console.log('[IT Glue Expand] Dragged Name column resizer by', DRAG_DISTANCE_PX, 'px');
        } catch (err) {
            console.warn('[IT Glue Expand]', err.message);
            handledTables.delete(table);
        }
    }

    function scanForTables(root = document) {
        const tables = root.querySelectorAll('div.react-table');
        tables.forEach(expandNameColumn);
    }

    function start() {
        scanForTables();

        const observer = new MutationObserver((mutations) => {
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

    // Wait for window 'load' (all resources), then an extra grace period
    // before we start scanning for tables.
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