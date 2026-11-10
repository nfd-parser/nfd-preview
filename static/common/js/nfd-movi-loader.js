/* NFD Preview enhanced MKV playback using Movi Player 0.4.1 (Apache-2.0).
 * Order: verify external FFmpeg WASM -> Slim global JS.
 * If external WASM is unavailable, try the Full JS (embeds FFmpeg WASM).
 * Never silently treat an MKV native fallback as a successful software decode.
 */
(function (global) {
    'use strict';
    const DIST = 'movi-player@0.4.1/dist/';
    const REMOTE_CDNS = [
        {name: 'JSDMirror', root: 'https://cdn.jsdmirror.cn/npm/' + DIST},
        {name: 'unpkg', root: 'https://unpkg.com/' + DIST},
        {name: 'jsDelivr Fastly (backup)', root: 'https://fastly.jsdelivr.net/npm/' + DIST},
        {name: 'jsDelivr (last resort)', root: 'https://cdn.jsdelivr.net/npm/' + DIST}
    ];
    // Optional pinned first-party assets, installed by scripts/vendor-movi.sh.
    // A small manifest probe avoids requesting nonexistent 5.6MB binaries.
    const localRoot = new URL('../../vendor/movi-player/0.4.1/',
        document.currentScript.src).href;
    let sourcesPromise = null;
    function sources() {
        if (!sourcesPromise) sourcesPromise = (async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1500);
            try {
                const response = await fetch(localRoot + 'manifest.json', {
                    signal: controller.signal, cache: 'force-cache'
                });
                if (response.ok) {
                    const manifest = await response.json();
                    if (manifest && manifest.version === '0.4.1') {
                        return [{name:'NFD 本站静态 CDN', root:localRoot}, ...REMOTE_CDNS];
                    }
                }
            } catch (_) { /* Self-hosted assets not installed yet */ }
            finally { clearTimeout(timer); }
            return REMOTE_CDNS;
        })();
        return sourcesPromise;
    }
    const jsLoaded = Object.create(null);
    let wasmPromise = null;
    const warn = (...args) => console.warn('[NFD Movi]', ...args);
    const hint = text => {
        const el = document.getElementById('jp-loading-stats');
        if (el) el.textContent = text;
    };
    function scriptAt(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            const el = document.createElement('script');
            let done = false;
            const finish = (err) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                el.onload = el.onerror = null;
                if (err) { el.remove(); reject(err); }
                else resolve();
            };
            const timer = setTimeout(() => finish(new Error('JS CDN 超时')), timeoutMs);
            el.src = url;
            el.async = true;
            el.onload = () => finish(null);
            el.onerror = () => finish(new Error('JS CDN 无法加载'));
            document.head.appendChild(el);
        });
    }
    async function loadPlayerJS(build) {
        if (global.customElements.get('movi-player')) return;
        if (jsLoaded[build]) return jsLoaded[build];
        const file = build === 'full' ? 'element.global.js' : 'element.slim.global.js';
        const promise = (async () => {
            const CDNS = await sources();
            for (let i = 0; i < CDNS.length; i++) {
                const cdn = CDNS[i];
                try {
                    hint('加载 ' + build + ' 高清播放器：' + cdn.name);
                    await scriptAt(cdn.root + file, i === CDNS.length - 1 ? 9000 : 12000);
                    if (global.customElements.get('movi-player')) return;
                    throw new Error('脚本完成，但播放器组件未注册');
                } catch (e) {
                    warn('JS source failed:', cdn.name, build, e.message);
                    // A global build may have registered despite throwing.
                    if (global.customElements.get('movi-player')) return;
                }
            }
            throw new Error('所有播放器 JS CDN 均不可用（' + build + '）');
        })();
        jsLoaded[build] = promise;
        return promise;
    }
    async function fetchWasm() {
        const CDNS = await sources();
        for (let i = 0; i < CDNS.length; i++) {
            const cdn = CDNS[i];
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), i === CDNS.length - 1 ? 10000 : 15000);
            try {
                hint('正在加载 FFmpeg WASM：' + cdn.name);
                const response = await fetch(cdn.root + 'movi.wasm', {
                    mode: 'cors', cache: 'force-cache', signal: controller.signal
                });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const size = Number(response.headers.get('content-length') || 0);
                if (size > 16 * 1024 * 1024) throw new Error('WASM 体积异常');
                const buffer = await response.arrayBuffer();
                const b = new Uint8Array(buffer);
                if (b.byteLength < 8 || b.byteLength > 16 * 1024 * 1024 ||
                    b[0] !== 0 || b[1] !== 97 || b[2] !== 115 || b[3] !== 109) {
                    throw new Error('返回数据不是 WebAssembly');
                }
                return {url: URL.createObjectURL(new Blob([buffer], {
                    type: 'application/wasm'
                })), cdn: cdn.name, bytes: b.byteLength};
            } catch (e) {
                warn('WASM source failed:', cdn.name, e.message);
            } finally { clearTimeout(t); }
        }
        throw new Error('所有 FFmpeg WASM CDN 均不可用');
    }
    function loadWasm() {
        if (!wasmPromise) wasmPromise = fetchWasm();
        return wasmPromise;
    }
    async function mount(container, mediaUrl, hooks) {
        const onReady = hooks.onReady || (() => {});
        const onFallback = hooks.onFallback || (() => {});
        const onWarning = hooks.onWarning || (() => {});
        if (!global.WebAssembly || !global.customElements) {
            onFallback('浏览器缺少 WebAssembly 或 Custom Elements');
            return;
        }
        let build = 'slim', asset = null;
        try {
            try {
                asset = await loadWasm();
                await loadPlayerJS('slim');
            } catch (firstError) {
                // Full includes the WASM binary inside its JS. It does not
                // depend on a separate *.wasm endpoint and is slower to download.
                if (global.customElements.get('movi-player')) throw firstError;
                warn('Slim unavailable, trying Full bundled WASM:', firstError.message);
                hint('独立 WASM 不可用，尝试内置解码器版本…');
                build = 'full';
                await loadPlayerJS('full');
            }
            const el = document.createElement('movi-player');
            el.style.cssText = 'display:block;width:100%;height:100%;min-height:240px';
            el.setAttribute('controls', '');
            // A single WASM engine forbids a native-first engine sequence.
            el.setAttribute('engine', 'wasm');
            el.setAttribute('sw', 'auto'); // Prefer WebCodecs for HEVC 4K, WASM fallback.
            if (build === 'slim' && asset) el.setAttribute('wasmurl', asset.url);
            let settled = false, timer = null;
            // The <movi-player> Web Component does not forward raw track
            // lists: read its core player, not el.getAudioTracks().
            const trackInfo = () => {
                const core = el.player;
                const safeList = (method, type) => {
                    try {
                        if (core && typeof core[method] === 'function') {
                            return core[method]() || [];
                        }
                        const media = core && core.getMediaInfo && core.getMediaInfo();
                        return Array.isArray(media?.tracks)
                            ? media.tracks.filter(x => x.type === type) : [];
                    } catch (err) {
                        warn('Could not read ' + type + ' tracks:', err);
                        return [];
                    }
                };
                const videoTracks = safeList('getVideoTracks', 'video');
                const audioTracks = safeList('getAudioTracks', 'audio');
                const subtitleTracks = safeList('getSubtitleTracks', 'subtitle');
                const manager = core && core.trackManager;
                const active = method => {
                    try {
                        return manager && typeof manager[method] === 'function'
                            ? manager[method]() : null;
                    } catch (_) { return null; }
                };
                const video = t => ({
                    id: t.id, codec: t.codec, codecString: t.codecString || '',
                    width: t.width, height: t.height, fps: t.frameRate,
                    pixelFormat: t.pixelFormat || '', hdr: Boolean(t.isHDR)
                });
                const audio = t => ({
                    id: t.id, codec: t.codec, codecString: t.codecString || '',
                    language: t.language || 'und', label: t.label || '',
                    channels: t.channels, sampleRate: t.sampleRate,
                    bitRate: t.bitRate
                });
                const subtitle = t => ({
                    id: t.id, codec: t.codec, language: t.language || 'und',
                    label: t.label || '', type: t.subtitleType || ''
                });
                const currentAudio = active('getActiveAudioTrack');
                const currentVideo = active('getActiveVideoTrack');
                const currentSubtitle = active('getActiveSubtitleTrack');
                return {
                    requestedBuild: build,
                    actualBuild: el.build || 'unknown',
                    assetCDN: asset ? asset.cdn : 'bundled',
                    videoTracks: videoTracks.map(video),
                    audioTracks: audioTracks.map(audio),
                    subtitleTracks: subtitleTracks.map(subtitle),
                    selectedVideo: currentVideo ? video(currentVideo) : null,
                    selectedAudio: currentAudio ? audio(currentAudio) : null,
                    selectedSubtitle: currentSubtitle ? subtitle(currentSubtitle) : null
                };
            };
            const info = () => trackInfo();
            let lastCodecSnapshot = '';
            const logCodecs = reason => {
                const data = trackInfo();
                const fingerprint = JSON.stringify([
                    data.videoTracks, data.audioTracks, data.subtitleTracks,
                    data.selectedVideo, data.selectedAudio, data.selectedSubtitle
                ]);
                if (fingerprint === lastCodecSnapshot) return;
                lastCodecSnapshot = fingerprint;
                console.log('[NFD Movi] 音视频编码信息 (' + reason + '):', data);
                console.log('[NFD Movi] 视频编码:', JSON.stringify(data.videoTracks));
                console.log('[NFD Movi] 全部音轨:', JSON.stringify(data.audioTracks));
                console.log('[NFD Movi] 当前音轨:', JSON.stringify(data.selectedAudio));
                console.log('[NFD Movi] 内封字幕:', JSON.stringify(data.subtitleTracks));
            };
            const ok = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                logCodecs('ready');
                console.log('[NFD Movi] Playback initialized:', info());
                onReady();
            };
            const error = e => {
                logCodecs('decode error');
                const detail = e && e.detail;
                const message = typeof detail === 'string' ? detail
                    : detail && (detail.message || detail.title)
                    || '播放器发生解码错误';
                if (settled) onWarning(message, info());
                else {
                    settled = true;
                    clearTimeout(timer);
                    onFallback(message, info());
                }
            };
            const native = () => {
                logCodecs('native fallback');
                // Important: the slim upstream bundle can automatically switch
                // to a native <video> after WASM trouble. For MKV, this is not
                // a successful fix for an incompatible audio codec.
                const reason = 'Movi 已退回浏览器原生解码，音轨软解未启用，请检查 WASM/跨域';
                if (settled) onWarning(reason, info());
                else {
                    settled = true;
                    clearTimeout(timer);
                    onFallback(reason, info());
                }
            };
            el.addEventListener('loadedmetadata', () => logCodecs('loadedmetadata'));
            el.addEventListener('loadeddata', () => logCodecs('loadeddata'));
            el.addEventListener('audiotrackchange', () => logCodecs('audiotrackchange'));
            el.addEventListener('subtitletrackchange', () => logCodecs('subtitletrackchange'));
            el.addEventListener('trackschange', () => logCodecs('trackschange'));
            el.addEventListener('loadedmetadata', ok, {once: true});
            el.addEventListener('loadeddata', ok, {once: true});
            el.addEventListener('canplay', ok, {once: true});
            el.addEventListener('playing', ok, {once: true});
            el.addEventListener('error', error);
            el.addEventListener('errordisplay', error);
            el.addEventListener('nativefallback', native);
            container.replaceChildren(el);
            el.setAttribute('src', mediaUrl);
            timer = setTimeout(() => {
                if (!settled) {
                    logCodecs('timeout');
                    settled = true;
                    onFallback('播放器超过 20 秒未能读取媒体元数据；请检查跨域、Range 和解码器', info());
                }
            }, 20000);
        } catch (e) {
            onFallback(e && e.message ? e.message : String(e), {build});
        }
    }
    global.NfdMoviLoader = {mount};
})(window);
