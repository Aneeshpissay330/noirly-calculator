import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Viewport = { xMin: number; xMax: number; yMin: number; yMax: number };
type CanvasSize = { width: number; height: number };
type KVariant = 'num' | 'del' | 'calc';
interface KBtn { label: string; value: string; variant: KVariant; icon?: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_VP: Viewport = {
  xMin: -Math.PI * 2,
  xMax: Math.PI * 2,
  yMin: -1.2,
  yMax: 2.5,
};
const SAMPLES = 300;
const LINE_W = 1.5;
// Grid/axis colors are now computed per-render using useThemeColors()
const GAP = 10;

const GRAPH_KEYS: KBtn[][] = [
  [
    { label: '7', value: '7', variant: 'num' },
    { label: '8', value: '8', variant: 'num' },
    { label: '9', value: '9', variant: 'num' },
    { label: '', value: 'DEL', variant: 'del', icon: 'backspace-outline' },
  ],
  [
    { label: '4', value: '4', variant: 'num' },
    { label: '5', value: '5', variant: 'num' },
    { label: '6', value: '6', variant: 'num' },
    { label: '×', value: '*', variant: 'num', icon: 'close' },
  ],
  [
    { label: '1', value: '1', variant: 'num' },
    { label: '2', value: '2', variant: 'num' },
    { label: '3', value: '3', variant: 'num' },
    { label: '−', value: '-', variant: 'num', icon: 'minus' },
  ],
  [
    { label: 'x', value: 'x', variant: 'num' },
    { label: '0', value: '0', variant: 'num' },
    { label: '.', value: '.', variant: 'num' },
    { label: '=', value: 'CALC', variant: 'calc' },
  ],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEvaluator(expr: string): ((x: number) => number) | null {
  const t = expr.trim().toLowerCase();
  if (!t) return null;
  try {
    let s = t;
    s = s.replace(/\bsin\b/g, 'Math.sin');
    s = s.replace(/\bcos\b/g, 'Math.cos');
    s = s.replace(/\btan\b/g, 'Math.tan');
    s = s.replace(/\bsqrt\b/g, 'Math.sqrt');
    s = s.replace(/\babs\b/g, 'Math.abs');
    s = s.replace(/\blog\b/g, 'Math.log10');
    s = s.replace(/\bln\b/g, 'Math.log');
    s = s.replace(/\bpi\b/g, `${Math.PI}`);
    s = s.replace(/π/g, `${Math.PI}`);
    s = s.replace(/\bx\b/g, '(x)');
    s = s.replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    return Function(
      'x',
      `"use strict"; try { const v = +(${s}); return isFinite(v) ? v : NaN; } catch(e) { return NaN; }`,
    ) as (x: number) => number;
  } catch {
    return null;
  }
}

function worldToScreen(
  wx: number, wy: number, vp: Viewport, cs: CanvasSize,
): [number, number] {
  const sx = ((wx - vp.xMin) / (vp.xMax - vp.xMin)) * cs.width;
  const sy = ((vp.yMax - wy) / (vp.yMax - vp.yMin)) * cs.height;
  return [sx, sy];
}

function computeSegments(
  fn: (x: number) => number,
  vp: Viewport,
  cs: CanvasSize,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  if (!cs.width || !cs.height) return [];
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  let prev: [number, number] | null = null;
  for (let i = 0; i <= SAMPLES; i++) {
    const wx = vp.xMin + (i / SAMPLES) * (vp.xMax - vp.xMin);
    const wy = fn(wx);
    if (isNaN(wy)) { prev = null; continue; }
    const cur = worldToScreen(wx, wy, vp, cs);
    if (prev) {
      if (Math.abs(cur[1] - prev[1]) < cs.height * 4) {
        segs.push({ x1: prev[0], y1: prev[1], x2: cur[0], y2: cur[1] });
      }
    }
    prev = cur;
  }
  return segs;
}

function niceStep(range: number, count: number): number {
  const raw = Math.abs(range) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  if (n <= 1.5) return mag;
  if (n <= 3.5) return 2 * mag;
  if (n <= 7.5) return 5 * mag;
  return 10 * mag;
}

function formatLegend(expr: string, index: number): string {
  const names = ['F(X)', 'G(X)', 'H(X)'];
  const name = names[index] ?? `F${index + 1}(X)`;
  const display = expr
    .toUpperCase()
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\*/g, '×');
  return `${name} = ${display}`;
}

// ─── CurveSeg ────────────────────────────────────────────────────────────────

function CurveSeg({
  x1, y1, x2, y2, color, lw = LINE_W,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; lw?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.3) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2 - lw / 2,
        width: len,
        height: lw,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

// ─── GraphGrid ───────────────────────────────────────────────────────────────

function fmtTick(v: number): string {
  if (Math.abs(v) < 1e-9) return '0';
  const abs = Math.abs(v);
  if (abs >= 1000 || (abs < 0.01 && abs > 0)) return v.toExponential(1);
  // trim trailing zeros
  return parseFloat(v.toPrecision(4)).toString();
}

function GraphGrid({ vp, cs }: { vp: Viewport; cs: CanvasSize }) {
  const themeColors = useThemeColors();
  const isDark = themeColors.background === '#0F0F11' || themeColors.surface === '#0F0F11';
  const GRID_COLOR = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const AXIS_COLOR = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  const LABEL_COLOR = themeColors.onSurface;
  const xRange = vp.xMax - vp.xMin;
  const yRange = vp.yMax - vp.yMin;
  const xStep = niceStep(xRange, 8);
  const yStep = niceStep(yRange, 6);
  const els: React.ReactElement[] = [];

  // clamp axis screen position to canvas bounds
  const axisX = Math.max(0, Math.min(cs.width,  ((0 - vp.xMin) / xRange) * cs.width));
  const axisY = Math.max(0, Math.min(cs.height, ((vp.yMax - 0) / yRange) * cs.height));

  // ── vertical grid lines + x-axis labels ──
  const xStart = Math.ceil(vp.xMin / xStep) * xStep;
  for (let wx = xStart; wx <= vp.xMax + xStep * 0.01; wx += xStep) {
    const sx = ((wx - vp.xMin) / xRange) * cs.width;
    const isAxis = Math.abs(wx) < xStep * 0.05;
    els.push(
      <View
        key={`v${wx.toFixed(6)}`}
        style={{
          position: 'absolute',
          left: sx,
          top: 0,
          width: isAxis ? 1.5 : StyleSheet.hairlineWidth,
          height: cs.height,
          backgroundColor: isAxis ? AXIS_COLOR : GRID_COLOR,
        }}
      />,
    );
    if (!isAxis) {
      // label sits just below the x-axis line
      const labelY = Math.max(4, Math.min(cs.height - 18, axisY + 3));
      els.push(
        <Text
          key={`vl${wx.toFixed(6)}`}
          style={{
            position: 'absolute',
            left: sx + 3,
            top: labelY,
            fontSize: 9,
            fontFamily: 'Manrope-Regular',
            color: LABEL_COLOR,
          }}>
          {fmtTick(wx)}
        </Text>,
      );
    }
  }

  // ── horizontal grid lines + y-axis labels ──
  const yStart = Math.ceil(vp.yMin / yStep) * yStep;
  for (let wy = yStart; wy <= vp.yMax + yStep * 0.01; wy += yStep) {
    const sy = ((vp.yMax - wy) / yRange) * cs.height;
    const isAxis = Math.abs(wy) < yStep * 0.05;
    els.push(
      <View
        key={`h${wy.toFixed(6)}`}
        style={{
          position: 'absolute',
          left: 0,
          top: sy,
          width: cs.width,
          height: isAxis ? 1.5 : StyleSheet.hairlineWidth,
          backgroundColor: isAxis ? AXIS_COLOR : GRID_COLOR,
        }}
      />,
    );
    if (!isAxis) {
      // label sits just right of the y-axis line
      const labelX = Math.max(4, Math.min(cs.width - 36, axisX + 3));
      els.push(
        <Text
          key={`hl${wy.toFixed(6)}`}
          style={{
            position: 'absolute',
            left: labelX,
            top: sy - 11,
            fontSize: 9,
            fontFamily: 'Manrope-Regular',
            color: LABEL_COLOR,
          }}>
          {fmtTick(wy)}
        </Text>,
      );
    }
  }

  // ── axis arrow tips ──
  // X-axis "→" tip at right edge
  els.push(
    <Text
      key="xtip"
      style={{
        position: 'absolute',
        right: 4,
        top: axisY - 7,
        fontSize: 11,
        color: AXIS_COLOR,
        fontFamily: 'Manrope-Regular',
      }}>
      x
    </Text>,
  );
  // Y-axis "↑" tip at top edge
  els.push(
    <Text
      key="ytip"
      style={{
        position: 'absolute',
        left: axisX + 4,
        top: 2,
        fontSize: 11,
        color: AXIS_COLOR,
        fontFamily: 'Manrope-Regular',
      }}>
      y
    </Text>,
  );

  return <>{els}</>;
}

// ─── GraphKey ────────────────────────────────────────────────────────────────

function GraphKey({ btn, onPress }: { btn: KBtn; onPress: (b: KBtn) => void }) {
  const [pressed, setPressed] = useState(false);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable
      style={[
        styles.kbtn,
        btn.variant === 'del' && styles.kbtnDel,
        btn.variant === 'calc' && styles.kbtnCalc,
        pressed && styles.kbtnPressed,
      ]}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => onPress(btn)}>
      {btn.icon ? (
        <MaterialDesignIcons
          name={btn.icon as any}
          size={24}
          color={
            btn.variant === 'del'
              ? c.onSecondary
              : btn.variant === 'num'
              ? c.onSurface
              : c.onTertiaryContainer
          }
        />
      ) : (
        <Text
          style={[
            styles.kbtnLabel,
            btn.variant === 'del' && styles.kbtnLabelDel,
            btn.variant === 'calc' && styles.kbtnLabelCalc,
          ]}>
          {btn.label}
        </Text>
      )}
    </Pressable>
  );
}

