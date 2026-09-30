// 만기콕 서비스 워커 — 오프라인에서도 '내 차' 화면이 열리도록 기본 파일을 저장합니다.
const CACHE = "mangikok-v1";
const FILES = [
  "./", "index.html", "my.html", "consult.html", "privacy.html",
  "assets/style.css", "assets/app.js", "assets/config.js", "assets/profile.jpg", "assets/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 항상 최신 파일을 먼저 받고, 인터넷이 안 될 때만 저장본을 사용합니다.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
