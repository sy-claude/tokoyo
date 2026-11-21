// 高さ格子の読み出し（09 §6.1）。実体は gen/terrainQuery.js（描画も同じ関数で地形を作る＝不変条件6）。
export { heightAt, gradientAt, slopeDegAt, surfaceAt, edgeDistAt, cellIndexAt } from '../../gen/terrainQuery.js';
export { SURFACE } from '../../gen/terrain.js';
