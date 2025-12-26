/* ============================================
   Session Guard - Single Tab Session Enforcement
   Prevents multiple tabs from accessing admin panel
   Include this in ALL admin pages (except signin, verify)
   ============================================ */

(function () {
    'use strict';

    const SESSION_KEY = 'craftsoft_admin_active_tab';
    const HEARTBEAT_KEY = 'craftsoft_admin_heartbeat';
    const CHANNEL_NAME = 'craftsoft_admin_session';
    const HEARTBEAT_INTERVAL = 2000; // 2 seconds
    const HEARTBEAT_TIMEOUT = 5000; // 5 seconds - consider tab dead if no heartbeat

    // Generate unique tab ID
    const currentTabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    let heartbeatTimer = null;
    let channel = null;

    // ============================================
    // CHECK IF ANOTHER TAB IS ACTIVE
    // ============================================

    function isAnotherTabActive() {
        const existingTab = localStorage.getItem(SESSION_KEY);
        const lastHeartbeat = localStorage.getItem(HEARTBEAT_KEY);

        if (!existingTab) {
            return false;
        }

        // Check if the existing tab is still alive (heartbeat within timeout)
        if (lastHeartbeat) {
            const timeSinceHeartbeat = Date.now() - parseInt(lastHeartbeat, 10);
            if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
                // Existing tab is dead/crashed, clear it
                localStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(HEARTBEAT_KEY);
                return false;
            }
        }

        // Another tab is active
        return existingTab !== currentTabId;
    }

    // ============================================
    // REGISTER THIS TAB AS ACTIVE
    // ============================================

    function registerAsActiveTab() {
        localStorage.setItem(SESSION_KEY, currentTabId);
        updateHeartbeat();
        startHeartbeat();
    }

    // ============================================
    // HEARTBEAT SYSTEM
    // ============================================

    function updateHeartbeat() {
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
    }

    function startHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
        heartbeatTimer = setInterval(() => {
            // Only update heartbeat if we're still the active tab
            if (localStorage.getItem(SESSION_KEY) === currentTabId) {
                updateHeartbeat();
            } else {
                // Another tab took over, redirect
                redirectToSignin();
            }
        }, HEARTBEAT_INTERVAL);
    }

    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    // ============================================
    // BROADCAST CHANNEL (instant cross-tab communication)
    // ============================================

    function initBroadcastChannel() {
        if (!('BroadcastChannel' in window)) {
            return;
        }

        channel = new BroadcastChannel(CHANNEL_NAME);

        channel.onmessage = (event) => {
            const data = event.data;

            if (data.type === 'NEW_TAB_OPENED' && data.tabId !== currentTabId) {
                // Another tab is trying to open - tell it we exist
                channel.postMessage({
                    type: 'TAB_EXISTS',
                    tabId: currentTabId
                });
            }

            if (data.type === 'TAB_EXISTS' && data.tabId !== currentTabId) {
                // We're the new tab and another tab exists - redirect
                redirectToSignin();
            }

            if (data.type === 'TAB_CLOSED' && data.tabId !== currentTabId) {
                // The other tab closed, we can potentially take over
                // But only if we were blocked - not needed in this flow
            }
        };

        // Announce this tab
        channel.postMessage({
            type: 'NEW_TAB_OPENED',
            tabId: currentTabId
        });
    }

    // ============================================
    // CLEANUP ON TAB CLOSE
    // ============================================

    function cleanup() {
        // Only clear if we're the active tab
        if (localStorage.getItem(SESSION_KEY) === currentTabId) {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(HEARTBEAT_KEY);
        }

        stopHeartbeat();

        if (channel) {
            channel.postMessage({
                type: 'TAB_CLOSED',
                tabId: currentTabId
            });
            channel.close();
        }
    }

    // ============================================
    // REDIRECT TO SIGNIN
    // ============================================

    function redirectToSignin() {
        stopHeartbeat();
        if (channel) {
            channel.close();
        }
        window.location.replace('signin.html');
    }

    // ============================================
    // SHOW PAGE (remove hidden state)
    // ============================================

    function showPage() {
        // Add class to make body visible
        if (document.body) {
            document.body.classList.add('session-validated');
        } else {
            // Body not ready yet, wait for it
            document.addEventListener('DOMContentLoaded', () => {
                document.body.classList.add('session-validated');
            });
        }
    }

    // ============================================
    // INITIALIZE
    // ============================================

    function init() {
        // Check if another tab is already active
        if (isAnotherTabActive()) {
            redirectToSignin();
            return;
        }

        // Register this tab as active
        registerAsActiveTab();

        // Initialize broadcast channel for instant communication
        initBroadcastChannel();

        // SESSION VALIDATED - Show the page
        showPage();

        // Cleanup on page unload
        window.addEventListener('beforeunload', cleanup);

        // Also handle visibility changes (tab hidden/shown)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Tab became visible, update heartbeat
                if (localStorage.getItem(SESSION_KEY) === currentTabId) {
                    updateHeartbeat();
                } else {
                    // Another tab took over while we were hidden
                    redirectToSignin();
                }
            }
        });

        // Handle storage events (changes from other tabs)
        window.addEventListener('storage', (event) => {
            if (event.key === SESSION_KEY && event.newValue && event.newValue !== currentTabId) {
                // Another tab registered as active
                redirectToSignin();
            }
        });
    }

    // Run immediately
    init();

})();
