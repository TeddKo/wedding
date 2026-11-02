import assert from "node:assert/strict";
import { detect } from "../src/lib/platform.ts";
import { mapApps } from "../src/lib/maps.ts";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const AND = "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120";

assert.deepEqual(detect(IOS), { os: "ios", mac: false, kakao: false });
assert.deepEqual(detect(AND), { os: "android", mac: false, kakao: false });
assert.deepEqual(detect(MAC, 5), { os: "ios", mac: false, kakao: false });
assert.deepEqual(detect(MAC, 0), { os: "desktop", mac: true, kakao: false });
assert.deepEqual(detect(WIN), { os: "desktop", mac: false, kakao: false });
assert.equal(detect(AND + " KAKAOTALK 10.0").kakao, true);

const v = { name: "MJ컨벤션", query: "MJ컨벤션 부천", lat: 37.48179793, lng: 126.79851199 };
const ids = (os, mac = false) => mapApps(os, mac, v).map((a) => a.id).join();
assert.equal(ids("ios"), "kakao,naver,tmap,google,apple");
assert.equal(ids("android"), "kakao,naver,tmap,google");
assert.equal(ids("desktop"), "kakao,naver,google");
assert.equal(ids("desktop", true), "kakao,naver,google,apple");

const by = (os) => Object.fromEntries(mapApps(os, false, v).map((a) => [a.id, a]));
const ios = by("ios");
assert.equal(ios.kakao.href, "kakaomap://look?p=37.48179793,126.79851199");
assert.equal(ios.kakao.fallback, "https://map.kakao.com/link/to/MJ%EC%BB%A8%EB%B2%A4%EC%85%98,37.48179793,126.79851199");
assert.equal(ios.naver.href, "nmap://route/car?dlat=37.48179793&dlng=126.79851199&dname=MJ%EC%BB%A8%EB%B2%A4%EC%85%98&appname=teddko.github.io%2Fwedding");
assert.equal(ios.tmap.href, "tmap://route?goalname=MJ%EC%BB%A8%EB%B2%A4%EC%85%98&goalx=126.79851199&goaly=37.48179793");
assert.equal(ios.google.href, "https://www.google.com/maps/dir/?api=1&destination=37.48179793%2C126.79851199");
assert.equal(ios.apple.href, "https://maps.apple.com/directions?destination=37.48179793,126.79851199");

const and = by("android");
assert.match(and.kakao.href, /^intent:\/\/look\?p=37\.48179793,126\.79851199#Intent;scheme=kakaomap;package=net\.daum\.android\.map;S\.browser_fallback_url=https%3A%2F%2Fmap\.kakao\.com%2Flink%2Fto%2FMJ%25EC/);
assert.match(and.naver.href, /scheme=nmap;action=android\.intent\.action\.VIEW;category=android\.intent\.category\.BROWSABLE;package=com\.nhn\.android\.nmap;S\.browser_fallback_url=https%3A%2F%2Fmap\.naver\.com%2Fp%2Fsearch%2F/);
assert.match(and.tmap.href, /scheme=tmap;package=com\.skt\.tmap\.ku;S\.browser_fallback_url=https%3A%2F%2Fplay\.google\.com/);
console.log("maps.check ok");
