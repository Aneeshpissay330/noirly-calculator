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

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'number' | 'operator' | 'action' | 'equals' | 'clear' | 'del';

interface CalcButton {
  label: string;
  value: string;
  variant: ButtonVariant;
  icon?: string;
  span?: number;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const BUTTONS: CalcButton[][] = [
  [
    { label: 'C', value: 'C', variant: 'clear' },
    { label: '⌫', value: 'DEL', variant: 'del', icon: 'backspace-outline' },
    { label: '%', value: '%', variant: 'action' },
    { label: '×', value: '*', variant: 'operator', icon: 'close' },
  ],
  [
    { label: '7', value: '7', variant: 'number' },
    { label: '8', value: '8', variant: 'number' },
    { label: '9', value: '9', variant: 'number' },
    { label: '−', value: '-', variant: 'operator', icon: 'minus' },
  ],
  [
    { label: '4', value: '4', variant: 'number' },
    { label: '5', value: '5', variant: 'number' },
    { label: '6', value: '6', variant: 'number' },
    { label: '+', value: '+', variant: 'operator', icon: 'plus' },
  ],
  [
    { label: '1', value: '1', variant: 'number' },
    { label: '2', value: '2', variant: 'number' },
    { label: '3', value: '3', variant: 'number' },
    { label: '÷', value: '/', variant: 'operator', icon: 'division' },
  ],
  [
    { label: '0', value: '0', variant: 'number' },
    { label: '.', value: '.', variant: 'number' },
    { label: '=', value: '=', variant: 'equals', span: 2 },
  ],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(value: string): string {
  if (!value || value === 'Error') return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

function evaluate(expression: string): string {
  try {
    // Replace display operators with JS operators
    const sanitized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (result === Infinity || result === -Infinity) return 'Error';
    if (isNaN(result)) return 'Error';
    return String(result);
  } catch {
    return 'Error';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalcScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [expression, setExpression] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Live result: evaluate the expression with any trailing operator stripped
  const display = useMemo(() => {
    if (!expression) return '0';
    const trimmed = expression.replace(/[+\-*/]$/, '');
    if (!trimmed) return '0';
    const result = evaluate(trimmed);
    return result === 'Error' ? '0' : result;
  }, [expression]);

  const handlePress = useCallback(
    (btn: CalcButton) => {
      const { value } = btn;

      if (value === 'C') {
        setExpression('');
        setJustEvaluated(false);
        return;
      }

      if (value === 'DEL') {
        if (justEvaluated) {
          setExpression('');
          setJustEvaluated(false);
          return;
        }
        setExpression(prev => prev.slice(0, -1));
        return;
      }

      if (value === '%') {
        const base = expression.replace(/[+\-*/]$/, '') || '0';
        const result = evaluate(`(${base}) / 100`);
        if (result !== 'Error') {
          setExpression(result);
          setJustEvaluated(true);
        }
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

      const isOperator = ['+', '-', '*', '/'].includes(value);

      if (justEvaluated && !isOperator) {
        setExpression(value);
        setJustEvaluated(false);
        return;
      }

      setJustEvaluated(false);
      setExpression(prev => {
        // Replace a trailing operator instead of stacking two operators
        if (isOperator && /[+\-*/]$/.test(prev)) {
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
          style={styles.expressionScroll}
          contentContainerStyle={styles.expressionContent}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <Text style={styles.expressionText} numberOfLines={1}>
            {expression || ''}
          </Text>
        </ScrollView>
        <Text style={styles.resultText} numberOfLines={1} adjustsFontSizeToFit>
          {formatNumber(display)}
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {BUTTONS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(btn => (
              <CalcKey
                key={btn.value}
                btn={btn}
                onPress={handlePress}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── CalcKey ─────────────────────────────────────────────────────────────────

interface CalcKeyProps {
  btn: CalcButton;
  onPress: (btn: CalcButton) => void;
}

function CalcKey({ btn, onPress }: CalcKeyProps) {
  const [pressed, setPressed] = useState(false);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const span = btn.span ?? 1;

  const containerStyle = [
    styles.key,
    span === 2 && styles.keySpan2,
    btn.variant === 'operator' && styles.keyOperator,
    btn.variant === 'equals' && styles.keyEquals,
    btn.variant === 'clear' && styles.keyClear,
    btn.variant === 'del' && styles.keyDel,
    pressed && styles.keyPressed,
  ];

  const textStyle = [
    styles.keyLabel,
    btn.variant === 'operator' && styles.keyLabelOperator,
    btn.variant === 'equals' && styles.keyLabelEquals,
    btn.variant === 'clear' && btn.label === 'C' && styles.keyLabelClear,
  ];

  return (
    <Pressable
      style={containerStyle}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => onPress(btn)}>
      {btn.icon ? (
        <MaterialDesignIcons
          name={btn.icon as any}
          size={26}
          color={
            btn.variant === 'del'
              ? c.onSecondary
              : btn.variant === 'operator'
              ? c.onTertiaryContainer
              : c.onSurfaceVariant
          }
        />
      ) : (
        <Text style={textStyle}>{btn.label}</Text>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GAP = 12;

function makeStyles(c: Colors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  stage: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  expressionScroll: {
    maxHeight: 40,
  },
  expressionContent: {
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
    fontSize: 72,
    fontFamily: 'Manrope-ExtraLight',
    color: c.onSurface,
    textAlign: 'right',
    lineHeight: 80,
  },
  keypad: {
    flex: 2,
    paddingHorizontal: GAP,
    paddingTop: GAP,
    paddingBottom: GAP,
    gap: GAP,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  key: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: c.surfaceContainerHigh,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySpan2: {
    flex: 2,
  },
  keyOperator: {
    backgroundColor: c.tertiaryContainer,
  },
  keyEquals: {
    backgroundColor: c.primaryContainer,
  },
  keyClear: {
    backgroundColor: c.surfaceContainerHigh,
  },
  keyDel: {
    backgroundColor: c.secondary,
  },
  keyPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  keyLabel: {
    fontSize: 28,
    fontFamily: 'Manrope-Medium',
    color: c.onSurface,
  },
  keyLabelOperator: {
    color: c.onTertiaryContainer,
  },
  keyLabelEquals: {
    fontSize: 32,
    color: c.onPrimaryContainer,
  },
  keyLabelClear: {
    color: c.tertiary,
  },
  });
}
