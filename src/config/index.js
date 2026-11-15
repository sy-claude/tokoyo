// config の全表の一覧。1ファイル1表（09 1.4）。値を読む側は core/config.js の buildConfig で cfg にして使う。
import { time } from './time.js';
import { collision } from './collision.js';
import { movement } from './movement.js';
import { camera } from './camera.js';
import { input } from './input.js';
import { quality } from './quality.js';
import { save } from './save.js';
import { debug } from './debug.js';
import { layout } from './layout.js';
import { settings } from './settings.js';
import { ui } from './ui.js';
import { palette } from './palette.js';
import { render } from './render.js';
import { anim } from './anim.js';
import { audio } from './audio.js';

export const configTables = { time, collision, movement, camera, input, layout, ui, settings, render, palette, anim, audio, quality, save, debug };

/**
 * 表の集まり → 値だけの形。
 * @template T
 * @typedef {{[K in keyof T]: {[P in keyof T[K]]: T[K][P] extends {v: infer V} ? V : never}}} CfgOf
 */
/**
 * 値だけの設定。cfg.movement.runSpeedMps のように読む。
 * @typedef {CfgOf<typeof configTables>} Cfg
 */

/** @typedef {'high'|'mid'|'low'} QualityLevel */
