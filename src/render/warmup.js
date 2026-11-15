// 事前コンパイル（09 8.7、07受25）。読み込みの最後に、全ての材質の組合せを1体ずつ置いた場面を渡して呼ぶ。
// renderer.compile の後、1×1 の範囲に1回描く（端末によっては、最初に描くまでシェーダーの準備が終わらないため）。
// M1a は場面を画面へ直接描くので、暖機も画面の左下 1×1 に描く（描画先が違うとシェーダーの出力の変換が別物になり、
// 最初の本番の描画で作り直しになる）。M1b で場面の描画先（紙墨パスの前段）ができたら、同じ形式の 1×1 の描画先に替える。
import { Vector4 } from 'three';

/**
 * @param {any} three WebGLRenderer
 * @param {any} scene 全材質を1つずつ置いた場面 @param {any} camera
 * @returns {number} 暖機の後のシェーダープログラムの数
 */
export function warmupScene(three, scene, camera) {
  three.compile(scene, camera);
  const viewport = three.getViewport(new Vector4());
  const scissor = three.getScissor(new Vector4());
  const scissorTest = three.getScissorTest();
  three.setViewport(0, 0, 1, 1);
  three.setScissor(0, 0, 1, 1);
  three.setScissorTest(true);
  three.render(scene, camera);
  three.setViewport(viewport);
  three.setScissor(scissor);
  three.setScissorTest(scissorTest);
  three.info.reset();
  return three.info.programs ? three.info.programs.length : 0;
}
