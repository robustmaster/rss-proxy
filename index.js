export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const VALID_TOKEN = env.TOKEN || "mydefaulttoken"; 

    // 1. 验证接口
    if (url.pathname === "/verify") {
      const inputToken = url.searchParams.get('token');
      return new Response(JSON.stringify({ success: inputToken === VALID_TOKEN }), {
        headers: { "Content-Type": "application/json" },
        status: inputToken === VALID_TOKEN ? 200 : 401
      });
    }

    // 2. 嗅探接口
    if (url.pathname === "/find") {
      const targetSite = url.searchParams.get('site');
      try {
        const feeds = await findAllRSS(targetSite);
        return new Response(JSON.stringify({ feeds }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "解析失败" }), { status: 500 });
      }
    }

    // 3. 首页渲染
    if (url.pathname === "/" && !url.searchParams.has('url')) {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 4. 代理转发逻辑
    let targetUrl = url.pathname.slice(1) || url.searchParams.get('url');
    if (targetUrl && targetUrl.startsWith('http')) {
      if (url.searchParams.get('token') !== VALID_TOKEN) {
        return new Response("Unauthorized", { status: 403 });
      }
      return handleProxy(targetUrl, url.search);
    }
    return new Response("Not Found", { status: 404 });
  }
};

async function findAllRSS(siteUrl) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RSS-Detector';
  try {
    const res = await fetch(siteUrl, { headers: { 'User-Agent': ua } });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      const text = await res.text();
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1] : "直接解析源";
      title = title.replace(/<!\[CDATA\[|\]\]>/g, ''); 
      return [{ title: title.trim(), url: siteUrl }];
    }
    const html = await res.text();
    const feeds = [];
    const regex = /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]*>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
      const title = m[0].match(/title=["']([^"']+)["']/i)?.[1] || "订阅源";
      if (href) { try { feeds.push({ title, url: new URL(href, siteUrl).href }); } catch(e) {} }
    }
    if (feeds.length === 0) {
      for (const p of ['/feed', '/rss']) {
        const t = new URL(p, siteUrl).href;
        const r = await fetch(t, { method: 'HEAD', headers: { 'User-Agent': ua } });
        if (r.ok && r.headers.get('content-type')?.includes('xml')) feeds.push({ title: "自动探测源", url: t });
      }
    }
    return feeds;
  } catch (e) { throw new Error("解析失败"); }
}

async function handleProxy(targetUrl, search) {
  const p = new URLSearchParams(search);
  p.delete('token');
  const final = targetUrl + (p.toString() ? '?' + p.toString() : '');
  const r = await fetch(final, { headers: { 'User-Agent': 'Mozilla/5.0 RSS-Proxy' } });
  const nr = new Response(r.body, r);
  nr.headers.set('Access-Control-Allow-Origin', '*');
  nr.headers.set('Content-Type', 'application/xml; charset=utf-8');
  return nr;
}

