let jPreview={
    config:{
        container:"", // 容器id
        staticPath:"./static", // 静态资源路径
        url:"", // 预览资源路径
        ext:"",  // 资源后缀
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
        const sourceCodeExt = ['js', 'html', 'css', 'java', 'py', 'c', 'cpp', 'json', 'xml', 'sh', 'go', 'ts'];
        const markdownExt = ['md'];


        if($.inArray(ext,imgExt)>=0){
            dynamicLoadJs(static+"/viewer/viewer.js",function(){
                self.imgView(url);
            })
        }else if($.inArray(ext,pdfExt)>=0){
            self.pdfView(encodeURIComponent(decodeURIComponent(url)));
        }else if($.inArray(ext,audioExt)>=0){
            dynamicLoadJs(static+"/common/js/audio.js",function(){
                self.audioView(url);
            })

        }else if($.inArray(ext,videoExt)>=0){
            dynamicLoadJs(static+"/common/js/DPlayer.min.js",function(){
                self.videoView(url);
            })
        }else if($.inArray(ext,docExt)>=0 && this.config.priority == 1){
            dynamicLoadJs(static+"/docxjs/js/jszip.min.js",function(){
                dynamicLoadJs(static+"/docxjs/js/docx-preview.js",function(){
                    self.docView(url,ext);
                })
            })
        }else if($.inArray(ext,pptExt)>=0 && this.config.priority == 1){
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
        }else if($.inArray(ext,xlsExt)>=0 && this.config.priority == 1){
            dynamicLoadJs(static+"/luckysheet/js/plugin.js",function(){
                dynamicLoadJs(static+"/luckysheet/js/luckysheet.umd.js",function(){
                    dynamicLoadJs(static+"/luckysheet/js/luckyexcel.umd.js",function(){
                        dynamicLoadJs(static+"/luckysheet/js/xlsx.core.min.js",function(){
                            self.xlsView(url,ext);
                        })
                    })
                })
            })
        }else if($.inArray(ext,olExt)>=0){
            self.olView(url);
        }else if($.inArray(ext,txtExt)>=0){
            self.txtView(url);
        } else if (sourceCodeExt.includes(ext)) {
            this.sourceCodeView(url, ext);
        } else if (markdownExt.includes(ext)) {
            this.markdownView(url);
        } else {
            this.error('不支持的文件类型!');
        }
    },
    txtView(url){
        $("body").html("<div class='text-preview'><pre id='file-content'></pre><div>");
        // 使用fetch API获取文件内容
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.text();
            })
            .then(text => {
                // 将获取到的文本内容放入<pre>元素中
                document.getElementById('file-content').textContent = text;
            })
            .catch(error => {
                console.error('获取文件内容时出错:', error);
                document.getElementById('file-content').textContent = '无法加载文件内容，请检查URL或网络连接。';
            });
    },
    olView(url){
        url = encodeURIComponent(decodeURIComponent(url))
        $("body").css({overflow:'hidden'});
        // 如果是ppt,doc文档，直接使用office在线预览
        $("body").html("<iframe src='"+this.config.oburl+url+"' style='width:100%;height:100%;position:absolute;left:0;top:0'></iframe>");return;
    },
    // getFileInfo(url,callback){
    //     let self=this;
    //     var xhr = new XMLHttpRequest();
    //     xhr.open('GET', url);
    //     xhr.responseType = "arraybuffer";
    //     xhr.onload = function (e) {
    //         var data = xhr.response;
    //         if(!data){loading.close();loading = false;return;};
    //         var file = {name: self.config.name, ext: self.config.ext, content: data};
    //         callback(file);
    //     };
    //     xhr.send();
    //     xhr.onreadystatechange = function () {    // 请求状态
    //         if (xhr.readyState == 4) {
    //             if (xhr.status < 200 || (xhr.status > 300 && xhr.status != 304)) {
    //                 console.log('error');
    //                 $("body").html(`<div class='text-preview'>请求文件URL错误, 源地址已失效或CROS受限<div>`);
    //             }
    //         }
    //     };
    // },
    getFileInfo(url, callback) {
        let self = this;

        // 使用 fetch 请求
        fetch(url, {
            method: "GET",
            referrerPolicy: "no-referrer" // 禁止发送 Referer
        })
            .then(response => {
                // 检查响应是否为有效的 URL 和状态
                if (!response.ok) {
                    throw new Error(`HTTP 错误: ${response.status}`);
                }

                // 检查 content-disposition 是否包含文件名和扩展名
                const contentDisposition = response.headers.get('content-disposition');
                let fileName = self.config.name;
                let fileExt = self.config.ext;

                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        const filePath = filenameMatch[1];
                        fileExt = filePath.split('.').pop().toLowerCase();
                        fileName = filePath.replace(`.${fileExt}`, "");
                    }
                }

                // 获取文件内容
                return response.arrayBuffer().then(data => {
                    return {name: fileName, ext: fileExt, content: data};
                });
            })
            .then(file => {
                callback(file);
            })
            .catch(error => {
                // 错误处理
                console.error('获取文件信息时出错:', error.message);

                // 检查错误类型
                if (error.message.includes('HTTP 错误')) {
                    $("body").html(`<div class='text-preview'>请求的文件 URL 错误，状态码: ${error.message.split(':')[1]}</div>`);
                } else if (error.message.includes('CORS')) {
                    $("body").html("<div class='text-preview'>跨域请求被阻止，无法访问该文件。</div>");
                } else if (error.message.includes('Failed to fetch')) {
                    $("body").html("<div class='text-preview'>无法获取文件，URL 无效或网络问题。</div>");
                } else {
                    $("body").html("<div class='text-preview'>未知错误，请检查 URL 或网络连接。</div>");
                }
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
        try{
            this.getFileInfo(url,function(file){
                docx.renderAsync(file.content, document.getElementById(container)).then(x => console.log("docx: finished"));
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
                    if(loading){loading.close();loading = false;}
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
    pdfView(url){
        $("body").html("<iframe src='./static/pdfjs/web/viewer.html?file="+url+"' style='width:100%;height:100vh;border:none;display:block'></iframe>");
    },
    // 假设已经通过请求得到了blob对象
    previewPdf(blob) {
        const array = new Uint8Array(blob.size);
        const reader = new FileReader();

        reader.onload = function (e) {
            for (let i = 0; i < blob.size; i++) {
                array[i] = e.target.result[i];
            }
            const url = `pdfjs-dist/build/pdf.worker.entry.js`; // 确保这是正确的路径
            pdfjsLib.GlobalWorkerOptions.workerSrc = url;

            pdfjsLib.getDocument({data: array}).promise.then(pdfDoc => {
                console.log('PDF loaded');

                // 这里可以添加代码来渲染PDF
                // 例如，显示第一页
                pdfDoc.getPage(1).then(page => {
                    const scale = 1.5;
                    const viewport = page.getViewport({scale: scale});

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    page.render(renderContext);
                    // 将canvas添加到页面中以显示PDF
                    document.body.appendChild(canvas);
                });
            }).catch(function (error) {
                console.error('Error: ' + error);
            });
        };

        reader.readAsArrayBuffer(blob);
    },
    imgView(url){
        $('#'+this.config.container).html('<div style="height:100vh"><img id="image" style="display:none" src="'+url+'" alt="Picture"></div>');
        var image = $('#image');
        image.viewer({
            inline: true,
            button: false,
            viewed: function() {
                viewer.zoomTo(1);
            }
        });
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
    },
    audioView(url){
        $('#'+this.config.container).html('<div class="yAudio" id="yAudio"></div>');
        new YAudio({
            element: document.querySelector('#yAudio'),
            audio: {
                "title": this.config.name,
                "url": url
            }
        })
    },
    sourceCodeView(url, ext) {
        $("body").html("<div class='source-code-preview'><pre><code id='file-content' class='language-" + ext + " line-numbers'></code></pre></div>");
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.text();
            })
            .then(code => {
                document.getElementById('file-content').textContent = code;
                dynamicLoadJs(this.config.staticPath + "/prism/prism.js", () => {
                    Prism.plugins.toolbar.registerButton('copy-to-clipboard', function (env) {
                        const button = document.createElement('button');
                        button.textContent = '复制';

                        button.addEventListener('click', function () {
                            navigator.clipboard.writeText(env.code).then(function () {
                                button.textContent = '已复制';
                                setTimeout(function () { button.textContent = '复制'; }, 2000);
                            });
                        });

                        return button;
                    });
                    Prism.highlightAll();
                });
            })
            .catch(error => {
                console.error('获取文件内容时出错:', error);
                document.getElementById('file-content').textContent = '无法加载文件内容，请检查URL或网络连接。';
            });
    },

    markdownView(url) {
        $("body").html("<div class='markdown-preview' style='padding: 20px; max-width: 800px; margin: auto; background-color: #f5f5f5; border-radius: 8px;'><div id='markdown-content'></div></div>");
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                return response.text();
            })
            .then(markdown => {
                dynamicLoadJs(this.config.staticPath + "/marked/marked.min.js", () => {
                    if (typeof marked.parse === 'function') {
                        document.getElementById('markdown-content').innerHTML = marked.parse(markdown);
                    } else {
                        console.error('Marked.js 加载失败或未正确初始化。');
                        document.getElementById('markdown-content').textContent = '无法渲染 Markdown 内容。';
                    }
                });
            })
            .catch(error => {
                console.error('获取Markdown内容时出错:', error);
                document.getElementById('markdown-content').textContent = '无法加载文件内容，请检查URL或网络连接。';
            });
    },

    isWap(){
        return $(window.document).width() < 768;
    },
    error(msg){
        $('#'+this.config.container).css({height:'100vh',display:'flex',justifyContent: 'center',alignItems:'center',fontSize:'66px'}).text(msg);
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

// 工具函数
var utils = {
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
