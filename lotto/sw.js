/**
 * Service Worker for 로또 번호 생성기
 * 오프라인 지원 및 캐시 관리
 */

const CACHE_NAME = 'lotto-generator-v1';
const DATA_CACHE_NAME = 'lotto-data-v1';

// 캐시할 정적 리소스
const STATIC_FILES = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/lotto-core.js',
    '/js/analytics.js',
    '/js/charts.js',
    '/js/storage.js',
    '/js/app.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// 데이터 파일
const DATA_FILES = [
    '/data/lotto-data.json'
];

// Service Worker 설치
self.addEventListener('install', event => {
    console.log('[SW] Install event');

    event.waitUntil(
        Promise.all([
            // 정적 파일 캐시
            caches.open(CACHE_NAME).then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            // 데이터 파일 캐시
            caches.open(DATA_CACHE_NAME).then(cache => {
                console.log('[SW] Caching data files');
                return cache.addAll(DATA_FILES);
            })
        ]).then(() => {
            // 즉시 활성화
            self.skipWaiting();
        })
    );
});

// Service Worker 활성화
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');

    event.waitUntil(
        Promise.all([
            // 이전 캐시 정리
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 모든 클라이언트 제어
            self.clients.claim()
        ])
    );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // 로또 데이터 요청 처리
    if (url.pathname.includes('/data/lotto-data.json')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(request).then(response => {
                    // 네트워크에서 성공적으로 받아온 경우 캐시 업데이트
                    if (response.status === 200) {
                        cache.put(request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    // 네트워크 실패 시 캐시에서 반환
                    console.log('[SW] Serving data from cache (offline)');
                    return cache.match(request);
                });
            })
        );
        return;
    }

    // Chart.js CDN 요청 처리
    if (url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(request).then(fetchResponse => {
                        cache.put(request, fetchResponse.clone());
                        return fetchResponse;
                    }).catch(() => {
                        console.log('[SW] CDN request failed, no cache available');
                        return new Response('External resource unavailable', { status: 503 });
                    });
                });
            })
        );
        return;
    }

    // 정적 파일 요청 처리 (Cache First 전략)
    if (request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(request).then(response => {
                    if (response) {
                        // 캐시에서 반환하고 백그라운드에서 업데이트
                        fetch(request).then(fetchResponse => {
                            if (fetchResponse.status === 200) {
                                cache.put(request, fetchResponse.clone());
                            }
                        }).catch(() => {
                            // 백그라운드 업데이트 실패는 무시
                        });
                        return response;
                    }

                    // 캐시에 없으면 네트워크에서 가져오기
                    return fetch(request).then(fetchResponse => {
                        if (fetchResponse.status === 200) {
                            cache.put(request, fetchResponse.clone());
                        }
                        return fetchResponse;
                    }).catch(() => {
                        // 네트워크도 실패한 경우
                        if (url.pathname === '/' || url.pathname === '/index.html') {
                            return cache.match('/index.html');
                        }
                        return new Response('리소스를 사용할 수 없습니다.', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                });
            })
        );
    }
});

// 백그라운드 동기화 (데이터 업데이트)
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'update-lotto-data') {
        event.waitUntil(updateLottoData());
    }
});

// 푸시 알림 수신
self.addEventListener('push', event => {
    console.log('[SW] Push received:', event);

    const options = {
        body: event.data ? event.data.text() : '새로운 로또 데이터가 업데이트되었습니다.',
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '확인하기',
                icon: '/android-chrome-192x192.png'
            },
            {
                action: 'close',
                title: '닫기'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('로또 번호 생성기', options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification click received:', event);

    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 메시지 처리 (웹 앱과의 통신)
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);

    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_NAME });
                break;
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                });
                break;
            case 'UPDATE_DATA':
                updateLottoData().then(() => {
                    event.ports[0].postMessage({ success: true });
                }).catch(error => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
                break;
        }
    }
});

// 데이터 업데이트 함수
async function updateLottoData() {
    try {
        console.log('[SW] Updating lotto data...');

        const cache = await caches.open(DATA_CACHE_NAME);
        const response = await fetch('/data/lotto-data.json', {
            cache: 'no-cache'
        });

        if (response.status === 200) {
            await cache.put('/data/lotto-data.json', response.clone());
            console.log('[SW] Lotto data updated successfully');

            // 모든 클라이언트에게 업데이트 알림
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'DATA_UPDATED',
                    timestamp: Date.now()
                });
            });

            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('[SW] Failed to update lotto data:', error);
        throw error;
    }
}

// 모든 캐시 정리
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[SW] All caches cleared');
        return true;
    } catch (error) {
        console.error('[SW] Failed to clear caches:', error);
        throw error;
    }
}

// 캐시 크기 제한 관리
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
        // 오래된 항목부터 삭제
        const itemsToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(
            itemsToDelete.map(key => cache.delete(key))
        );
        console.log(`[SW] Trimmed cache ${cacheName} to ${maxItems} items`);
    }
}

// 정기적인 캐시 정리 (브라우저가 지원하는 경우)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'cache-cleanup') {
            event.waitUntil(
                Promise.all([
                    limitCacheSize(CACHE_NAME, 50),
                    limitCacheSize(DATA_CACHE_NAME, 10)
                ])
            );
        }
    });
}

// 오류 처리
self.addEventListener('error', event => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    event.preventDefault();
});