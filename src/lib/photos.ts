import type { ImageMetadata } from "astro";
import { THEME_NAMES, type ThemeName } from "./themes";

type Glob = Record<string, { default: ImageMetadata }>;
const sorted = (g: Glob) =>
  Object.entries(g)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, m]) => [k, m.default] as const);

const real = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG}", { eager: true });
const mock = import.meta.glob<{ default: ImageMetadata }>("../assets/mock/*/*.jpg", { eager: true });

/** src/assets/photos/* 를 파일명 순으로 정렬. 사진이 없으면 빈 배열 */
export const photos: ImageMetadata[] = sorted(real).map(([, m]) => m);

export interface PhotoSet {
  /** 이 세트를 보여줄 테마. 없으면 모든 테마 공용 */
  th?: ThemeName;
  cover: ImageMetadata;
  gallery: ImageMetadata[];
}

/**
 * 실제 사진(src/assets/photos)이 있으면 모든 테마 공용 1세트(첫 장=커버).
 * 없으면 템플릿 미리보기용 테마별 목업 세트(src/assets/mock/<테마>/cover.jpg, g*.jpg).
 */
export const photoSets: PhotoSet[] = photos.length
  ? [{ cover: photos[0], gallery: photos }]
  : THEME_NAMES.flatMap((th) => {
      const files = sorted(mock).filter(([k]) => k.includes(`/mock/${th}/`));
      const cover = files.find(([k]) => k.endsWith("/cover.jpg"))?.[1];
      return cover ? [{ th, cover, gallery: files.filter(([k]) => !k.endsWith("/cover.jpg")).map(([, m]) => m) }] : [];
    });
