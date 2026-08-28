// rar 必须整包读进 WASM 内存才能解析，超过这个体积就不在线解压了
const RAR_MAX_BYTES = 100 * 1024 * 1024;
// 预览默认把整文件读进内存；超过这个体积就提示下载，不在线预览
const SMALL_FILE_MAX_BYTES = 10 * 1024 * 1024;

let jPreview={
    config:{
        container:"", // 容器id
        staticPath:"./static", // 静态资源路径
        url:"", // 预览资源路径
        ext:"",  // 资源后缀
        mode:"", // html: preview=渲染预览；其他值=源码高亮
        name:"",  // 资源名称
        watermarkTxt:"", // 水印文字
        watermarkSize:"16px", // 水印文字大小
        priority:1, // 优先级 1：使用插件预览 2：使用office在线预览
        oburl:"https://view.officeapps.live.com/op/embed.aspx?src=", // office在线预览地址
    },
    preview(opts) {
        this.config = $.extend({}, this.config, opts);

        // 定义可能的文件名参数，方便扩展
        const filenameParams = ['response-content-disposition', 'filename', 'filename*', 'fn', 'fname', 'download_name'];

        // 解析URL
        if (this.config.url === '') {
            this.config.url = this.parseUrl('src');
        }
        const url = this.config.url;

        // 检测优先级参数
        const pri = this.parseUrl('pri');
        if (pri) {
            this.config.priority = pri;
        }
        let name = null;
        for (const param of filenameParams) {
            const value = this.parseUrl(param, url);
            if (value) {
                // 如果是 response-content-disposition，解析其中的 filename*
                if (param === 'response-content-disposition') {
                    name = value.match(/filename\*?=(.*'')?(?<FN>.*)/i).groups['FN']
                } else {
                    name = value;
                }
                break;
            }
        }
        // 如果文件名存在URL编码，解码处理
        if (name) {
            name = decodeURIComponent(name).replace(/['"]/g, '');
        } else {
            // 如果没有filename参数，从URL路径中解析
            const decodedUrl = decodeURIComponent(url);
            const paths = decodedUrl.split('/');
            name = paths[paths.length - 1].split('?')[0]; // 去掉查询参数
        }

        // 提取扩展名
        let ext = null;
        if (name) {
            const spl = name.split('.');
            ext = spl[spl.length - 1].toLowerCase();
        } else {
            const urlPath = decodeURIComponent(url).split('?')[0];
            const spl = urlPath.split('.');
            ext = spl[spl.length - 1].toLowerCase();
        }

        this.config.name = this.config.name || name || '未命名文件';
        this.config.ext = this.config.ext || ext || '';

        // 如果url为空，或者后缀为空，则提示资源不存在
        if (!url || !ext) {
            this.error('资源不存在！');
            return;
        }
        // 修改页面标题为 this.config.name
        document.title = this.config.name + ' - view';
        this.progress.start(this.config.name);

        const self = this;

        // 增加文字水印
        if (self.config.watermarkTxt !== '') {
            dynamicLoadJs(this.config.staticPath + "/common/js/watermark.js", function () {
                watermark.init({
                    watermark_txt: self.config.watermarkTxt,
                    watermark_x: 0,
                    watermark_y: 0,
                    watermark_rows: 0,
                    watermark_cols: 0,
                    watermark_x_space: 30,
                    watermark_y_space: 30,
                    watermark_font: '微软雅黑',
                    watermark_fontsize: self.config.watermarkSize,
                    watermark_color: 'black',
                    watermark_alpha: 0.2,
                    watermark_width: 180,
                    watermark_height: 80,
                    watermark_angle: 10,
                });
            });
        }

        this.startPreviw();
    },
    startPreviw(){
        let self=this;
        let url=this.config.url;
        let ext=this.config.ext;
        let static=this.config.staticPath;
        let videoExt=['mp4','avi','3gp','rmvb','rm','flv','wmv','mkv','mov','mpeg','mpg','m4v','f4v','m4v','webm'];
        let imgExt=['jpeg','jpg','gif','png','bmp','ico','webp'];
        let pdfExt=['pdf'];
        let txtExt=['txt'];
        let audioExt=['mp3','wav','ogg','aac','flac','ape','m4a','mid','ram','amr','ac3','aiff','au','m4p','mmf','mpc','tta','vqf','wv','wma'];
        let docExt=['docx'];
        let pptExt=['pptx'];
        let xlsExt=['xls','xlsx','csv'];
        let olExt=["doc","docx","docm","dot","dotx","dotm","rtf","xls","xlsx","xlt","xlsb","xlsm","csv","ppt","pptx","pps","ppsx","pptm","potm","ppam","potx","ppsm","odt","ods","odp","ott","ots","otp","wps","wpt"];
        const sourceCodeExt = [
            'js', 'ts', 'jsx', 'tsx', 'vue', 'css', 'scss', 'sass', 'less',
            'java', 'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'swift', 'kt', 'scala',
            'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'properties',
            'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
            'sql', 'gradle', 'maven', 'dockerfile', 'makefile',
            'log', 'txt', 'env'
        ];
        const markdownExt = ['md'];
        const htmlExt = ['html', 'htm'];
        // zip 容器格式，都能用 zip.js 的中央目录读取
        const zipExt = ['zip', 'jar', 'war', 'apk', 'ipa', 'epub', 'xpi', 'crx', 'whl'];
        // 纯前端解不了的压缩格式，单独给出可读提示，别落到「不支持的文件类型」
        const otherArchiveExt = ['7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'z', 'lzh', 'cab', 'iso'];


        if($.inArray(ext,imgExt)>=0){
            dynamicLoadCss(static+"/viewer/viewer.min.css", function(){
                dynamicLoadJs(static+"/viewer/viewer.min.js",function(){
                    self.imgView(url);
                })
            })
        }else if($.inArray(ext,pdfExt)>=0){
            self.pdfView(encodeURIComponent(decodeURIComponent(url)));
        }else if($.inArray(ext,audioExt)>=0){
            // 用原生 <audio> 播放，不再拉 116KB 的 yAudio（fallbackToNativeAudio 本来就没用到它）
            self.audioView(url);
        }else if($.inArray(ext,zipExt)>=0){
            dynamicLoadJs(static+"/zipjs/zip.min.js",function(){
                self.zipView(url);
            })
        }else if(ext === 'rar'){
            self.rarView(url);
        }else if($.inArray(ext,otherArchiveExt)>=0){
            self.error(ext.toUpperCase() + ' 压缩包暂不支持在线预览，请下载后查看');
        }else if($.inArray(ext,videoExt)>=0){
            var loadPlayer = function(){
                dynamicLoadJs(static+"/common/js/DPlayer.min.js",function(){
                    self.videoView(url);
                })
            };
            if(ext === 'flv'){
                dynamicLoadJs(static+"/common/js/flv.min.js",function(){ loadPlayer(); })
            } else {
                loadPlayer();
            }
        }else if($.inArray(ext,docExt)>=0 && this.config.priority == 1){
            dynamicLoadJs(static+"/docxjs/js/jszip.min.js",function(){
                dynamicLoadJs(static+"/docxjs/js/docx-preview.js",function(){
                    self.docView(url,ext);
                })
            })
        }else if($.inArray(ext,pptExt)>=0 && this.config.priority == 1){
            dynamicLoadCssAll([static+"/pptxjs/css/pptxjs.css", static+"/pptxjs/css/nv.d3.min.css"],function(){
                dynamicLoadJs(static+"/pptxjs/js/jszip.min.js",function(){
                    dynamicLoadJs(static+"/pptxjs/js/filereader.js",function(){
                        dynamicLoadJs(static+"/pptxjs/js/d3.min.js",function(){
                            dynamicLoadJs(static+"/pptxjs/js/nv.d3.min.js",function(){
                                dynamicLoadJs(static+"/pptxjs/js/divs2slides.min.js",function(){
                                    dynamicLoadJs(static+"/pptxjs/js/pptxjs.min.js",function(){
                                        self.pptView(url);
                                    })
                                })
                            })
                        })
                    })
                })
            })
        }else if($.inArray(ext,xlsExt)>=0 && this.config.priority == 1){
            dynamicLoadCssAll([
                static+"/luckysheet/css/pluginsCss.css",
                static+"/luckysheet/css/plugins.css",
                static+"/luckysheet/css/luckysheet.css",
                static+"/luckysheet/css/iconfont.css"
            ],function(){
                dynamicLoadJs(static+"/luckysheet/js/plugin.js",function(){
                    dynamicLoadJs(static+"/luckysheet/js/luckysheet.umd.js",function(){
                        dynamicLoadJs(static+"/luckysheet/js/luckyexcel.umd.js",function(){
                            dynamicLoadJs(static+"/luckysheet/js/xlsx.core.min.js",function(){
                                self.xlsView(url,ext);
                            })
                        })
                    })
                })
            })
        }else if($.inArray(ext,olExt)>=0){
            self.olView(url);
        }else if($.inArray(ext,txtExt)>=0){
            self.txtView(url);
        } else if (htmlExt.includes(ext)) {
            // 仅显式请求渲染预览时执行 HTML，其他情况默认展示源码。
            if (this.config.mode === 'preview') {
                this.htmlView(url);
            } else {
                this.sourceCodeView(url, ext);
            }
        } else if (sourceCodeExt.includes(ext)) {
            this.sourceCodeView(url, ext);
        } else if (markdownExt.includes(ext)) {
            this.markdownView(url);
        } else {
            this.error('不支持的文件类型!');
        }
    },
    /**
     * 载入浮层：百分比 / 已下载量 / 实时网速 / 剩余时间。
     * DOM 与样式内联在 preview.html 首屏，这里只负责驱动，避免等 CSS/JS 到齐才有反馈。
     */
    progress: {
        startedAt: 0,
        lastAt: 0,
        lastLoaded: 0,
        speed: 0,      // 指数平滑后的字节/秒，直接用瞬时值会因分片大小抖动得没法看
        loaded: 0,
        total: 0,
        raf: 0,
        finished: false,
        node: null,
        el(id){
            return this.node ? this.node.querySelector('#' + id) : document.getElementById(id);
        },
        start(name){
            this.node = document.getElementById('jp-loading');
            this.startedAt = this.lastAt = Date.now();
            this.lastLoaded = this.loaded = this.total = this.speed = 0;
            this.finished = false;
            var nameEl = this.el('jp-loading-name');
            if (nameEl && name) nameEl.textContent = name;
            // 解压 zip 里的条目时会二次 start，把上一轮 fail 留下的痕迹清掉
            var bar = this.el('jp-loading-bar');
            if (bar) { bar.style.display = ''; bar.classList.add('jp-indeterminate'); }
            // 清成空串而不是 0：内联宽度会盖掉 .jp-indeterminate 的 35%，把滚动条压没
            var fill = this.el('jp-loading-fill');
            if (fill) fill.style.width = '';
            var err = this.el('jp-loading-error');
            if (err) { err.style.display = 'none'; err.innerHTML = ''; }
            var stats = this.el('jp-loading-stats');
            if (stats) stats.innerHTML = '<span>正在连接…</span>';
            if (this.node) this.node.classList.remove('jp-hidden');
        },
        /** 部分预览会整体替换 body，浮层被顺带清掉，这里补回去 */
        reattach(){
            if (this.node && !this.node.parentNode && !this.finished) {
                document.body.appendChild(this.node);
            }
        },
        /**
         * @param loaded 已下载字节
         * @param total  总字节，0 表示服务端没给 Content-Length（走不确定进度条）
         */
        update(loaded, total){
            if (this.finished) return;
            var now = Date.now();
            var dt = now - this.lastAt;
            if (dt >= 200) {
                var inst = (loaded - this.lastLoaded) * 1000 / dt;
                this.speed = this.speed ? this.speed * 0.7 + inst * 0.3 : inst;
                this.lastAt = now;
                this.lastLoaded = loaded;
            }
            this.loaded = loaded;
            this.total = total || 0;
            // 分片回调可能每毫秒一次，合并到下一帧再渲染
            if (!this.raf) {
                var self = this;
                this.raf = requestAnimationFrame(function(){
                    self.raf = 0;
                    self.render();
                });
            }
        },
        render(){
            var bar = this.el('jp-loading-bar');
            var fill = this.el('jp-loading-fill');
            var stats = this.el('jp-loading-stats');
            if (!bar || !fill || !stats) return;
            var parts = [];
            if (this.total > 0) {
                var pct = Math.min(100, this.loaded * 100 / this.total);
                bar.classList.remove('jp-indeterminate');
                fill.style.width = pct.toFixed(1) + '%';
                parts.push('<span class="jp-loading-percent">' + pct.toFixed(1) + '%</span>');
                parts.push('<span>' + utils.formatBytes(this.loaded) + ' / ' + utils.formatBytes(this.total) + '</span>');
            } else {
                bar.classList.add('jp-indeterminate');
                fill.style.width = '';
                parts.push('<span class="jp-loading-percent">' + utils.formatBytes(this.loaded) + '</span>');
            }
            if (this.speed > 0) {
                parts.push('<span class="jp-loading-speed">' + utils.formatBytes(this.speed) + '/s</span>');
                if (this.total > this.loaded) {
                    var eta = (this.total - this.loaded) / this.speed;
                    parts.push('<span>剩余 ' + utils.formatDuration(eta) + '</span>');
                }
            }
            stats.innerHTML = parts.join('');
        },
        /** 内容已经可见，收起浮层 */
        done(){
            this.finished = true;
            if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
            if (this.node) this.node.classList.add('jp-hidden');
        },
        /** 失败时留在浮层上给出原因和「直接打开」兜底入口 */
        fail(msg, url){
            this.reattach();
            this.finished = true;
            if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
            if (this.node) this.node.classList.remove('jp-hidden');
            // preview0.html / pw1.html 没有这套浮层，退回把错误写进容器，别让提示无声消失
            if (!document.getElementById('jp-loading')) {
                $('#' + jPreview.config.container)
                    .css({height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
                          padding: '0 24px', textAlign: 'center', fontSize: '20px'})
                    .text(msg || '加载失败');
                return;
            }
            var bar = this.el('jp-loading-bar');
            if (bar) bar.style.display = 'none';
            var stats = this.el('jp-loading-stats');
            if (stats) stats.innerHTML = '';
            var err = this.el('jp-loading-error');
            if (err) {
                var html = String(msg || '加载失败').replace(/</g, '&lt;');
                if (url) {
                    html += '<br><a href="' + String(url).replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">尝试直接打开 / 下载</a>';
                }
                err.innerHTML = html;
                err.style.display = 'block';
            }
        }
    },
    /** 整体替换 body 的预览统一走这里，替换后把载入浮层挂回去 */
    setBody(html){
        $("body").html(html);
        this.progress.reattach();
    },
    /**
     * 流式下载并实时上报进度。整包型预览（docx/xlsx/pptx/zip 等）统一走这里，
     * 让用户看到百分比和网速，而不是对着空白页干等。
     * @returns Promise<{buffer, contentType, fileName}>
     */
    fetchWithProgress(url, options){
        const self = this;
        const opts = Object.assign({method: 'GET', referrerPolicy: 'no-referrer'}, options || {});
        // maxBytes 只是本函数的开关，别当成 fetch 的参数传下去
        // 未指定时按小文件整包读取（10MB）；rar 等会传入更大上限
        const maxBytes = opts.maxBytes || SMALL_FILE_MAX_BYTES;
        delete opts.maxBytes;
        const controller = new AbortController();
        opts.signal = opts.signal || controller.signal;
        return fetch(url, opts).then(function(response){
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            const contentType = response.headers.get('content-type') || '';
            const total = Number(response.headers.get('content-length')) || 0;
            // Content-Length 是 CORS 安全响应头，跨域也读得到，够在真正开始下载前拦下超大文件
            if (maxBytes && total > maxBytes) {
                try { controller.abort(); } catch (e) { /* ignore */ }
                throw new Error('文件 ' + utils.formatBytes(total) + '，超过 '
                    + utils.formatBytes(maxBytes) + ' 的在线预览上限，请下载后查看');
            }
            let fileName = '';
            const disposition = response.headers.get('content-disposition');
            if (disposition) {
                const matched = disposition.match(/filename\*?=(?:[\w-]+'')?"?([^";]+)"?/i);
                if (matched) {
                    try { fileName = decodeURIComponent(matched[1]); } catch (e) { fileName = matched[1]; }
                }
            }
            // 老浏览器或中间层不支持 ReadableStream 时退回整体读取，只是没有进度可显示
            if (!response.body || typeof response.body.getReader !== 'function') {
                return response.arrayBuffer().then(function(buffer){
                    return {buffer: buffer, contentType: contentType, fileName: fileName};
                });
            }
            const reader = response.body.getReader();
            const chunks = [];
            let loaded = 0;
            return (function pump(){
                return reader.read().then(function(res){
                    if (res.done) {
                        const merged = new Uint8Array(loaded);
                        let offset = 0;
                        for (let i = 0; i < chunks.length; i++) {
                            merged.set(chunks[i], offset);
                            offset += chunks[i].length;
                        }
                        return {buffer: merged.buffer, contentType: contentType, fileName: fileName};
                    }
                    chunks.push(res.value);
                    loaded += res.value.length;
                    if (maxBytes && loaded > maxBytes) {
                        try { controller.abort(); } catch (e) { /* ignore */ }
                        throw new Error('文件超过 ' + utils.formatBytes(maxBytes) + ' 的在线预览上限，请下载后查看');
                    }
                    self.progress.update(loaded, total);
                    return pump();
                });
            })();
        });
    },
    /**
     * 按内容识别编码读取文本：BOM > 响应头 charset > UTF-8 校验 > GBK
     * 直链多为 application/octet-stream，response.text() 一律按 UTF-8 解码会导致 GBK 文件乱码
     */
    fetchText(url, options){
        return this.fetchWithProgress(url, options).then(function(res){
            const matched = res.contentType.match(/charset=\s*"?([\w-]+)/i);
            return utils.decodeText(res.buffer, matched && matched[1]);
        });
    },
    /**
     * HTML 预览：fetch 文本 → blob URL → 沙箱 iframe（绕过 attachment 强制下载）
     * sandbox 不含 allow-same-origin，避免在预览域执行任意脚本时可读写父页 Cookie。
     */
    htmlView(url){
        this.setBody(
            "<div id='html-preview-wrap' style='position:absolute;inset:0;background:#fff'>" +
            "<div id='html-preview-status' style='padding:12px 16px;color:#666;font:14px/1.5 sans-serif'>正在加载 HTML…</div>" +
            "<iframe id='html-preview-frame' sandbox='allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-top-navigation-by-user-activation allow-top-navigation' " +
            "style='display:none;width:100%;height:100%;border:0;position:absolute;left:0;top:0'></iframe>" +
            "</div>"
        );
        const statusEl = document.getElementById('html-preview-status');
        const frame = document.getElementById('html-preview-frame');
        this.fetchText(url, { mode: 'cors', credentials: 'omit' })
            .then(html => {
                let doc = html || '';
                // 相对资源（css/img）按原直链目录解析；已有 <base> 则不重复插入
                try {
                    const u = new URL(url, window.location.href);
                    const baseHref = u.href.replace(/[#?].*$/, '').replace(/[^/]+$/, '');
                    if (baseHref && !/<base\s/i.test(doc)) {
                        if (/<head[^>]*>/i.test(doc)) {
                            doc = doc.replace(/<head[^>]*>/i, m => m + '\n<base href="' + baseHref + '">');
                        } else {
                            doc = '<base href="' + baseHref + '">\n' + doc;
                        }
                    }
                } catch (e) { /* ignore */ }
                const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                frame.onload = function () {
                    try { URL.revokeObjectURL(blobUrl); } catch (e) { /* ignore */ }
                };
                statusEl.style.display = 'none';
                frame.style.display = 'block';
                frame.src = blobUrl;
                this.progress.done();
            })
            .catch(error => {
                console.error('HTML 预览失败:', error);
                statusEl.style.display = 'none';
                this.progress.fail(
                    utils.describeFetchError(error) + '。若直链禁止跨域，请走服务端代理后再预览。', url);
            });
    },
    txtView(url){
        this.setBody("<div class='text-preview'><pre id='file-content'></pre><div>");
        // 使用fetch API获取文件内容
        this.fetchText(url)
            .then(text => {
                // 将获取到的文本内容放入<pre>元素中
                document.getElementById('file-content').textContent = text;
                this.progress.done();
            })
            .catch(error => {
                console.error('获取文件内容时出错:', error);
                this.progress.fail(utils.describeFetchError(error), url);
            });
    },
    olView(url){
        url = encodeURIComponent(decodeURIComponent(url))
        $("body").css({overflow:'hidden'});
        // 如果是ppt,doc文档，直接使用office在线预览
        this.setBody("<iframe id='jp-ol-frame' src='"+this.config.oburl+url+"' style='width:100%;height:100%;position:absolute;left:0;top:0'></iframe>");
        const frame = document.getElementById('jp-ol-frame');
        if (frame) frame.onload = () => this.progress.done();
        return;
    },
    getFileInfo(url, callback) {
        let self = this;

        this.fetchWithProgress(url)
            .then(res => {
                let fileName = self.config.name;
                let fileExt = self.config.ext;
                // 直链带 content-disposition 时以它为准，能纠正 URL 上缺失/错误的后缀
                if (res.fileName) {
                    fileExt = res.fileName.split('.').pop().toLowerCase();
                    fileName = res.fileName.replace(`.${fileExt}`, "");
                }
                callback({name: fileName, ext: fileExt, content: res.buffer});
            })
            .catch(error => {
                console.error('获取文件信息时出错:', error && error.message);
                self.progress.fail(utils.describeFetchError(error), url);
            });
    },

    parseUrl(field, urlstr = window.location.href) {
        const url = new URL(urlstr);
        const params = new URLSearchParams(url.search);

        // 遍历查询参数并转换键为小写
        for (const [key, value] of params.entries()) {
            if (key.toLowerCase() === field.toLowerCase()) {
                return value;
            }
        }

        return '';  // 如果没有找到参数，返回空字符串
    },
    loadLuckySheet(exportJson){
        // 获得转化后的表格数据后，使用luckysheet初始化，或者更新已有的luckysheet工作簿
        // 注：luckysheet需要引入依赖包和初始化表格容器才可以使用
        luckysheet.create({
            container: this.config.container, // 容器id
            data:exportJson.sheets,
            // plugins: ['chart'],  // luckyexcel暂不支持导入图表——解析的数据没有chart相关内容
            lang: 'zh',
            // title:exportJson.info.name,
            // userInfo:exportJson.info.name.creator,
            // showinfobar: false,
            allowCopy: true, // 是否允许拷贝
            showtoolbar: false, // 是否显示工具栏——edit
            showinfobar: false, // 是否显示顶部信息栏
            // showsheetbar: false, // 是否显示底部sheet页按钮
            // showstatisticBar: false, // 是否显示底部计数栏
            sheetBottomConfig: true, // sheet页下方的添加行按钮和回到顶部按钮配置
            allowEdit: false, // 是否允许前台编辑——edit
            enableAddRow: false, // 允许增加行
            enableAddCol: false, // 允许增加列
            // userInfo: false, // 右上角的用户信息展示样式
            // showRowBar: false, // 是否显示行号区域
            // showColumnBar: false, // 是否显示列号区域
            // sheetFormulaBar: false, // 是否显示公式栏
            enableAddBackTop: true,//返回头部按钮
            showtoolbarConfig: {
                sortAndFilter: true, // '排序和筛选'
                conditionalFormat: true, // '条件格式'
                dataVerification: true, // '数据验证'
                screenshot: false, // '截图'
                findAndReplace: false, // '查找替换'
                print:true, // '打印'
            }

            // functionButton: '<button id="" class="btn btn-primary" style="padding:3px 6px;font-size: 12px;margin-right: 10px;">下载</button>',  // 需要显示信息栏
        });
        this.progress.done();
    },
    setLuckySheet : (data, callback)=>{
        try{
            callback(data);
        }catch(err){
            console.error(err);
        }
    },
    docView(url,ext){
        let container = this.config.container;
        let self = this;
        try{
            this.getFileInfo(url,function(file){
                docx.renderAsync(file.content, document.getElementById(container))
                    .then(() => self.progress.done())
                    .catch(err => {
                        console.error('docx 渲染失败:', err);
                        self.progress.fail('文档解析失败，可能已损坏或不是标准 docx', url);
                    });
            });
            // 如果预览失败，则转为线上预览
            window.onerror = function (message, urls, line, column, error) {
                self.olView(url);
            }
        }catch(err){
            this.error('文件已经损坏！');
        }
    },
    pptView(url){
        let container = this.config.container;
        let self = this;
        try{
            $('#'+container).addClass(this.isWap() ? 'is-in-wap' : 'not-in-wap');
            $('#'+container).addClass("pptview");
            $("#"+container).pptxToHtml({
                pptxFileUrl: url,
                fileInputId: "",
                slideMode: false,
                keyBoardShortCut: false,
                mediaProcess: false,
                slideModeConfig: {  //on slide mode (slideMode: true)
                    first: 1,
                    nav: true, /** true,false : show or not nav buttons*/
                    // nav: true, /** true,false : show or not nav buttons*/
                    navTxtColor: "white", /** color */
                    navNextTxt:"&#8250;", //">"
                    navPrevTxt: "&#8249;", //"<"
                    showPlayPauseBtn: true,/** true,false */
                    keyBoardShortCut: false, /** true,false */
                    showSlideNum: true, /** true,false */
                    showTotalSlideNum: true, /** true,false */
                    autoSlide: 2, /** false or seconds (the pause time between slides) , F8 to active(keyBoardShortCut: true) */
                    // randomAutoSlide: false, /** true,false ,autoSlide:true */
                    // loop: false,  /** true,false */
                    background: false, /** false or color*/
                    transition: "fade", /** transition type: "slid","fade","default","random" , to show transition efects :transitionTime > 0.5 */
                    transitionTime: 0 /** transition time in seconds */
                }
            });
            // 如果预览失败，则转为线上预览
            window.onerror = function (message, urls, line, column, error) {
                self.olView(url);
            }
        }catch(err){
            this.error('文件已经损坏！');
        }

    },
    xlsView(url,ext){
        let self=this;
        try{
            $('#'+this.config.container).css({height:'100vh'});
            this.getFileInfo(url,function(file){
                // 1.xlsx，直接luckyexcel读取
                if(ext == 'xlsx') {
                    self.setLuckySheet(file.content, function(content){
                        LuckyExcel.transformExcelToLucky(content, function(exportJson, luckysheetfile){
                            self.setLuckySheet(exportJson, function(exportJson){
                                self.loadLuckySheet(exportJson);
                            });
                        });
                    });

                    return;
                }
                var sheet = utils.getLuckySheet();
                // 2.csv以字符串方式读取，区分编码
                if(file.ext == 'csv'){
                    var data = new Uint8Array(file.content);
                    var code = utils.isUTF8(data) ? 'utf-8' : 'gbk';
                    var str = new TextDecoder(code).decode(data);
                    var wb = XLSX.read(str, { type: "string" });
                }
                // 3.xls通过SheetJs获取数据
                if(_.isUndefined(wb)) {
                    var wb = XLSX.read(file.content, {type: 'buffer', cellStyles: true}); // XLSX/XLS
                }
                var sheets = [];

                for(var i in wb.SheetNames) {
                    var name = wb.SheetNames[i];
                    var _sheet = JSON.parse(JSON.stringify(sheet));
                    _sheet.name = name;
                    _sheet.index = _sheet.order = parseInt(i);
                    _sheet.data = utils.xlsToLuckySheet(wb.Sheets[name], _sheet);
                    sheets.push(_sheet);
                }
                self.setLuckySheet({sheets: sheets}, function(exportJson){
                    self.loadLuckySheet(exportJson);
                });
            })
            // 如果预览失败，则转为线上预览
            window.onerror = function (message, urls, line, column, error) {
                self.olView(url);
            }
        }catch(err){
            this.error('文件已经损坏！');
        }

    },
    /**
     * PDF 预览：pdf.js + 懒加载。
     *
     * pdf.js 的 disableAutoFetch 默认是 false，拿到首页后仍会在后台把整个文件预取完，
     * 几百 MB 的扫描版电子书因此要等全量下载才有反应（页码一直显示 0/0）。
     *
     * 让它真正只取可见页，三处缺一不可：
     * 1. viewer.js 里 disableAutoFetch 改默认开 —— 不再预取后续页面；
     * 2. viewer.js 里 disableStream 改默认开 —— 只有关掉流式读取，pdf.js 才会在确认
     *    支持分段后中断那条整包 GET（见 pdf.js 的 "Streaming is disabled." 分支）；
     *    以上两个都要同时改 AppOptions schema 和 BasePreferences 的 #defaults，
     *    后者会覆盖前者；走 URL hash 传参没用，_parseHashParams 被 pdfBugEnabled 挡着。
     * 3. 下面的 probeRangeSupport + build/pdf.js 里的 jprange 开关 —— 跨域直链读不到
     *    Accept-Ranges，得由我们探测后告诉 pdf.js。
     *
     * 探测不通过时 pdf.js 退回整包下载，此时靠下面的进度桥接显示百分比和网速。
     */
    pdfView(url){
        const self = this;
        const rawUrl = decodeURIComponent(url);
        this.probeRangeSupport(rawUrl).then(function (rangeOk) {
            const src = self.config.staticPath + "/pdfjs/web/viewer.html?file=" + url
                + (rangeOk ? "&jprange=1" : "");
            self.setBody("<iframe id='jp-pdf-frame' src='" + src + "' style='width:100%;height:100vh;border:none;display:block'></iframe>");
            self.bindPdfProgress(document.getElementById('jp-pdf-frame'), rawUrl);
        });
    },
    /**
     * 探测直链是否真的支持分段下载。
     *
     * 不能直接让 pdf.js 自己判断：Accept-Ranges 不在 CORS 安全响应头白名单里，
     * 网盘直链基本都不会 expose 它，pdf.js 读到 null 就退回整包下载。
     * 也不能无脑假设支持 —— pdf.js 把 200 当成合法的分段响应（validateResponseStatus），
     * 服务端若忽略 Range 直接返回整个文件，会被当成第一个分片，数据就错了。
     * 所以这里自己发一个 1 字节的 Range 请求，只认 206。
     */
    probeRangeSupport(url){
        const controller = new AbortController();
        return fetch(url, {
            method: 'GET',
            headers: {Range: 'bytes=0-0'},
            referrerPolicy: 'no-referrer',
            signal: controller.signal
        }).then(function (response) {
            const ok = response.status === 206;
            // 万一服务端无视 Range 吐整个文件，这里立刻掐掉，别白下一遍
            try { controller.abort(); } catch (e) { /* ignore */ }
            return ok;
        }).catch(function (err) {
            // 预检被拒 / 网络异常：按不支持处理，退回整包下载（有进度条兜底）
            console.warn('Range 探测失败，按整包下载处理:', err && err.message);
            return false;
        });
    },
    /**
     * 把 pdf.js 内部的下载进度接到外层浮层上，并在首页可见时收起浮层。
     * viewer.html 与本页同源，可以直接访问 contentWindow。
     */
    bindPdfProgress(frame, rawUrl){
        const self = this;
        const deadline = Date.now() + 60000;
        (function waitForApp(){
            if (self.progress.finished) return;
            let app = null;
            try {
                app = frame.contentWindow && frame.contentWindow.PDFViewerApplication;
            } catch (e) {
                // 理论上同源不会走到这里，真拿不到就交给下面的超时兜底
            }
            if (!app || !app.initializedPromise) {
                if (Date.now() > deadline) {
                    self.progress.done();
                    return;
                }
                setTimeout(waitForApp, 60);
                return;
            }
            app.initializedPromise.then(function(){
                app.eventBus.on('pagesinit', function(){ self.progress.done(); });
                app.eventBus.on('pagerendered', function(){ self.progress.done(); });
                app.eventBus.on('documenterror', function(evt){
                    self.progress.fail((evt && evt.message) || 'PDF 解析失败', rawUrl);
                });
                (function watch(){
                    if (self.progress.finished) return;
                    // 小文件/命中缓存时首页可能在挂监听之前就渲染完了，这里补一次判断
                    if (app.pdfDocument) { self.progress.done(); return; }
                    const task = app.pdfLoadingTask;
                    if (task && !task.jpHooked) {
                        task.jpHooked = true;
                        const inner = task.onProgress;
                        task.onProgress = function(data){
                            if (data) self.progress.update(data.loaded, data.total);
                            if (typeof inner === 'function') inner.call(task, data);
                        };
                    }
                    setTimeout(watch, 200);
                })();
            });
        })();
    },
    /**
     * ZIP 预览：zip.js + HTTP Range。
     *
     * zip 的中央目录在文件末尾，只要直链支持 Range，读最后几十 KB 就能拿到完整条目列表，
     * 几百 MB 的压缩包也能立刻出列表；点开某个条目时才按字节区间取那一段解压。
     * 直链不支持 Range（或没放开 CORS 头）时退回整包下载，此时浮层会显示百分比和网速。
     */
    zipView(url){
        const self = this;
        this.archiveShell();
        this.openZip(url)
            .then(function (entries) {
                self.archiveMount(self.normalizeZipEntries(entries));
            })
            .catch(function (err) {
                console.error('zip 解析失败:', err);
                self.progress.fail('压缩包解析失败：' + ((err && err.message) || err), url);
            });
    },
    /** zip / rar 归一成同一份条目结构后共用这套外壳和列表 */
    archiveShell(){
        this.setBody(
            "<div class='archive-preview'>" +
            "  <div class='archive-head'>" +
            "    <div class='archive-title' id='archive-title'></div>" +
            "    <div class='archive-crumb' id='archive-crumb'></div>" +
            "  </div>" +
            "  <div class='archive-list' id='archive-list'></div>" +
            "</div>"
        );
    },
    archiveMount(entries){
        this.archiveEntries = entries;
        document.getElementById('archive-title').textContent =
            this.config.name + '（' + entries.filter(e => !e.dir).length + ' 个文件）';
        this.archiveBindEvents();
        this.archiveRender('');
        this.progress.done();
    },
    openZip(url){
        const self = this;
        zip.configure({useWebWorkers: true});
        return new zip.ZipReader(new zip.HttpRangeReader(url)).getEntries()
            .catch(function (rangeErr) {
                console.warn('zip Range 读取不可用，退回整包下载:', rangeErr);
                return self.fetchWithProgress(url).then(function (res) {
                    return new zip.ZipReader(new zip.BlobReader(new Blob([res.buffer]))).getEntries();
                });
            });
    },
    normalizeZipEntries(entries){
        return entries.map(function (entry) {
            // 没置 UTF-8 标志位时 zip.js 按 zip 规范退回 CP437，中文名会变乱码。
            // 实际情况是：macOS/Info-ZIP 存的是 UTF-8 但不置位，Windows 简体中文环境存的是 GBK，
            // 所以一律拿原始字节按内容重新判定。
            let path = entry.filename;
            if (entry.rawFilename) {
                try {
                    path = new TextDecoder(utils.isUTF8(entry.rawFilename) ? 'utf-8' : 'gbk')
                        .decode(entry.rawFilename);
                } catch (e) { /* 解不出就保留 zip.js 的结果 */ }
            }
            path = path.replace(/\\/g, '/');
            return {
                path: path,
                dir: !!entry.directory || /\/$/.test(path),
                size: entry.uncompressedSize || 0,
                csize: entry.compressedSize || 0,
                date: entry.lastModDate,
                encrypted: !!entry.encrypted,
                extract: function (wantBlob, options) {
                    return entry.getData(wantBlob ? new zip.BlobWriter() : new zip.Uint8ArrayWriter(), options);
                }
            };
        });
    },
    /**
     * RAR 预览：node-unrar-js（unrar 的 WASM 版）。
     *
     * 和 zip 不同，rar 没法只读目录区 —— unrar 要把整个包读进 WASM 内存才能解析，
     * 所以必须整包下载，也因此卡了 RAR_MAX_BYTES 上限，超过就直接劝下载，
     * 免得为了看一眼目录先吃掉几百 MB 流量和内存。
     */
    rarView(url){
        const self = this;
        this.archiveShell();
        this.loadUnrar()
            .then(function (wasmBinary) {
                return self.fetchWithProgress(url, {maxBytes: RAR_MAX_BYTES}).then(function (res) {
                    return self.openRar(wasmBinary, res.buffer);
                });
            })
            .then(function (entries) {
                self.archiveMount(entries);
            })
            .catch(function (err) {
                console.error('rar 解析失败:', err);
                self.progress.fail((err && err.message) || String(err), url);
            });
    },
    /** 加载 unrar 的 JS 和 wasm，同一个页面只加载一次 */
    loadUnrar(){
        const self = this;
        if (this.unrarWasm) return Promise.resolve(this.unrarWasm);
        const base = this.config.staticPath + '/unrarjs/';
        return new Promise(function (resolve, reject) {
            dynamicLoadJs(base + 'unrar.bundle.js', function () {
                if (typeof unrarjs === 'undefined') {
                    reject(new Error('unrar 组件加载失败'));
                    return;
                }
                // wasm 自己取成 ArrayBuffer 通过 wasmBinary 传进去，省得 emscripten 猜路径
                fetch(base + 'unrar.wasm')
                    .then(function (res) {
                        if (!res.ok) throw new Error('unrar.wasm HTTP ' + res.status);
                        return res.arrayBuffer();
                    })
                    .then(function (buffer) {
                        self.unrarWasm = buffer;
                        resolve(buffer);
                    }, reject);
            });
        });
    },
    openRar(wasmBinary, buffer){
        const self = this;
        const build = function (password) {
            return unrarjs.createExtractorFromData({wasmBinary: wasmBinary, data: buffer, password: password})
                .then(function (extractor) {
                    const list = extractor.getFileList();
                    return {extractor: extractor, headers: Array.from(list.fileHeaders), password: password};
                });
        };
        return build('').catch(function (err) {
            // 整个包的文件头被加密时，不给密码连目录都列不出来，这里补一次询问
            const password = window.prompt('该 RAR 的文件列表已加密，请输入解压密码：');
            if (password === null) throw err;
            return build(password);
        }).then(function (opened) {
            return self.normalizeRarEntries(opened);
        });
    },
    normalizeRarEntries(opened){
        return opened.headers.map(function (header) {
            const flags = header.flags || {};
            return {
                path: String(header.name || '').replace(/\\/g, '/'),
                dir: !!flags.directory,
                size: header.unpSize || 0,
                csize: header.packSize || 0,
                date: header.time ? new Date(header.time) : null,
                // 包头已经给过密码的话，单个文件就不用再问一次
                encrypted: !!flags.encrypted && !opened.password,
                extract: function (wantBlob, options) {
                    const result = opened.extractor.extract({
                        files: [header.name],
                        password: options.password || opened.password || ''
                    });
                    const file = Array.from(result.files)[0];
                    if (!file || !file.extraction) throw new Error('解压结果为空，密码可能不正确');
                    return wantBlob ? new Blob([file.extraction]) : file.extraction;
                }
            };
        });
    },
    /** 渲染 prefix 这一层的目录内容（zip 里没有真正的树，按路径前缀切分） */
    archiveRender(prefix){
        this.archivePrefix = prefix;
        const dirs = {};
        const files = [];
        this.archiveEntries.forEach(function (item) {
            if (item.path.indexOf(prefix) !== 0 || item.path === prefix) return;
            const rest = item.path.slice(prefix.length).replace(/\/$/, '');
            if (!rest) return;
            const slash = rest.indexOf('/');
            if (slash >= 0) {
                // 只有目录条目的包也要能展开，所以子目录从路径里推出来
                const name = rest.slice(0, slash);
                const stat = dirs[name] || (dirs[name] = {count: 0, size: 0});
                if (!item.dir) { stat.count++; stat.size += item.size; }
            } else if (item.dir) {
                dirs[rest] = dirs[rest] || {count: 0, size: 0};
            } else {
                files.push(item);
            }
        });

        const crumbs = ['<a href="javascript:;" data-ar-dir="">根目录</a>'];
        let walked = '';
        prefix.split('/').filter(Boolean).forEach(function (seg) {
            walked += seg + '/';
            crumbs.push('<a href="javascript:;" data-ar-dir="' + utils.escapeHtml(walked) + '">' + utils.escapeHtml(seg) + '</a>');
        });
        document.getElementById('archive-crumb').innerHTML = crumbs.join('<span class="archive-sep">/</span>');

        const rows = [];
        if (prefix) {
            const up = prefix.replace(/[^/]+\/$/, '');
            rows.push('<tr class="archive-row"><td colspan="4"><a href="javascript:;" data-ar-dir="' + utils.escapeHtml(up) + '">📁 ..</a></td></tr>');
        }
        Object.keys(dirs).sort().forEach(function (name) {
            rows.push(
                '<tr class="archive-row"><td><a href="javascript:;" data-ar-dir="' + utils.escapeHtml(prefix + name + '/') + '">📁 ' + utils.escapeHtml(name) + '</a></td>' +
                '<td>' + (dirs[name].count ? dirs[name].count + ' 项' : '') + '</td><td></td><td></td></tr>'
            );
        });
        const self = this;
        files.sort((a, b) => a.path.localeCompare(b.path)).forEach(function (item) {
            const idx = self.archiveEntries.indexOf(item);
            const name = item.path.split('/').pop();
            const actions = self.archiveCanPreview(name)
                ? '<a href="javascript:;" data-ar-view="' + idx + '">预览</a> <a href="javascript:;" data-ar-save="' + idx + '">下载</a>'
                : '<a href="javascript:;" data-ar-save="' + idx + '">下载</a>';
            rows.push(
                '<tr class="archive-row"><td>' + (item.encrypted ? '🔒 ' : '📄 ') + utils.escapeHtml(name) + '</td>' +
                '<td>' + utils.formatBytes(item.size) + '</td>' +
                '<td>' + (item.date ? utils.formatDate(item.date) : '') + '</td>' +
                '<td class="archive-actions">' + actions + '</td></tr>'
            );
        });
        if (!rows.length) {
            rows.push('<tr><td colspan="4" class="archive-empty">空目录</td></tr>');
        }
        document.getElementById('archive-list').innerHTML =
            '<table class="archive-table"><thead><tr><th>名称</th><th>大小</th><th>修改时间</th><th></th></tr></thead><tbody>'
            + rows.join('') + '</tbody></table>';
    },
    archiveBindEvents(){
        const self = this;
        // 列表整体重绘，用事件委托绑一次就够
        document.getElementById('archive-list').addEventListener('click', function (evt) {
            const target = evt.target.closest('a[data-ar-dir], a[data-ar-view], a[data-ar-save]');
            if (!target) return;
            if (target.hasAttribute('data-ar-dir')) {
                self.archiveRender(target.getAttribute('data-ar-dir'));
            } else if (target.hasAttribute('data-ar-view')) {
                self.archivePreviewEntry(self.archiveEntries[+target.getAttribute('data-ar-view')]);
            } else {
                self.archiveSaveEntry(self.archiveEntries[+target.getAttribute('data-ar-save')]);
            }
        });
        document.getElementById('archive-crumb').addEventListener('click', function (evt) {
            const target = evt.target.closest('a[data-ar-dir]');
            if (target) self.archiveRender(target.getAttribute('data-ar-dir'));
        });
    },
    archiveCanPreview(name){
        const ext = name.split('.').pop().toLowerCase();
        return ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'ini', 'conf', 'log', 'csv',
            'js', 'ts', 'css', 'html', 'htm', 'java', 'py', 'go', 'c', 'h', 'cpp', 'sh', 'sql', 'properties',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
    },
    /** 解压单个条目：只取该条目对应的字节区间，不用整包下载 */
    /** @param wantBlob true 要 Blob（下载/图片），false 要 Uint8Array（文本） */
    archiveExtract(item, wantBlob){
        const self = this;
        const options = {};
        if (item.encrypted) {
            const password = window.prompt('「' + item.path.split('/').pop() + '」已加密，请输入解压密码：');
            if (password === null) return Promise.reject(new Error('已取消'));
            options.password = password;
        }
        this.progress.start(item.path.split('/').pop());
        options.onprogress = function (loaded, total) {
            self.progress.update(loaded, total || item.size);
        };
        // 用 Promise 包一层：rar 的解压是同步的，抛错也要变成 reject
        return Promise.resolve()
            .then(function () { return item.extract(wantBlob, options); })
            .then(function (data) {
                self.progress.done();
                return data;
            }, function (err) {
                self.progress.fail('解压失败：' + ((err && err.message) || err));
                throw err;
            });
    },
    archivePreviewEntry(item){
        const self = this;
        const name = item.path.split('/').pop();
        const ext = name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
        this.archiveExtract(item, isImage).then(function (data) {
            if (isImage) {
                const objectUrl = URL.createObjectURL(data);
                self.archiveShowModal(name, '<img src="' + objectUrl + '" alt="' + utils.escapeHtml(name) + '">',
                    function () { URL.revokeObjectURL(objectUrl); });
            } else {
                // 包里的文本同样可能是 GBK，复用直链预览那套编码识别
                const text = utils.decodeText(data, null);
                self.archiveShowModal(name, '<pre>' + utils.escapeHtml(text) + '</pre>');
            }
        }).catch(function () { /* 错误已在 archiveExtract 里提示 */ });
    },
    archiveSaveEntry(item){
        const name = item.path.split('/').pop();
        this.archiveExtract(item, true).then(function (blob) {
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 60000);
        }).catch(function () { /* 错误已在 archiveExtract 里提示 */ });
    },
    archiveShowModal(title, bodyHtml, onClose){
        const old = document.getElementById('archive-modal');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'archive-modal';
        modal.className = 'archive-modal';
        modal.innerHTML =
            '<div class="archive-modal-box">' +
            '  <div class="archive-modal-head"><span>' + utils.escapeHtml(title) + '</span><a href="javascript:;" class="archive-modal-close">关闭</a></div>' +
            '  <div class="archive-modal-body">' + bodyHtml + '</div>' +
            '</div>';
        modal.addEventListener('click', function (evt) {
            if (evt.target === modal || evt.target.classList.contains('archive-modal-close')) {
                modal.remove();
                if (onClose) onClose();
            }
        });
        document.body.appendChild(modal);
    },
    imgView(url){
        const self = this;
        $('#'+this.config.container).html('<div style="height:100vh"><img id="image" style="display:none" src="'+url+'" alt="Picture"></div>');
        var image = $('#image');
        // viewer 的 viewed 事件不总会触发（缓存命中等），以图片自身的 load 为准收浮层
        image.on('load', function () { self.progress.done(); });
        image.on('error', function () {
            self.progress.fail('图片加载失败，直链可能已失效', url);
        });
        if (image[0] && image[0].complete && image[0].naturalWidth) {
            this.progress.done();
        }
        image.viewer({
            inline: true,
            button: false,
            viewed: function() {
                self.progress.done();
                // viewer.js 把实例挂在元素的 viewer 属性上（原来这里引用的是个不存在的全局变量）
                if (this.viewer) this.viewer.zoomTo(1);
            }
        });
    },
    /**
     * 音视频由浏览器自己按 Range 边下边播，拿不到整包字节进度，
     * 因此浮层只等到「首帧可播」就收起，之后的缓冲交给播放器自己的进度条。
     */
    bindMediaReady(media, url){
        const self = this;
        if (!media) { this.progress.done(); return; }
        const finish = function () { self.progress.done(); };
        media.addEventListener('loadedmetadata', finish, {once: true});
        media.addEventListener('canplay', finish, {once: true});
        media.addEventListener('error', function () {
            self.progress.fail('媒体加载失败：浏览器不支持该编码，或直链已失效', url);
        });
        // 兜底：部分容器格式（mkv/rmvb 等）不会抛事件，超时后把界面交还给播放器
        setTimeout(finish, 15000);
    },
    videoView(url) {
        let container = this.config.container;

        $('#'+this.config.container).css({height:'100vh', width: '100%',display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333'});

        let player = new DPlayer({
            container: document.getElementById(container),
            autoplay: false,
            theme: '#FADFA3',
            video: {
                url: url,
                type: 'auto'
            },
            pluginOptions: {
                speed: {
                    enabled: true, // 启用倍速
                    speedList: [0.5, 1.0, 1.5, 2.0] // 可选倍速
                },
                fullscreen: {
                    enabled: true // 启用全屏
                }
            }
        });
        this.bindMediaReady(player.video, url);
    },
    audioView(url){
        const container = this.config.container;
        this.fallbackToNativeAudio(url, container);
        this.bindMediaReady(document.getElementById('jp-audio'), url);
    },
    
    // 降级到原生 audio 标签播放
    fallbackToNativeAudio(url, container) {
        const audioHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 500px; width: 90%;">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px; text-align: center;">${this.config.name}</h3>
                    <audio id="jp-audio" controls preload="metadata" style="width: 100%; outline: none;">
                        <source src="${url}" type="audio/mpeg">
                        <source src="${url}" type="audio/ogg">
                        <source src="${url}" type="audio/wav">
                        您的浏览器不支持音频播放
                    </audio>
                </div>
            </div>
        `;
        $('#' + container).html(audioHtml);
    },
    sourceCodeView(url, ext) {
        // 语言映射表（Prism.js 语言名称）
        const langMap = {
            'js': 'javascript',
            'mjs': 'javascript',
            'ts': 'typescript',
            'tsx': 'tsx',
            'jsx': 'jsx',
            'py': 'python',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'html': 'markup',
            'htm': 'markup',
            'xml': 'markup',
            'svg': 'markup',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'yml': 'yaml',
            'yaml': 'yaml',
            'md': 'markdown',
            'markdown': 'markdown',
            'sh': 'bash',
            'bash': 'bash',
            'sql': 'sql',
            'go': 'go',
            'rs': 'rust',
            'rust': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'swift': 'swift',
            'kt': 'kotlin',
            'r': 'r',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'vue': 'markup',
            'bat': 'batch',
            'cmd': 'batch',
            'ps1': 'powershell',
            'zsh': 'bash',
            'fish': 'bash',
            'env': 'bash',
            'conf': 'ini',
            'toml': 'toml',
            'ini': 'ini',
            'properties': 'properties',
            'log': 'log',
            'dockerfile': 'docker',
            'makefile': 'makefile',
            'gradle': 'gradle'
        };
        const mapped = langMap[ext] || ext;
        const self = this;
        // Prism 体积不小，只有源码类文件用得上，改成到这一步才加载
        dynamicLoadCss(this.config.staticPath + "/prism/prism.css", function () {
            dynamicLoadJs(self.config.staticPath + "/prism/prism.js", function () {
                // Prism 不认识的语言退回 none，避免套用错误的语法规则
                const language = (typeof Prism !== 'undefined' && !Prism.languages[mapped]) ? 'none' : mapped;

                // 创建代码预览容器（使用 Prism.js 类名）
                self.setBody(`
            <div class='source-code-preview'>
                <pre class='line-numbers language-${language}'><code id='file-content' class='language-${language}'></code></pre>
            </div>
        `);

                self.fetchText(url)
                    .then(code => {
                        const codeElement = document.getElementById('file-content');
                        codeElement.textContent = code;
                        self.progress.done();

                        // 使用 Prism.js 进行高亮
                        if (typeof Prism !== 'undefined') {
                            // 确保在 DOM 更新后执行高亮
                            setTimeout(() => Prism.highlightElement(codeElement), 50);
                        }
                    })
                    .catch(error => {
                        console.error('获取文件内容时出错:', error);
                        self.progress.fail(utils.describeFetchError(error), url);
                    });
            });
        });
    },

    markdownView(url) {
        this.setBody("<div class='markdown-preview' style='padding: 20px; max-width: 800px; margin: auto; background-color: #f5f5f5; border-radius: 8px;'><div id='markdown-content'></div></div>");
        this.fetchText(url)
            .then(markdown => {
                dynamicLoadJs(this.config.staticPath + "/marked/marked.min.js", () => {
                    if (typeof marked.parse === 'function') {
                        document.getElementById('markdown-content').innerHTML = marked.parse(markdown);
                        this.progress.done();
                    } else {
                        console.error('Marked.js 加载失败或未正确初始化。');
                        this.progress.fail('无法渲染 Markdown 内容', url);
                    }
                });
            })
            .catch(error => {
                console.error('获取Markdown内容时出错:', error);
                this.progress.fail(utils.describeFetchError(error), url);
            });
    },

    isWap(){
        return $(window.document).width() < 768;
    },
    error(msg){
        // 浮层盖在最上层，错误信息要显示在浮层里，否则会被整个遮住
        this.progress.fail(msg, this.config.url);
    },
    isMobile() {
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileRegex.test(navigator.userAgent);
    }
}
$(function(){
    var isWap = function(){
        return $(window.document).width() < 768;
    }

    let container = jPreview.config.container;
    let isTrue = false;
    // 文件加载完成，重置页面尺寸样式
    utils.functionHook($,'attr',false,function(res,args){
        var id = args[0].id || '';
        if(id != 'all_slides_warpper' || isTrue == true) {
            return res;
        }  // convertToHtml结束
        isTrue =true;
        // 隐藏<#>
        $("#all_slides_warpper .slide .block.v-mid.content .text-block").each(function(){
            if ($(this).text() == '‹#›') $(this).addClass('hidden');
        });
        $("#"+container+" .slide").wrap('<div class="slide-box"></div>');
        $('#all_slides_warpper').height('auto');
        // 4.初始化主区域子节点尺寸
        utils.initPageSize(pageRatio(false));
        // 幻灯片已经排好版，收起载入浮层
        jPreview.progress.done();
    });
    // 页面尺寸随窗口变化
    $(window).resize(function(){
        var wap = isWap();
        // 这里可以改成阶段性变化，而不是实时变
        var ratio = pageRatio(wap);
        utils.changePageSize(ratio, 'all_slides_warpper');
    });

    var pageRatio = function(wap){
        // 左侧栏
        dfWidth = $("#all_slides_warpper .slide").first().width();
        dfHeight = $("#all_slides_warpper .slide").first().height();
        if( arguments[1] !== undefined) {
            return 225 / dfWidth;
        }
        // 移动端，固定以宽为基准
        if(wap) {
            return $("#"+jPreview.config.container).width() / dfWidth;
        }

        var pgWidth = $("#all_slides_warpper").width();
        var pgHeight = $("#all_slides_warpper").height();

        // 当前宽高比>原始宽高比，说明宽度较大，以高度为基准，否则相反
        if((pgWidth / pgHeight) > (dfWidth / dfHeight)) {
            return pgHeight / dfHeight;
        }
        return pgWidth / dfWidth;
    }

});

function dynamicLoadJs(url, callback) {
    var head = document.getElementsByTagName('head')[0]
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = url
    if (typeof (callback) === 'function') {
        script.onload = script.onreadystatechange = function () {
            if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
                callback()
                script.onload = script.onreadystatechange = null
            }
        }
    }
    head.appendChild(script)
}

// 按需加载样式表，避免 preview.html 为了一种文件类型把所有插件的 CSS 都拉一遍
function dynamicLoadCss(url, callback) {
    if (document.querySelector('link[data-jp-css="' + url + '"]')) {
        if (typeof callback === 'function') callback();
        return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute('data-jp-css', url);
    if (typeof callback === 'function') {
        // 样式加载失败也要继续渲染内容，不能把预览卡死在这里
        link.onload = link.onerror = function () {
            link.onload = link.onerror = null;
            callback();
        };
    }
    document.getElementsByTagName('head')[0].appendChild(link);
}

// 依次加载多个样式表，全部就绪后回调
function dynamicLoadCssAll(urls, callback) {
    var remaining = urls.length;
    if (!remaining) return callback();
    urls.forEach(function (url) {
        dynamicLoadCss(url, function () {
            if (--remaining === 0) callback();
        });
    });
}

// 工具函数
var utils = {
    formatBytes: function (bytes) {
        if (!bytes || bytes < 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return (i === 0 ? bytes.toFixed(0) : bytes.toFixed(bytes >= 100 ? 0 : 1)) + ' ' + units[i];
    },
    escapeHtml: function (str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    formatDate: function (date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
            + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    },
    formatDuration: function (seconds) {
        if (!isFinite(seconds) || seconds < 0) return '--';
        if (seconds < 60) return Math.ceil(seconds) + ' 秒';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' 分 ' + Math.ceil(seconds % 60) + ' 秒';
        return Math.floor(seconds / 3600) + ' 时 ' + Math.floor((seconds % 3600) / 60) + ' 分';
    },
    // 直链失效 / CORS 拦截 / 网络中断的报错文案差别很大，分开提示才有排查价值
    describeFetchError: function (error) {
        var msg = (error && error.message) || String(error || '');
        if (/^HTTP /.test(msg)) return '源地址返回 ' + msg + '，直链可能已失效';
        if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return '无法获取文件：直链跨域受限或网络中断';
        return '加载失败：' + msg;
    },
    // 按 BOM / 响应头 charset / UTF-8 校验的顺序解码文本，识别不出 UTF-8 时按 GBK 处理
    decodeText: function (buffer, charset) {
        var bytes = new Uint8Array(buffer);
        if (bytes.length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) {
            return new TextDecoder('utf-8').decode(bytes.subarray(3));
        }
        if (bytes.length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE) {
            return new TextDecoder('utf-16le').decode(bytes.subarray(2));
        }
        if (bytes.length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF) {
            return new TextDecoder('utf-16be').decode(bytes.subarray(2));
        }
        // 直链常缺失 charset 或统一写死 utf-8，内容校验通过就按 UTF-8，否则用声明的编码兜底到 gbk
        var code = this.isUTF8(bytes) ? 'utf-8' : ((charset || 'gbk').toLowerCase());
        try {
            return new TextDecoder(code).decode(bytes);
        } catch (e) {
            return new TextDecoder('utf-8').decode(bytes);
        }
    },
    isUTF8: function (bytes) {
        var i = 0;
        while (i < bytes.length) {
            if ((   // ASCII
                bytes[i] == 0x09 ||
                bytes[i] == 0x0A ||
                bytes[i] == 0x0D ||
                (0x20 <= bytes[i] && bytes[i] <= 0x7E)
            )) {
                i += 1;
                continue;
            }

            if ((// non-overlong 2-byte
                (0xC2 <= bytes[i] && bytes[i] <= 0xDF) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF)
            )) {
                i += 2;
                continue;
            }

            if ((   // excluding overlongs
                bytes[i] == 0xE0 &&
                (0xA0 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            ) || (  // straight 3-byte
                ((0xE1 <= bytes[i] && bytes[i] <= 0xEC) ||
                    bytes[i] == 0xEE ||
                    bytes[i] == 0xEF) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            ) || (  // excluding surrogates
                bytes[i] == 0xED &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x9F) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF)
            )) {
                i += 3;
                continue;
            }

            if ((   // planes 1-3
                bytes[i] == 0xF0 &&
                (0x90 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            ) || (  // planes 4-15
                (0xF1 <= bytes[i] && bytes[i] <= 0xF3) &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0xBF) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            ) || (  // plane 16
                bytes[i] == 0xF4 &&
                (0x80 <= bytes[i + 1] && bytes[i + 1] <= 0x8F) &&
                (0x80 <= bytes[i + 2] && bytes[i + 2] <= 0xBF) &&
                (0x80 <= bytes[i + 3] && bytes[i + 3] <= 0xBF)
            )) {
                i += 4;
                continue;
            }
            return false;
        }
        return true;
    },

    // 读取cell的数字或字母
    getCellNum: function(str){
        var n = '';
        var isNum = !arguments[1];
        for(var i in str) {
            var val = parseInt(str[i]);
            var _isNaN = isNum ? !isNaN(val) : isNaN(val);
            if(_isNaN) n += str[i];
        }
        return isNum ? parseInt(n) : n;
    },
    // 表头字母转数字
    stringToNum: function(str){
        str=str.toLowerCase().split("");
        var al = str.length;
        var getCharNumber = function(charx){
            return charx.charCodeAt() -96;
        };
        var numout = 0;
        var charnum = 0;
        for(var i = 0; i < al; i++){
            charnum = getCharNumber(str[i]);
            numout += charnum * Math.pow(26, al-i-1);
        };
        return numout;
    },
    // 数字转字母
    numToString: function(numm){
        var stringArray = [];
        stringArray.length = 0;
        var numToStringAction = function(nnum){
            var num = nnum - 1;
            var a = parseInt(num / 26);
            var b = num % 26;
            stringArray.push(String.fromCharCode(64 + parseInt(b+1)));
            if(a>0){
                numToStringAction(a);
            }
        }
        numToStringAction(numm);
        return stringArray.reverse().join("");
    },
    // sheetjs.data转luckysheet.data
    xlsToLuckySheet: function(sheet, _sheet){
        var arr = (_.get(sheet, '!ref') || ':').split(':');
        var cols = this.getCellNum(arr[1], true);
        cols = this.stringToNum(cols);
        cols = cols > 26 ? cols : 26;   // 列，字母，不足的填充
        var rows = this.getCellNum(arr[1]);
        rows = rows > 84 ? rows : 84;   // 行，数字

        // 表格样式
        var _cols = _.get(sheet, '!cols') || {};
        var _rows = _.get(sheet, '!rows') || {};
        var _merges = _.get(sheet, '!merges') || {};

        var obj = [];
        var self = this;
        for(var i=1; i<=rows; i++) {
            var row = [];
            for(var j=1; j<=cols; j++) {
                var key = self.numToString(j) + i;
                var cell = null;
                if(sheet[key]) {
                    // https://mengshukeji.github.io/LuckysheetDocs/zh/guide/cell.html#基本单元格
                    var value = sheet[key].v || '';
                    var style = sheet[key].s || {};
                    var bgColor = _.get(style, 'fgColor.rgb');  // 前景色
                    // var ftColor = _.get(style, 'ftColor.rgb');
                    cell = {
                        m: value,   // 显示值
                        v: value,   // 原始值
                        ct: {fa: sheet[key].z || 'General', t: sheet[key].t || 'g'},
                        // bg: bgColor ? '#'+bgColor : '',
                        // bl: _.get(style, 'patternType') == 'bold' ? 1 : 0,
                        tb: 2,   // 0:截断;1:溢出;2:换行
                    }
                    if (bgColor) cell.bg = '#'+bgColor;
                }
                row.push(cell);
                _sheet.config.columnlen[j-1] = _cols[j-1] ? _cols[j-1].wpx : 73;    // 默认列宽73px
            }
            obj.push(row)
            _sheet.config.rowlen[i-1] = _rows[i-1] ? _rows[i-1].hpt * 4 / 3 : 19;   // 本来有参数hpx，但其值和hpt一样；默认值行高19px
        }
        // 合并单元格
        // https://mengshukeji.github.io/LuckysheetDocs/zh/guide/sheet.html#初始化配置
        _.each(_merges, function(opt){
            var r = opt.s.r;    // sheet[!merges] = [{e:{r:,c:},s:{r:,c:}}]
            var c = opt.s.c;    // s:start,e:end
            _sheet.config.merge[r+'_'+c] = {
                r: r,
                c: c,
                rs: opt.e.r - r + 1,
                cs: opt.e.c - c + 1,
            };
        });
        return obj;
    },

    // 单个sheet初始配置
    getLuckySheet: function(){
        return {
            "name": "Sheet1",
            "color": "",
            "status": 1,
            "order": 0,
            "data": [   // data直接替换，这里就不写null填充了
                [null],
                [null],
            ],
            "config": {
                rowlen: {},     // 表格行高
                columnlen: {},  // 表格行宽
                merge: {},      // 合并单元格
            },
            "index": 0,
            // "jfgird_select_save": [],
            "luckysheet_select_save": [],
            "visibledatarow": [],
            "visibledatacolumn": [],
            // "ch_width": 4560,
            // "rh_height": 1760,
            "luckysheet_selection_range": [],
            "zoomRatio": 1,
            "celldata": [],
            // "load": "1",
            "scrollLeft": 0,
            "scrollTop": 0
        };
    },
    functionHook: function(target,method,beforeFunc,afterFunc){
        var context 	= target || window;
        var _theMethod 	= context[method];
        if(!context || !_theMethod) return console.error('method error!',method);

        context[method] = function(){
            var args = arguments;
            if(beforeFunc){
                var newArgs = beforeFunc.apply(this,args);
                if( newArgs === false ) return;
                args = newArgs === undefined ? args : newArgs; 	//没有返回值则使用结果;
            }
            var result = _theMethod.apply(this,args);
            if( afterFunc ){
                var newResult = afterFunc.apply(this,[result,args]);
                result = newResult === undefined ? result : newResult;//没有返回值则使用结果
            }
            return result;
        }
    },

    // 初始化主页面尺寸
    initPageSize: function(ratio){
        var divId = arguments[1] === undefined ? 'all_slides_warpper' : 'left_slides_bar';
        return this.changePageSize(ratio, divId);
    },
    // 变更主页面尺寸
    changePageSize: function(ratio, divId){
        $('#'+divId+' .slide').css({'-webkit-transform': 'scale('+ratio+')'});
        var width = $('#'+divId+' .slide').width() * ratio + 'px';
        var height = $('#'+divId+' .slide').height() * ratio + 'px';    // 使用scale后获取到的是原始尺寸，因此需要*ratio
        $('#'+divId+' .slide-box').css({'width': width, 'height': height});
    },

    // 前后翻页
    nextSlide: function(type){
        if(!$('#left_slides_bar').length) return;
        var index = parseInt($('.slide-page-toolbar .page-cur-num').text());
        var total = parseInt($('.slide-page-toolbar .page-total-num').text());
        if((index == 1 && type == 'sub') || (index == total && type == 'add')) return;
        var page = type == 'sub' ? index - 1 : index + 1;
        this.gotoSlide(page);
    },
    // 页码变更
    gotoSlide: function(page){
        // 0.设置页码显示
        $('.slide-page-toolbar .page-cur-num').html(page);
        // 1.主区域显示
        $('#all_slides_warpper .slide-box').hide();
        $('#all_slides_warpper .slide-box').eq(page - 1).show();
        // 2.左右翻页图标显示
        this.setLtRtIcon();
        // 3.左侧选中样式变更
        $('#left_slides_bar .slide-box').removeClass('total-page-point');
        $('#left_slides_bar .slide-box').eq(page - 1).addClass('total-page-point');
        // 左侧选中项滚动到当前区域，滚轮停止后计算
        setTimeout(function(){
            if (!$(".total-page-point").length) return;
            var top = $(".total-page-point").offset().top;
            var height = $(".total-page-point").height();
            // 选中区在可视范围内时不滚动。margin+padding=8+10
            if(top >= 18 && (top + height - 8) < $("#left_slides_bar").height()) {
                return false;
            }
            // 滚动高度为选中区前所有兄弟元素的(高+mb)之和，理论上应该再+18
            var prevTop = (height + 10) * (page - 1);
            $("#left_slides_bar").scrollTop(prevTop + 10);
        }, 200);
    },
    // 左右翻页图标显示和隐藏
    setLtRtIcon: function(){
        var index = parseInt($('.slide-page-toolbar .page-cur-num').text());
        var total = parseInt($('.slide-page-toolbar .page-total-num').text());
        var funcLt = index == 1 ? 'hide' : 'show';
        var funcRt = index == total ? 'hide' : 'show';
        $('.slide-left-icon.btn')[funcLt]();
        $('.slide-right-icon.btn')[funcRt]();
    }
}
