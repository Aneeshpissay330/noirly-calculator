import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type Base = 'HEX' | 'DEC' | 'OCT' | 'BIN';
type BitWidth = 16 | 32 | 64;

interface ProgBtn {
  label: string;
  value: string;
  variant: 'num' | 'logic' | 'shift' | 'del' | 'equals' | 'mode' | 'hex';
  icon?: string;
  span?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_RADIX: Record<Base, number> = { HEX: 16, DEC: 10, OCT: 8, BIN: 2 };
const BIT_WIDTHS: BitWidth[] = [64, 32, 16];
const GAP = 10;
const KEY_H = 48;

const ROWS: ProgBtn[][] = [
  [
    { label: 'AND', value: 'AND', variant: 'logic' },
    { label: 'OR',  value: 'OR',  variant: 'logic' },
    { label: 'XOR', value: 'XOR', variant: 'logic' },
    { label: 'NOT', value: 'NOT', variant: 'logic' },
  ],
  [
    { label: 'A', value: 'A', variant: 'hex' },
    { label: 'B', value: 'B', variant: 'hex' },
    { label: 'C', value: 'C', variant: 'hex' },
    { label: 'D', value: 'D', variant: 'hex' },
  ],
  [
    { label: 'E', value: 'E', variant: 'hex' },
    { label: 'F', value: 'F', variant: 'hex' },
    { label: '«', value: '<<', variant: 'shift' },
    { label: '»', value: '>>', variant: 'shift' },
  ],
  [
    { label: '7', value: '7', variant: 'num' },
    { label: '8', value: '8', variant: 'num' },
    { label: '9', value: '9', variant: 'num' },
    { label: '⌫', value: 'DEL', variant: 'del', icon: 'backspace-outline' },
  ],
  [
    { label: '4', value: '4', variant: 'num' },
    { label: '5', value: '5', variant: 'num' },
    { label: '6', value: '6', variant: 'num' },
    { label: 'AC', value: 'AC', variant: 'num' },
  ],
  [
    { label: '4', value: '4', variant: 'num' },
    { label: '5', value: '5', variant: 'num' },
    { label: '6', value: '6', variant: 'num' },
    { label: '=', value: '=', variant: 'equals' },
  ],
  [
    { label: '1', value: '1', variant: 'num' },
    { label: '2', value: '2', variant: 'num' },
    { label: '3', value: '3', variant: 'num' },
    { label: '', value: 'MODE', variant: 'mode', icon: 'swap-horizontal' },
  ],
  [
    { label: '0', value: '0', variant: 'num', span: 3 },
    { label: '.', value: '.', variant: 'num' },
  ],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBase(str: string, base: Base): number {
  const n = parseInt(str || '0', BASE_RADIX[base]);
  return isNaN(n) ? 0 : n;
}

function toBaseStr(n: number, base: Base): string {
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  return abs.toString(BASE_RADIX[base]).toUpperCase();
}

function applyMask(n: number, bw: BitWidth): number {
  if (bw === 16) return n & 0xffff;
  return n >>> 0; // 32-bit unsigned; close enough for demo
}

function fmtHexCard(n: number): string {
  const h = n.toString(16).toUpperCase().padStart(8, '0');
  return `${h.slice(0, 4)} ${h.slice(4)}`;
}

function fmtDecCard(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtOctCard(n: number): string {
  return n.toString(8);
}

function fmtBinCard(n: number): string {
  return n.toString(2).padStart(16, '0');
}

function fmtLargeDisplay(n: number, base: Base): string {
  switch (base) {
    case 'HEX': return n.toString(16).toUpperCase() || '0';
    case 'DEC': return n.toLocaleString('en-US');
    case 'OCT': return n.toString(8) || '0';
    case 'BIN': {
      const b = n.toString(2) || '0';
      return b.match(/.{1,4}/g)?.join(' ') ?? b;
    }
  }
}

// ─── BaseDropdown ─────────────────────────────────────────────────────────────

const BASES: Base[] = ['HEX', 'DEC', 'OCT', 'BIN'];

function BaseDropdown({
  activeBase,
  onSelect,
  values,
}: {
  activeBase: Base;
  onSelect: (b: Base) => void;
  values: Record<Base, string>;
}) {
  const [open, setOpen] = useState(false);
  const c = useThemeColors();
  const dropStyles = useMemo(() => makeDropStyles(c), [c]);

  return (
    <View style={dropStyles.wrapper}>
      {/* Trigger */}
      <Pressable
        style={dropStyles.trigger}
        onPress={() => setOpen(true)}>
        <Text style={dropStyles.triggerBase}>{activeBase}</Text>
        <Text style={dropStyles.triggerValue} numberOfLines={1}>
          {values[activeBase]}
        </Text>
        <MaterialDesignIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={c.onSurfaceVariant}
        />
      </Pressable>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={dropStyles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={dropStyles.panel}>
          {BASES.map((base, i) => (
            <Pressable
              key={base}
              style={[
                dropStyles.option,
                activeBase === base && dropStyles.optionActive,
                i < BASES.length - 1 && dropStyles.optionBorder,
              ]}
              onPress={() => {
                onSelect(base);
                setOpen(false);
              }}>
              <Text style={[dropStyles.optionBase, activeBase === base && dropStyles.optionBaseActive]}>
                {base}
              </Text>
              <Text
                style={[dropStyles.optionValue, activeBase === base && dropStyles.optionValueActive]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {values[base]}
              </Text>
              {activeBase === base && (
                <MaterialDesignIcons name="check" size={16} color={c.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

function makeDropStyles(c: Colors) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: GAP,
      paddingBottom: GAP,
      zIndex: 10,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    triggerBase: {
      fontSize: 12,
      fontFamily: 'Manrope-SemiBold',
      color: c.primary,
      letterSpacing: 1.2,
      minWidth: 30,
    },
    triggerValue: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    panel: {
      position: 'absolute',
      top: '22%',
      left: GAP * 2,
      right: GAP * 2,
      backgroundColor: c.surfaceContainerHighest,
      borderRadius: 18,
      overflow: 'hidden',
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      gap: 12,
    },
    optionBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.outlineVariant,
    },
    optionActive: {
      backgroundColor: c.surfaceContainerLow,
    },
    optionBase: {
      fontSize: 12,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurfaceVariant,
      letterSpacing: 1.2,
      minWidth: 34,
    },
    optionBaseActive: {
      color: c.primary,
    },
    optionValue: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Manrope-Medium',
      color: c.onSurfaceVariant,
    },
    optionValueActive: {
      color: c.onSurface,
    },
  });
}

// ─── ProgKey ─────────────────────────────────────────────────────────────────

function ProgKey({
  btn,
  onPress,
  disabled = false,
}: {
  btn: ProgBtn;
  onPress: (b: ProgBtn) => void;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const containerStyle = [
    styles.key,
    btn.span === 2 && styles.keySpan2,
    btn.span === 3 && styles.keySpan3,
    btn.variant === 'logic'  && styles.keyLogic,
    btn.variant === 'shift'  && styles.keyShift,
    btn.variant === 'del'    && styles.keyDel,
    btn.variant === 'equals' && styles.keyEquals,
    btn.variant === 'mode'   && styles.keyMode,
    pressed && !disabled     && styles.keyPressed,
    disabled                 && styles.keyDisabled,
  ];

  const textStyle = [
    styles.keyLabel,
    btn.variant === 'logic'  && styles.keyLabelLogic,
    btn.variant === 'shift'  && styles.keyLabelShift,
    btn.variant === 'equals' && styles.keyLabelEquals,
    disabled                 && styles.keyLabelDisabled,
  ];

  const iconColor = disabled
    ? c.outlineVariant
    : btn.variant === 'del'
    ? c.onSecondary
    : btn.variant === 'mode'
    ? c.onTertiary
    : c.onSurface;

  return (
    <Pressable
      style={containerStyle}
      disabled={disabled}
      onPressIn={() => !disabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => !disabled && onPress(btn)}>
      {btn.icon ? (
        <MaterialDesignIcons name={btn.icon as any} size={22} color={iconColor} />
      ) : (
        <Text style={textStyle}>{btn.label}</Text>
      )}
    </Pressable>
  );
}

// ─── ProgrammerScreen ────────────────────────────────────────────────────────

export default function ProgrammerScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [inputStr, setInputStr]       = useState('A455');
  const [activeBase, setActiveBase]   = useState<Base>('HEX');
  const [pendingOp, setPendingOp]     = useState<string | null>(null);
  const [storedValue, setStoredValue] = useState(0);
  const [bwIdx, setBwIdx]             = useState(0);
  const [justEval, setJustEval]       = useState(false);

  const bitWidth = BIT_WIDTHS[bwIdx];

  const numericValue = useMemo(
    () => parseBase(inputStr, activeBase),
    [inputStr, activeBase],
  );

  // Derived representations
  const largeDisplay = justEval
    ? fmtLargeDisplay(numericValue, activeBase)
    : inputStr.toUpperCase();

  // Expression line shown while an operation is pending (e.g. "A455 AND")
  const pendingExpr = useMemo(() => {
    if (!pendingOp) return null;
    return `${fmtLargeDisplay(storedValue, activeBase)} ${pendingOp}`;
  }, [pendingOp, storedValue, activeBase]);

  // 8 bit-segments from 16 LSBs (each segment = 2 bits)
  const bitSegments = useMemo(() => {
    const n = numericValue & 0xffff;
    return Array.from({ length: 8 }, (_, i) => ((n >>> (14 - i * 2)) & 0x3) > 0);
  }, [numericValue]);

  const handleBaseSwitch = useCallback(
    (newBase: Base) => {
      if (newBase === activeBase) return;
      setInputStr(toBaseStr(numericValue, newBase));
      setActiveBase(newBase);
      setJustEval(false);
    },
    [activeBase, numericValue],
  );

  const isDigitValid = useCallback(
    (d: string): boolean => {
      if ('ABCDEF'.includes(d))              return activeBase === 'HEX';
      if (d === '8' || d === '9')            return activeBase !== 'OCT' && activeBase !== 'BIN';
      if ('234567'.includes(d))              return activeBase !== 'BIN';
      return true;
    },
    [activeBase],
  );

  const handleKey = useCallback(
    (btn: ProgBtn) => {
      const { value } = btn;

      if (value === 'MODE') {
        setBwIdx(i => (i + 1) % BIT_WIDTHS.length);
        return;
      }

      if (value === 'AC') {
        setInputStr('0');
        setPendingOp(null);
        setStoredValue(0);
        setJustEval(false);
        return;
      }

      if (value === 'DEL') {
        setInputStr(prev => prev.slice(0, -1) || '0');
        setJustEval(false);
        return;
      }

      if (value === '=') {
        if (!pendingOp) return;
        const a = storedValue;
        const b = numericValue;
        let result = 0;
        if (pendingOp === 'AND') result = a & b;
        else if (pendingOp === 'OR')  result = a | b;
        else if (pendingOp === 'XOR') result = a ^ b;
        result = applyMask(result, bitWidth);
        setInputStr(toBaseStr(result < 0 ? result >>> 0 : result, activeBase));
        setPendingOp(null);
        setJustEval(true);
        return;
      }

      if (value === 'NOT') {
        const mask = bitWidth === 16 ? 0xffff : 0xffffffff;
        const result = (~numericValue) & mask;
        setInputStr(toBaseStr(result < 0 ? result >>> 0 : result, activeBase));
        setJustEval(true);
        return;
      }

      if (value === '<<') {
        const result = applyMask(numericValue << 1, bitWidth);
        setInputStr(toBaseStr(result < 0 ? result >>> 0 : result, activeBase));
        setJustEval(true);
        return;
      }

      if (value === '>>') {
        const result = applyMask(numericValue >> 1, bitWidth);
        setInputStr(toBaseStr(result < 0 ? result >>> 0 : result, activeBase));
        setJustEval(true);
        return;
      }

      if (['AND', 'OR', 'XOR'].includes(value)) {
        setStoredValue(numericValue);
        setPendingOp(value);
        setInputStr('0');
        setJustEval(false);
        return;
      }

      if (value === '.') return; // integers only

      if (isDigitValid(value)) {
        if (justEval) {
          setInputStr(value);
          setJustEval(false);
        } else if (inputStr === '0' && value !== '0') {
          // replace leading zero with a non-zero digit
          setInputStr(value);
        } else if (inputStr !== '0' || value === '0') {
          // append (also allows building "00FF" — leading zeros are kept while typing)
          setInputStr(prev => prev + value);
        }
      }
    },
    [activeBase, numericValue, pendingOp, storedValue, bitWidth, isDigitValid, justEval, inputStr],
  );

  const BASE_VALUES: Record<Base, string> = useMemo(() => ({
    HEX: fmtHexCard(numericValue),
    DEC: fmtDecCard(numericValue),
    OCT: fmtOctCard(numericValue),
    BIN: fmtBinCard(numericValue),
  }), [numericValue]);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      <AppHeader />

      {/* ── Stage: bit-width + display + bit strip ── */}
      <View style={styles.stage}>
        <Pressable onPress={() => setBwIdx(i => (i + 1) % BIT_WIDTHS.length)}>
          <Text style={styles.bitWidthLabel}>{bitWidth}-BIT SIGNED</Text>
        </Pressable>
        {pendingExpr ? (
          <Text style={styles.exprLine} numberOfLines={1}>
            {pendingExpr}
          </Text>
        ) : null}
        <Text style={styles.largeDisplay} numberOfLines={1} adjustsFontSizeToFit>
          {largeDisplay}
        </Text>
        <View style={styles.bitStrip}>
          {bitSegments.map((on, i) => (
            <View key={i} style={[styles.bitSeg, on ? styles.bitSegOn : styles.bitSegOff]} />
          ))}
        </View>
      </View>

      {/* ── Base dropdown ── */}
      <BaseDropdown
        activeBase={activeBase}
        onSelect={handleBaseSwitch}
        values={BASE_VALUES}
      />

      {/* ── Keypad ── */}
      <View style={styles.keypad}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.krow}>
            {row.map(btn => {
              const disabled =
                (btn.variant === 'hex' && activeBase !== 'HEX') ||
                ((btn.value === '8' || btn.value === '9') &&
                  (activeBase === 'OCT' || activeBase === 'BIN')) ||
                ('234567'.includes(btn.value) && activeBase === 'BIN');
              return (
                <ProgKey key={btn.value} btn={btn} onPress={handleKey} disabled={disabled} />
              );
            })}
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

    // Stage
    stage: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 10,
      gap: 6,
    },
    bitWidthLabel: {
      fontSize: 11,
      fontFamily: 'Manrope-SemiBold',
      color: c.primary,
      letterSpacing: 1.8,
      textAlign: 'right',
    },
    exprLine: {
      fontSize: 18,
      fontFamily: 'Manrope-Light',
      color: c.onSurfaceVariant,
      textAlign: 'right',
      opacity: 0.8,
    },
    largeDisplay: {
      fontSize: 72,
      fontFamily: 'Manrope-ExtraLight',
      color: c.onSurface,
      textAlign: 'right',
      lineHeight: 78,
      minHeight: 80,
    },
    bitStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    bitSeg: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    bitSegOn: {
      backgroundColor: c.primary,
    },
    bitSegOff: {
      backgroundColor: c.outlineVariant,
    },

    // Keypad
    keypad: {
      flex: 4,
      paddingHorizontal: GAP,
      paddingTop: 4,
      paddingBottom: GAP,
      gap: GAP,
    },
    krow: {
      flex: 1,
      flexDirection: 'row',
      gap: GAP,
    },
    key: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keySpan2: {
      flex: 2,
    },
    keySpan3: {
      flex: 3,
    },
    keyLogic: {
      backgroundColor: c.tertiaryContainer,
    },
    keyShift: {
      backgroundColor: c.secondaryContainer,
    },
    keyDel: {
      backgroundColor: c.secondary,
    },
    keyEquals: {
      backgroundColor: c.primaryContainer,
    },
    keyMode: {
      backgroundColor: c.tertiaryContainer,
      borderRadius: 24,
    },
    keyDisabled: {
      backgroundColor: c.surfaceContainerLow,
      opacity: 0.45,
    },
    keyPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    keyLabel: {
      fontSize: 20,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    keyLabelLogic: {
      fontSize: 13,
      fontFamily: 'Manrope-SemiBold',
      color: c.onTertiaryContainer,
      letterSpacing: 0.5,
    },
    keyLabelShift: {
      fontSize: 22,
      color: c.onSecondaryContainer,
    },
    keyLabelEquals: {
      fontSize: 26,
      color: c.onPrimaryContainer,
    },
    keyLabelDisabled: {
      color: c.outlineVariant,
    },
  });
}
