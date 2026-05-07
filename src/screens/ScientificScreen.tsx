import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import { useAppDispatch } from '../store/hooks';
import { addEntry } from '../store/historySlice';
import AppHeader from '../components/AppHeader';

// ─── Button definitions ───────────────────────────────────────────────────────

interface SciButton {
  label: string;
  value: string;
  variant: 'number' | 'operator' | 'equals' | 'clear' | 'action' | 'del';
  icon?: string;
  span?: number;
}

// Scrollable function chips
const FUNC_CHIPS: { label: string; value: string }[] = [
  { label: 'sin', value: 'sin(' },
  { label: 'cos', value: 'cos(' },
  { label: 'tan', value: 'tan(' },
  { label: 'log', value: 'log(' },
  { label: 'ln', value: 'ln(' },
  { label: '√', value: '√(' },
  { label: 'xʸ', value: '^' },
  { label: 'π', value: 'π' },
  { label: 'e', value: 'ℯ' },
  { label: 'x²', value: '^2' },
  { label: '1/x', value: '1/' },
  { label: '±', value: 'neg' },
];

// Main 4-column keypad
const ROWS: SciButton[][] = [
  [
    { label: 'C', value: 'C', variant: 'clear' },
    { label: '(', value: '(', variant: 'action' },
    { label: ')', value: ')', variant: 'action' },
    { label: '⌫', value: 'DEL', variant: 'del', icon: 'backspace-outline' },
  ],
  [
    { label: '7', value: '7', variant: 'number' },
    { label: '8', value: '8', variant: 'number' },
    { label: '9', value: '9', variant: 'number' },
    { label: '÷', value: '/', variant: 'operator', icon: 'division' },
  ],
  [
    { label: '4', value: '4', variant: 'number' },
    { label: '5', value: '5', variant: 'number' },
    { label: '6', value: '6', variant: 'number' },
    { label: '×', value: '*', variant: 'operator', icon: 'close' },
  ],
  [
    { label: '1', value: '1', variant: 'number' },
    { label: '2', value: '2', variant: 'number' },
    { label: '3', value: '3', variant: 'number' },
    { label: '−', value: '-', variant: 'operator', icon: 'minus' },
  ],
  [
    { label: '0', value: '0', variant: 'number' },
    { label: '.', value: '.', variant: 'number' },
    { label: '+', value: '+', variant: 'operator', icon: 'plus' },
    { label: '=', value: '=', variant: 'equals' },
  ],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert display-form expression to JS-evaluable string */
function toEvalForm(expr: string): string {
  return expr
    .replace(/π/g, String(Math.PI))
    .replace(/ℯ/g, String(Math.E))
    .replace(/√\(/g, 'sqrt(')
    .replace(/\^/g, '**')
    .replace(/ln\(/g, 'ln(')
    .replace(/log\(/g, 'log10(')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');
  // sin/cos/tan are resolved as degree-aware helpers in the Function context
}

function evaluate(expr: string): string {
  try {
    const trimmed = expr.replace(/[+\-*/^]$/, '');
    if (!trimmed) return '0';
    const e = toEvalForm(trimmed);
    // eslint-disable-next-line no-new-func
    const result = Function(`
      "use strict";
      const _d = Math.PI / 180;
      const sin = x => Math.sin(x * _d);
      const cos = x => Math.cos(x * _d);
      const tan = x => Math.tan(x * _d);
      const sqrt = x => Math.sqrt(x);
      const ln = x => Math.log(x);
      const log10 = x => Math.log10(x);
      return (${e});
    `)();
    if (!isFinite(result) || isNaN(result)) return 'Error';
    return String(parseFloat(result.toFixed(10)));
  } catch {
    return 'Error';
  }
}

const TRAILING_OP = /[+\-*/^]$/;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScientificScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);

  const liveResult = useMemo(() => evaluate(expression), [expression]);

  const handleFuncChip = useCallback(
    (value: string) => {
      if (value === 'neg') {
        setExpression(prev =>
          prev.startsWith('-') ? prev.slice(1) : '-' + prev,
        );
        return;
      }
      setJustEvaluated(false);
      setExpression(prev => {
        if (justEvaluated && !TRAILING_OP.test(value)) return value;
        return prev + value;
      });
    },
    [justEvaluated],
  );

  const handlePress = useCallback(
    (btn: SciButton) => {
      const { value } = btn;

      if (value === 'C') {
        setExpression('');
        setJustEvaluated(false);
        return;
      }

      if (value === 'DEL') {
        setJustEvaluated(false);
        setExpression(prev => prev.slice(0, -1));
        return;
      }

      if (value === '=') {
        if (!expression) return;
        const result = evaluate(expression);
        if (result !== 'Error') {
          dispatch(addEntry({ expression, result }));
          setExpression(result);
          setJustEvaluated(true);
        }
        return;
      }

      const isOp = ['+', '-', '*', '/', '^'].includes(value);

      if (justEvaluated && !isOp) {
        setExpression(value);
        setJustEvaluated(false);
        return;
      }

      setJustEvaluated(false);
      setExpression(prev => {
        if (isOp && TRAILING_OP.test(prev)) {
          return prev.slice(0, -1) + value;
        }
        return prev + value;
      });
    },
    [expression, justEvaluated, dispatch],
  );

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      <AppHeader />

      {/* Display Stage */}
      <View style={styles.stage}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.exprScroll}
          contentContainerStyle={styles.exprScrollContent}>
          <Text style={styles.expressionText} numberOfLines={1}>
            {expression || ''}
          </Text>
        </ScrollView>

        {/* Primary display — always visible */}
        <Text
          style={[
            styles.resultText,
            (expression === '' || liveResult === 'Error' || liveResult === expression) &&
              styles.resultTextNeutral,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {expression === ''
            ? '0'
            : liveResult !== 'Error' && liveResult !== expression
            ? liveResult
            : expression}
        </Text>
      </View>

      {/* Function chips row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.funcRow}
        contentContainerStyle={styles.funcRowContent}>
        {FUNC_CHIPS.map(chip => (
          <Pressable
            key={chip.label}
            style={({ pressed }) => [styles.funcChip, pressed && styles.keyPressed]}
            onPress={() => handleFuncChip(chip.value)}>
            <Text style={styles.funcChipText}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Main keypad */}
      <View style={styles.keypad}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(btn => {
              const span = btn.span ?? 1;
              return (
                <Pressable
                  key={btn.label}
                  style={({ pressed }) => [
                    styles.key,
                    span === 2 && styles.keySpan2,
                    btn.variant === 'operator' && styles.keyOp,
                    btn.variant === 'del' && styles.keyDel,
                    btn.variant === 'equals' && styles.keyEq,
                    btn.variant === 'clear' && styles.keyClear,
                    pressed && styles.keyPressed,
                  ]}
                  onPress={() => handlePress(btn)}>
                  {btn.icon ? (
                    <MaterialDesignIcons
                      name={btn.icon as any}
                      size={22}
                      color={btn.variant === 'del' ? c.onSecondary : c.onTertiaryContainer}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.keyLabel,
                        btn.variant === 'operator' && styles.keyLabelOp,
                        btn.variant === 'equals' && styles.keyLabelEq,
                        btn.variant === 'clear' && styles.keyLabelClear,
                      ]}>
                      {btn.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GAP = 10;

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    stage: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8,
    },
    exprScroll: {
      height: 40,
    },
    exprScrollContent: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    expressionText: {
      fontSize: 24,
      fontFamily: 'Manrope-Light',
      color: c.onSurfaceVariant,
      textAlign: 'right',
    },
    resultText: {
      fontSize: 64,
      fontFamily: 'Manrope-ExtraLight',
      color: c.primary,
      textAlign: 'right',
      lineHeight: 72,
    },
    resultTextNeutral: {
      color: c.onSurface,
    },

    funcRow: {
      flexGrow: 0,
      marginBottom: 10,
    },
    funcRowContent: {
      paddingHorizontal: GAP,
      gap: 8,
      flexDirection: 'row',
    },
    funcChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: c.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 56,
    },
    funcChipText: {
      fontSize: 15,
      fontFamily: 'Manrope-Medium',
      color: c.primary,
    },

    keypad: {
      flex: 2,
      paddingHorizontal: GAP,
      paddingTop: GAP,
      paddingBottom: GAP,
      gap: GAP,
    },
    row: { flex: 1, flexDirection: 'row', gap: GAP },
    key: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keySpan2: { flex: 2 },
    keyOp: { backgroundColor: c.tertiaryContainer },
    keyDel: { backgroundColor: c.secondary },
    keyEq: { backgroundColor: c.primaryContainer },
    keyClear: { backgroundColor: c.surfaceContainerHigh },
    keyPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
    keyLabel: {
      fontSize: 24,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    keyLabelOp: { color: c.onTertiaryContainer },
    keyLabelEq: { fontSize: 28, color: c.onPrimaryContainer },
    keyLabelClear: { color: c.tertiary },
  });
}
