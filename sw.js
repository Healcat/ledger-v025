// 记账本 V025 Service Worker
// 作用：把单文件应用缓存到本地，使 iPhone/安卓在「首次联网加载后」即使断网，
// 也能从主屏图标离线打开。GitHub Pages 仅用于首次拉取代码，之后运行与离线无关。
//
// 策略：
//  - 导航请求（HTML）：【网络优先】，在线时永远取最新版本；断网才回退缓存。
//    （这样才能保证部署新版本后，用户刷新即可看到，不被旧缓存卡住）
//  - 静态资源（sw.js / manifest）：【缓存优先 + 后台更新】，节省流量、离线可用。

const CACHE = 'ledger-v025-v5';
const ASSETS = [
  './',
  './index.html',
  './sw.js',
  './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // 导航请求：网络优先，离线用缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