function getHTML() {
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSS Proxy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root { --bg: #f5f5f7; --card-bg: rgba(255, 255, 255, 0.8); --text: #1d1d1f; --text-secondary: #86868b; --border: rgba(0,0,0,0.05); }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #000000; --card-bg: rgba(28, 28, 30, 0.8); --text: #f5f5f7; --text-secondary: #86868b; --border: rgba(255,255,255,0.1); }
      }
      body { background: var(--bg); font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text); -webkit-font-smoothing: antialiased; transition: background 0.3s; }
      .apple-card { background: var(--card-bg); backdrop-filter: saturate(180%) blur(20px); border-radius: 22px; border: 1px solid var(--border); overflow: hidden; }
      .apple-input { border: 1px solid var(--text-secondary); border-radius: 12px; transition: all 0.2s; background: transparent; color: var(--text); }
      .apple-input:focus { border-color: #007aff; box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1); outline: none; }
      .apple-btn { background: #007aff; color: white; border-radius: 12px; font-weight: 600; transition: all 0.2s; cursor: pointer; border: none; }
      .apple-btn:active { transform: scale(0.98); opacity: 0.9; }
      .feed-item { border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s; }
      .feed-item:hover { background: rgba(0, 122, 255, 0.1); }
      
      #toast { 
        position: fixed; top: 20%; left: 50%; transform: translateX(-50%); 
        background: rgba(44, 44, 46, 0.95); color: #fff; padding: 14px 28px; 
        border-radius: 30px; display: none; z-index: 9999; font-size: 15px; 
        font-weight: 500; backdrop-filter: blur(20px); box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .hidden-ui { display: none !important; }
      .label-bar { padding: 12px 20px; background: rgba(100,100,100,0.05); border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; }
      @keyframes fadeInDown { 
        from { opacity: 0; transform: translate(-50%, -20px); } 
        to { opacity: 1; transform: translate(-50%, 0); } 
      }
    </style>
  </head>
  <body class="flex flex-col items-center pt-24 px-6 min-h-screen">
    <div class="max-w-[440px] w-full space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-[40px] font-bold tracking-tight">RSS Proxy</h1>
        <p id="status-text" class="text-secondary text-lg font-medium tracking-tight">载入中...</p>
      </div>

      <div id="auth-ui" class="hidden-ui apple-card p-8 shadow-2xl text-center space-y-6 border">
        <div class="space-y-2">
          <p class="text-xs font-bold opacity-50 uppercase tracking-widest text-blue-500">Security Check</p>
          <p class="opacity-80">请输入私密 Token 以解锁工具</p>
        </div>
        <input type="password" id="token-input" class="apple-input w-full px-5 py-4 text-center text-xl tracking-widest" onkeyup="if(event.keyCode===13) saveToken()">
        <button onclick="saveToken()" id="unlock-btn" class="apple-btn w-full py-4 text-lg">解锁</button>
      </div>

      <div id="main-ui" class="hidden-ui space-y-6">
        <div class="apple-card p-6 shadow-xl">
          <input type="text" id="target" placeholder="请输入域名或订阅地址" class="apple-input w-full px-5 py-4 text-lg mb-4" onkeyup="if(event.keyCode===13) smartFind()">
          <button onclick="smartFind()" id="btn" class="apple-btn w-full py-4 text-lg">
            <span id="btn-text">查找订阅源</span>
          </button>
        </div>

        <div id="selector-wrapper" class="hidden apple-card shadow-lg border">
          <div class="label-bar"><span>探测结果 (点击源拷贝)</span></div>
          <div id="feed-list" class="flex flex-col"></div>
        </div>

        <div id="history-wrapper" class="hidden apple-card shadow-sm border">
          <div class="label-bar">
            <span>最近使用</span>
            <button onclick="clearHistory()" class="text-blue-500 hover:opacity-70 lowercase font-medium">清空</button>
          </div>
          <div id="history-list" class="flex flex-col"></div>
        </div>
      </div>
    </div>
    <div id="toast"></div>

    <script>
      const authUi = document.getElementById('auth-ui');
      const mainUi = document.getElementById('main-ui');
      const st = document.getElementById('status-text');

      async function init() {
        const token = localStorage.getItem('rss_proxy_token');
        if (!token) showAuth(); else {
          const ok = await verifyToken(token);
          if (ok) showMain(); else { localStorage.removeItem('rss_proxy_token'); showAuth(); }
        }
      }

      async function verifyToken(token) {
        try {
          const res = await fetch('/verify?token=' + encodeURIComponent(token));
          return res.ok;
        } catch { return false; }
      }

      function showAuth() { st.innerText = "⚠️ 访问受限"; authUi.classList.remove('hidden-ui'); mainUi.classList.add('hidden-ui'); }
      function showMain() { st.innerText = "简单、快速、私密的 RSS 代理"; authUi.classList.add('hidden-ui'); mainUi.classList.remove('hidden-ui'); renderHistory(); }

      async function saveToken() {
        const val = document.getElementById('token-input').value.trim();
        const btn = document.getElementById('unlock-btn');
        if (!val) { showToast('⚠️ 请输入 Token'); return; }
        btn.innerText = "校验中...";
        const ok = await verifyToken(val);
        if (ok) {
          localStorage.setItem('rss_proxy_token', val);
          showMain();
          showToast('✅ 授权成功');
        } else {
          showToast('❌ Token 不正确');
          btn.innerText = "解锁";
        }
      }

      function renderHistory() {
        const history = JSON.parse(localStorage.getItem('rss_history') || '[]');
        const wrapper = document.getElementById('history-wrapper');
        const list = document.getElementById('history-list');
        if (history.length === 0) { wrapper.classList.add('hidden'); return; }
        wrapper.classList.remove('hidden');
        list.innerHTML = '';
        history.forEach(item => list.appendChild(createItemUI(item.title, item.url, true)));
      }

      function createItemUI(title, url, isHistory = false) {
        const div = document.createElement('div');
        div.className = 'feed-item p-5 flex flex-col';
        div.onclick = () => {
          const token = localStorage.getItem('rss_proxy_token');
          const proxyUrl = window.location.origin + '/' + url + '?token=' + token;
          navigator.clipboard.writeText(proxyUrl).then(() => {
            showToast('✅ 已复制到剪贴板');
            if (!isHistory) {
                let hArr = JSON.parse(localStorage.getItem('rss_history') || '[]');
                hArr = hArr.filter(h => h.url !== url);
                hArr.unshift({ title, url });
                if (hArr.length > 5) hArr.pop();
                localStorage.setItem('rss_history', JSON.stringify(hArr));
                renderHistory();
            }
          });
        };
        div.innerHTML = \`<div class="font-semibold truncate opacity-90">\${title}</div><div class="text-xs opacity-40 truncate mt-1">\${url}</div>\`;
        return div;
      }

      async function smartFind() {
        const input = document.getElementById('target');
        const target = input.value.trim();
        
        if (!target) {
          showToast('⚠️ 请输入域名或订阅地址');
          input.focus();
          return;
        }

        // 开源通用逻辑：仅动态检测当前域名
        if (target.includes(window.location.hostname)) { 
          showToast('⚠️ 请勿重复输入代理后的链接'); 
          return; 
        }

        const btnText = document.getElementById('btn-text');
        btnText.innerText = '正在查找...';
        try {
          const res = await fetch('/find?site=' + encodeURIComponent(target));
          const data = await res.json();
          const list = document.getElementById('feed-list');
          list.innerHTML = '';
          if(!data.feeds || data.feeds.length === 0) throw new Error();
          data.feeds.forEach(f => list.appendChild(createItemUI(f.title, f.url)));
          document.getElementById('selector-wrapper').classList.remove('hidden');
        } catch (e) { showToast('❌ 未发现有效源'); }
        finally { btnText.innerText = '查找订阅源'; }
      }

      function clearHistory() { localStorage.removeItem('rss_history'); renderHistory(); }
      
      function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.display = 'block';
        t.style.opacity = '1';
        t.style.animation = 'none';
        t.offsetHeight; 
        t.style.animation = 'fadeInDown 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards';
        
        setTimeout(() => {
          t.style.transition = 'opacity 0.5s, transform 0.5s';
          t.style.opacity = '0';
          t.style.transform = 'translate(-50%, -10px)';
          setTimeout(() => {
            t.style.display = 'none';
            t.style.transform = 'translateX(-50%)'; 
          }, 500);
        }, 2500);
      }

      init();
    </script>
  </body>
  </html>
  `;
}