// ─── GraphScreen ─────────────────────────────────────────────────────────────

export default function GraphScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const curveColors = [c.primary, c.secondary];

  const [exprs, setExprs] = useState(['sin(x)', 'x^2']);
  const [activeEq, setActiveEq] = useState(0);
  const [vp, setVp] = useState<Viewport>(DEFAULT_VP);
  const [cs, setCs] = useState<CanvasSize>({ width: 0, height: 0 });
  const [panMode, setPanMode] = useState(true);

  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const inputRefs = [ref0, ref1];

  const panModeRef = useRef(panMode);
  panModeRef.current = panMode;
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const csRef = useRef(cs);
  csRef.current = cs;
  const lastDx = useRef(0);
  const lastDy = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => panModeRef.current,
      onMoveShouldSetPanResponder: () => panModeRef.current,
      onPanResponderGrant: () => {
        lastDx.current = 0;
        lastDy.current = 0;
      },
      onPanResponderMove: (_, g) => {
        const deltaDx = g.dx - lastDx.current;
        const deltaDy = g.dy - lastDy.current;
        lastDx.current = g.dx;
        lastDy.current = g.dy;
        const { xMin, xMax, yMin, yMax } = vpRef.current;
        const { width, height } = csRef.current;
        if (!width || !height) return;
        const worldDx = (deltaDx / width) * (xMax - xMin);
        const worldDy = (deltaDy / height) * (yMax - yMin);
        setVp({
          xMin: xMin - worldDx,
          xMax: xMax - worldDx,
          yMin: yMin + worldDy,
          yMax: yMax + worldDy,
        });
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const handleZoomIn = useCallback(() => {
    setVp(v => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const xr = (v.xMax - v.xMin) * 0.4;
      const yr = (v.yMax - v.yMin) * 0.4;
      return { xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setVp(v => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const xr = (v.xMax - v.xMin) * 0.625;
      const yr = (v.yMax - v.yMin) * 0.625;
      return { xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }, []);

  const handleReset = useCallback(() => setVp(DEFAULT_VP), []);

  const handleKey = useCallback(
    (btn: KBtn) => {
      if (btn.value === 'CALC') {
        inputRefs[activeEq].current?.blur();
        return;
      }
      setExprs(prev => {
        const next = [...prev];
        next[activeEq] =
          btn.value === 'DEL'
            ? next[activeEq].slice(0, -1)
            : next[activeEq] + btn.value;
        return next;
      });
    },
    [activeEq, inputRefs],
  );

  const evaluators = useMemo(
    () => exprs.map(e => createEvaluator(e)),
    [exprs],
  );

  const curves = useMemo(
    () => evaluators.map(fn => (fn ? computeSegments(fn, vp, cs) : [])),
    [evaluators, vp, cs],
  );

  const handleCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCs({ width, height });
  }, []);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      <AppHeader />

      {/* ── Graph section ── */}
      <View style={styles.graphSection}>
        {/* Canvas */}
        <View
          style={styles.canvas}
          onLayout={handleCanvasLayout}
          {...panResponder.panHandlers}>
          {cs.width > 0 && (
            <>
              <GraphGrid vp={vp} cs={cs} />
              {curves.map((segs, ci) =>
                segs.map((seg, si) => (
                  <CurveSeg
                    key={`${ci}-${si}`}
                    {...seg}
                    color={curveColors[ci] ?? c.primary}
                  />
                )),
              )}
            </>
          )}
          {/* Legend */}
          <View style={styles.legend}>
            {exprs
              .filter(e => e.trim())
              .map((expr, i) => (
                <View key={i} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: curveColors[i] ?? c.primary },
                    ]}
                  />
                  <Text style={styles.legendText}>{formatLegend(expr, i)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Zoom Controls (overlaid on right) */}
        <View style={styles.zoomControls}>
          <Pressable style={styles.zoomBtn} onPress={handleZoomIn}>
            <Text style={styles.zoomBtnLabel}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomBtn} onPress={handleZoomOut}>
            <Text style={styles.zoomBtnLabel}>−</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomBtn} onPress={handleReset}>
            <MaterialDesignIcons name="restore" size={18} color={c.onSurface} />
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={[styles.zoomBtn, panMode && styles.zoomBtnPan]}
            onPress={() => setPanMode(p => !p)}>
            <MaterialDesignIcons
              name="hand-back-left"
              size={18}
              color={panMode ? c.onPrimary : c.onSurface}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Equation inputs ── */}
      <View style={styles.equations}>
        {exprs.map((expr, i) => (
          <Pressable
            key={i}
            style={[styles.eqSlot, activeEq === i && styles.eqSlotActive]}
            onPress={() => {
              setActiveEq(i);
              inputRefs[i].current?.focus();
            }}>
            <Text style={styles.eqLabel}>{i === 0 ? 'f₁' : 'f₂'}</Text>
            <TextInput
              ref={inputRefs[i]}
              style={styles.eqInput}
              value={expr}
              onChangeText={text =>
                setExprs(prev => {
                  const next = [...prev];
                  next[i] = text;
                  return next;
                })
              }
              onFocus={() => setActiveEq(i)}
              placeholder={i === 0 ? 'Enter equation' : 'Add equation'}
              placeholderTextColor={c.outlineVariant}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="dark"
            />
          </Pressable>
        ))}
      </View>

      {/* ── Keypad ── */}
      <View style={styles.keypad}>
        {GRAPH_KEYS.map((row, ri) => (
          <View key={ri} style={styles.krow}>
            {row.map(btn => (
              <GraphKey key={btn.value} btn={btn} onPress={handleKey} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },

    // Graph
    graphSection: {
      flex: 1,
      minHeight: 200,
    },
    canvas: {
      flex: 1,
      backgroundColor: c.surfaceContainerLow,
      overflow: 'hidden',
    },
    legend: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.50)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      fontFamily: 'Manrope-SemiBold',
      color: '#FFFFFF',
    },

    // Zoom controls
    zoomControls: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      backgroundColor: c.surfaceContainerHighest,
      borderRadius: 16,
      overflow: 'hidden',
    },
    zoomBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomBtnPan: {
      backgroundColor: c.primaryContainer,
    },
    zoomBtnLabel: {
      fontSize: 22,
      fontFamily: 'Manrope-Light',
      color: c.onSurface,
      lineHeight: 26,
    },
    zoomDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.outlineVariant,
      marginHorizontal: 8,
    },

    // Equations
    equations: {
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 8,
    },
    eqSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    eqSlotActive: {
      borderColor: c.primaryContainer,
    },
    eqLabel: {
      fontSize: 13,
      fontFamily: 'Manrope-Regular',
      color: c.onSurfaceVariant,
      minWidth: 14,
    },
    eqInput: {
      flex: 1,
      fontSize: 26,
      fontFamily: 'Manrope-Regular',
      color: c.onSurface,
      padding: 0,
    },

    // Keypad
    keypad: {
      paddingHorizontal: GAP,
      paddingTop: GAP,
      paddingBottom: GAP,
      gap: GAP,
    },
    krow: {
      flexDirection: 'row',
      gap: GAP,
    },
    kbtn: {
      flex: 1,
      aspectRatio: 1.4,
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kbtnDel: {
      backgroundColor: c.secondary,
    },
    kbtnCalc: {
      backgroundColor: c.primaryContainer,
    },
    kbtnPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    kbtnLabel: {
      fontSize: 22,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    kbtnLabelDel: {
      fontSize: 18,
      color: c.onTertiaryContainer,
    },
    kbtnLabelCalc: {
      fontSize: 26,
      color: c.onPrimaryContainer,
    },
  });
}
