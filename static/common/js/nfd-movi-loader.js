/* NFD Preview: Movi Player 0.4.1, Apache-2.0 (enhanced videos only).
 * Browser-only integration; no server transcoding. Pin the upstream version.
 */
(function (global) {
    'use strict';
    const DIST = 'movi-player@0.4.1/dist/';
    // Public mainland-facing npm CDN first; jsDelivr is an international fallback.
    const cdnRoots = [
        'https://npm.elemecdn.com/' + DIST,
        'https://cdn.jsdelivr.net/npm/' + DIST
    ];
    let scriptPromise = null;
    let wasmPromise = null;
    function setStatus(s) {
        const e = document.getElementById('jp-loading-stats');
        if (e) e.textContent = s;
    }
    function fetchScript(index) {
        if (global.customElements.get('movi-player')) return Promise.resolve();
        if (index >= cdnRoots.length) return Promise.reject(new Error('播放器 JS CDN 均不可用'));
        return new Promise(function(resolve, reject) {
            const tag = document.createElement('script');
            const timer = setTimeout(function() {
                tag.onload = tag.onerror = null;
                tag.remove();
                reject(new Error('播放器 JS 下载超时'));
            }, 12000);
            function complete() { clearTimeout(timer); tag.onload = tag.onerror = null; }
            tag.src = cdnRoots[index] + 'element.slim.global.js';
            tag.onload = function() {
                complete();
                if (global.customElements.get('movi-player')) resolve();
                else reject(new Error('Movi Web Component 未注册'));
            };
            tag.onerror = function() { complete(); tag.remove(); reject(new Error('播放器 JS 下载失败')); };
            document.head.appendChild(tag);
        }).catch(function (err) {
            console.warn('[NFD Preview] Movi JS CDN unavailable:', cdnRoots[index], err);
            return fetchScript(index + 1);
        });
    }
    function loadScript() {
        if (!scriptPromise) scriptPromise = fetchScript(0);
        return scriptPromise;
    }
    async function fetchWasm(index) {
        if (index >= cdnRoots.length) throw new Error('FFmpeg WASM CDN 均不可用');
        const url = cdnRoots[index] + 'movi.wasm';
        const controller = new AbortController();
        const timer = setTimeout(function() { controller.abort(); }, 30000);
        try {
            setStatus('正在加载高清播放器解码器…');
            const resp = await fetch(url, {mode: 'cors', signal: controller.signal});
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const expected = Number(resp.headers.get('content-length') || 0);
            if (expected > 16 * 1024 * 1024) throw new Error('WASM 文件超过预期大小');
            const buf = await resp.arrayBuffer();
            const b = new Uint8Array(buf);
            // Reject stale CDN error HTML or a different binary.
            if (b.length < 8 || b.length > 16 * 1024 * 1024 ||
                b[0] !== 0x00 || b[1] !== 0x61 || b[2] !== 0x73 || b[3] !== 0x6d) {
                throw new Error('CDN 返回的不是有效 WASM 文件');
            }
            // The Blob URL is same-origin and prevents a second remote WASM fetch.
            return URL.createObjectURL(new Blob([buf], {type: 'application/wasm'}));
        } catch (e) {
            console.warn('[NFD Preview] WASM CDN unavailable:', url, e);
            return fetchWasm(index + 1);
        } finally {
            clearTimeout(timer);
        }
    }
    function loadWasm() {
        if (!wasmPromise) wasmPromise = fetchWasm(0);
        return wasmPromise;
    }
    async function mount(container, mediaUrl, hooks) {
        const ready = hooks.onReady || function() {};
        const fallback = hooks.onFallback || function() {};
        if (!global.WebAssembly || !global.customElements) {
            fallback('浏览器不支持 WebAssembly / Custom Elements');
            return;
        }
        try {
            const result = await Promise.all([loadScript(), loadWasm()]);
            const wasmUrl = result[1];
            const player = document.createElement('movi-player');
            player.style.cssText = 'display:block;width:100%;height:100%;min-height:240px';
            player.setAttribute('controls', '');
            player.setAttribute('fallback', 'native');
            player.setAttribute('wasmurl', wasmUrl);
            let settled = false, timer = null;
            const finish = function() {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                ready();
            };
            const fail = function(message) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                fallback(message || '增强播放器未能加载');
            };
            player.addEventListener('loadedmetadata', finish, {once: true});
            player.addEventListener('loadeddata', finish, {once: true});
            player.addEventListener('canplay', finish, {once: true});
            player.addEventListener('playing', finish, {once: true});
            player.addEventListener('error', function(event) {
                fail((event && event.detail && event.detail.message) || 'Movi 播放器失败');
            });
            player.addEventListener('errordisplay', function(event) {
                fail((event && event.detail && event.detail.message) || 'Movi 解码失败');
            });
            // Native fallthrough is handled within Movi and doesn't always imply
            // the media is unplayable, so do not force a second fallback here.
            container.replaceChildren(player);
            // Set src only after wasmurl + listeners are ready.
            player.setAttribute('src', mediaUrl);
            // A stalled source must not leave the overlay indefinitely.
            timer = setTimeout(finish, 18000);
        } catch (e) {
            fallback(e && e.message ? e.message : String(e));
        }
    }
    global.NfdMoviLoader = {mount: mount};
})(window);
