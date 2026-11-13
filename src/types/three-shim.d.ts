// three は型定義パッケージを使わない（不変条件11：依存は4つだけ）。any 型として扱う。
declare module 'three';
declare module 'three/addons/*';

// tsconfig の types が空で vite/client の型が入らないため、使う分だけここに書く。
interface ImportMeta {
  readonly env: { readonly BASE_URL: string; readonly DEV: boolean; readonly PROD: boolean };
}
