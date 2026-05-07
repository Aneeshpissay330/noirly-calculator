import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import AppHeader from '../components/AppHeader';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Unit {
  label: string;
  abbr: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

interface Category {
  name: string;
  icon: string;
  units: Unit[];
}

interface PickerOption {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

const CATEGORIES: Category[] = [
  {
    name: 'Length',
    icon: 'ruler',
    units: [
      { label: 'Meter',      abbr: 'm',  toBase: v => v,            fromBase: v => v },
      { label: 'Kilometer',  abbr: 'km', toBase: v => v * 1000,     fromBase: v => v / 1000 },
      { label: 'Centimeter', abbr: 'cm', toBase: v => v / 100,      fromBase: v => v * 100 },
      { label: 'Millimeter', abbr: 'mm', toBase: v => v / 1000,     fromBase: v => v * 1000 },
      { label: 'Mile',       abbr: 'mi', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
      { label: 'Yard',       abbr: 'yd', toBase: v => v * 0.9144,   fromBase: v => v / 0.9144 },
      { label: 'Foot',       abbr: 'ft', toBase: v => v * 0.3048,   fromBase: v => v / 0.3048 },
      { label: 'Inch',       abbr: 'in', toBase: v => v * 0.0254,   fromBase: v => v / 0.0254 },
    ],
  },
  {
    name: 'Weight',
    icon: 'weight-kilogram',
    units: [
      { label: 'Kilogram',  abbr: 'kg', toBase: v => v,            fromBase: v => v },
      { label: 'Gram',      abbr: 'g',  toBase: v => v / 1000,     fromBase: v => v * 1000 },
      { label: 'Milligram', abbr: 'mg', toBase: v => v / 1e6,      fromBase: v => v * 1e6 },
      { label: 'Pound',     abbr: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
      { label: 'Ounce',     abbr: 'oz', toBase: v => v * 0.028349, fromBase: v => v / 0.028349 },
      { label: 'Ton',       abbr: 't',  toBase: v => v * 1000,     fromBase: v => v / 1000 },
    ],
  },
  {
    name: 'Temperature',
    icon: 'thermometer',
    units: [
      { label: 'Celsius',    abbr: '°C', toBase: v => v,                 fromBase: v => v },
      { label: 'Fahrenheit', abbr: '°F', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
      { label: 'Kelvin',     abbr: 'K',  toBase: v => v - 273.15,        fromBase: v => v + 273.15 },
    ],
  },
  {
    name: 'Currency',
    icon: 'cash-multiple',
    units: [
      { label: 'US Dollar',     abbr: 'USD', toBase: v => v,          fromBase: v => v },
      { label: 'Euro',          abbr: 'EUR', toBase: v => v / 0.92,   fromBase: v => v * 0.92 },
      { label: 'British Pound', abbr: 'GBP', toBase: v => v / 0.79,   fromBase: v => v * 0.79 },
      { label: 'Japanese Yen',  abbr: 'JPY', toBase: v => v / 149.5,  fromBase: v => v * 149.5 },
      { label: 'Indian Rupee',  abbr: 'INR', toBase: v => v / 83.2,   fromBase: v => v * 83.2 },
      { label: 'Chinese Yuan',  abbr: 'CNY', toBase: v => v / 7.24,   fromBase: v => v * 7.24 },
      { label: 'Canadian $',    abbr: 'CAD', toBase: v => v / 1.36,   fromBase: v => v * 1.36 },
      { label: 'Aus Dollar',    abbr: 'AUD', toBase: v => v / 1.53,   fromBase: v => v * 1.53 },
    ],
  },
  {
    name: 'Area',
    icon: 'vector-square',
    units: [
      { label: 'Sq Meter',  abbr: 'm²',  toBase: v => v,              fromBase: v => v },
      { label: 'Sq Km',     abbr: 'km²', toBase: v => v * 1e6,        fromBase: v => v / 1e6 },
      { label: 'Sq Foot',   abbr: 'ft²', toBase: v => v * 0.092903,   fromBase: v => v / 0.092903 },
      { label: 'Sq Inch',   abbr: 'in²', toBase: v => v * 0.00064516, fromBase: v => v / 0.00064516 },
      { label: 'Acre',      abbr: 'ac',  toBase: v => v * 4046.86,    fromBase: v => v / 4046.86 },
      { label: 'Hectare',   abbr: 'ha',  toBase: v => v * 10000,      fromBase: v => v / 10000 },
    ],
  },
  {
    name: 'Speed',
    icon: 'speedometer',
    units: [
      { label: 'm/s',  abbr: 'm/s',  toBase: v => v,           fromBase: v => v },
      { label: 'km/h', abbr: 'km/h', toBase: v => v / 3.6,     fromBase: v => v * 3.6 },
      { label: 'mph',  abbr: 'mph',  toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
      { label: 'Knot', abbr: 'kn',   toBase: v => v * 0.51444, fromBase: v => v / 0.51444 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convertValue(raw: string, from: Unit, to: Unit): string {
  const num = parseFloat(raw);
  if (!raw || isNaN(num)) return '';
  const result = to.fromBase(from.toBase(num));
  if (!isFinite(result)) return '—';
  return parseFloat(result.toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 });
}

function formatInput(raw: string): string {
  if (!raw) return '0';
  const parts = raw.split('.');
  const intFormatted = parseInt(parts[0] || '0', 10).toLocaleString('en-US');
  return parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted;
}

// ─── Numpad key types ─────────────────────────────────────────────────────────

type NumpadKey =
  | { type: 'digit'; value: string }
  | { type: 'dot' }
  | { type: 'del' }
  | { type: 'clear' }
  | { type: 'confirm' };

const NUMPAD_ROWS: NumpadKey[][] = [
  [{ type: 'digit', value: '7' }, { type: 'digit', value: '8' }, { type: 'digit', value: '9' }, { type: 'del' }],
  [{ type: 'digit', value: '4' }, { type: 'digit', value: '5' }, { type: 'digit', value: '6' }, { type: 'clear' }],
  [{ type: 'digit', value: '1' }, { type: 'digit', value: '2' }, { type: 'digit', value: '3' }, { type: 'dot' }],
  [{ type: 'digit', value: '0' }, { type: 'confirm' }],
];

// ─── Unit Picker Modal ────────────────────────────────────────────────────────

interface UnitPickerProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId: string;
  onSelect: (i: number) => void;
  onClose: () => void;
}

function UnitPicker({ visible, title, options, selectedId, onSelect, onClose }: UnitPickerProps) {
  const c = useThemeColors();
  const pickerStyles = useMemo(() => makePickerStyles(c), [c]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <Pressable
              style={[pickerStyles.item, item.id === selectedId && pickerStyles.itemActive]}
              onPress={() => { onSelect(index); onClose(); }}>
              <View style={pickerStyles.itemContent}>
                {!!item.icon && (
                  <MaterialDesignIcons
                    name={item.icon as any}
                    size={22}
                    color={item.id === selectedId ? c.primary : c.onSurfaceVariant}
                  />
                )}
                <Text style={[pickerStyles.itemLabel, item.id === selectedId && pickerStyles.itemLabelActive]}>
                  {item.label}
                </Text>
              </View>
              <Text style={pickerStyles.itemAbbr}>{item.value}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

function makePickerStyles(c: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.surfaceContainerLow,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingBottom: 32,
      maxHeight: '55%',
    },
    title: {
      fontSize: 15,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurface,
      paddingHorizontal: 24,
      paddingBottom: 10,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.outlineVariant,
      alignSelf: 'center', marginBottom: 12,
    },
    item: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24, paddingVertical: 14,
    },
    itemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    itemActive: { backgroundColor: c.surfaceContainerHigh },
    itemLabel: { fontSize: 16, fontFamily: 'Manrope-Regular', color: c.onSurfaceVariant },
    itemLabelActive: { fontFamily: 'Manrope-SemiBold', color: c.primary },
    itemAbbr: { fontSize: 14, fontFamily: 'Manrope-Medium', color: c.outline },
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConvertScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [categoryIndex, setCategoryIndex] = useState(0);
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [inputRaw, setInputRaw] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'category' | 'from' | 'to' | null>(null);

  const category = CATEGORIES[categoryIndex];
  const fromUnit = category.units[fromIndex];
  const toUnit = category.units[toIndex];
  const categoryOptions = useMemo(
    () => CATEGORIES.map(item => ({
      id: item.name,
      label: item.name,
      value: `${item.units.length} units`,
      icon: item.icon,
    })),
    [],
  );
  const unitOptions = useMemo(
    () => category.units.map(unit => ({ id: unit.label, label: unit.label, value: unit.abbr })),
    [category.units],
  );

  const outputValue = useMemo(
    () => convertValue(inputRaw, fromUnit, toUnit),
    [inputRaw, fromUnit, toUnit],
  );

  const selectCategory = useCallback((i: number) => {
    setCategoryIndex(i);
    setFromIndex(0);
    setToIndex(Math.min(1, CATEGORIES[i].units.length - 1));
    setInputRaw('');
  }, []);

  const swap = useCallback(() => {
    setFromIndex(toIndex);
    setToIndex(fromIndex);
    setInputRaw('');
  }, [fromIndex, toIndex]);

  const handleNumpad = useCallback((key: NumpadKey) => {
    setInputRaw(prev => {
      switch (key.type) {
        case 'digit':
          if (prev === '0') return key.value;
          return prev + key.value;
        case 'dot':
          if (prev.includes('.')) return prev;
          return (prev || '0') + '.';
        case 'del':
          return prev.slice(0, -1);
        case 'clear':
          return '';
        default:
          return prev;
      }
    });
  }, []);

  const pickerSelected = pickerTarget === 'category'
    ? categoryOptions[categoryIndex]?.id ?? ''
    : pickerTarget === 'from'
      ? unitOptions[fromIndex]?.id ?? ''
      : unitOptions[toIndex]?.id ?? '';

  const onPickerSelect = useCallback((i: number) => {
    if (pickerTarget === 'category') {
      selectCategory(i);
      return;
    }
    if (pickerTarget === 'from') setFromIndex(i);
    else setToIndex(i);
    setInputRaw('');
  }, [pickerTarget, selectCategory]);

  const pickerOptions = pickerTarget === 'category' ? categoryOptions : unitOptions;
  const pickerTitle = pickerTarget === 'category' ? 'Select conversion type' : 'Select unit';

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      <AppHeader />

      {/* Input display — top of screen like calculator */}
      <View style={styles.displayCard}>
        {!!outputValue && (
          <Text style={styles.bgResult} numberOfLines={1}>
            {outputValue}
          </Text>
        )}
        <Text style={styles.inputText} numberOfLines={1} adjustsFontSizeToFit>
          {formatInput(inputRaw)}
        </Text>
        <Text style={styles.unitAbbr}>{fromUnit.abbr}</Text>
      </View>

      {/* Type / From / To rows */}
      <View style={styles.categoryRow}>
        <Text style={styles.categoryLabel}>Type</Text>
        <Pressable style={styles.categoryPill} onPress={() => setPickerTarget('category')}>
          <View style={styles.categoryPillContent}>
            <MaterialDesignIcons name={category.icon as any} size={20} color={c.primary} />
            <Text style={styles.categoryPillText}>{category.name}</Text>
          </View>
          <MaterialDesignIcons name="chevron-down" size={18} color={c.onSurface} />
        </Pressable>
      </View>

      <View style={styles.unitRow}>
        <Text style={styles.unitRowLabel}>From</Text>
        <Pressable style={styles.unitPill} onPress={() => setPickerTarget('from')}>
          <Text style={styles.unitPillText}>{fromUnit.label}</Text>
          <MaterialDesignIcons name="chevron-down" size={16} color={c.onSurface} />
        </Pressable>
      </View>

      <View style={styles.swapDivider}>
        <View style={styles.swapLine} />
        <Pressable style={styles.swapBtn} onPress={swap}>
          <MaterialDesignIcons name="swap-vertical" size={20} color={c.onSurface} />
        </Pressable>
        <View style={styles.swapLine} />
      </View>

      <View style={styles.unitRow}>
        <Text style={styles.unitRowLabel}>To</Text>
        <Pressable style={styles.unitPill} onPress={() => setPickerTarget('to')}>
          <Text style={styles.unitPillText}>{toUnit.label}</Text>
          <MaterialDesignIcons name="chevron-down" size={16} color={c.onSurface} />
        </Pressable>
      </View>

      {/* Result — fixed height so layout never shifts */}
      <View style={styles.resultRow}>
        <Text style={styles.resultValue} numberOfLines={1} adjustsFontSizeToFit>
          {outputValue || ''}
        </Text>
        {!!outputValue && <Text style={styles.resultAbbr}>{toUnit.abbr}</Text>}
      </View>

      {/* Custom numpad */}
      <View style={styles.numpad}>
        {NUMPAD_ROWS.map((row, ri) => (
          <View key={ri} style={styles.numRow}>
            {row.map((key, ki) => {
              const isConfirm = key.type === 'confirm';
              const isDel = key.type === 'del';
              const isClear = key.type === 'clear';
              return (
                <Pressable
                  key={ki}
                  style={({ pressed }) => [
                    styles.numKey,
                    isConfirm && styles.numKeyConfirm,
                    (isDel || isClear) && styles.numKeyAction,
                    isDel && styles.numKeyDel,
                    pressed && styles.numKeyPressed,
                  ]}
                  onPress={() => handleNumpad(key)}>
                  {isDel ? (
                    <MaterialDesignIcons name="backspace-outline" size={20} color={c.onSecondary} />
                  ) : isConfirm ? (
                    <Text style={styles.numKeyLabelConfirm}>=</Text>
                  ) : (
                    <Text style={[styles.numKeyLabel, isClear && styles.numKeyLabelClear]}>
                      {key.type === 'dot' ? '.' : key.type === 'digit' ? key.value : 'C'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Unit picker bottom sheet */}
      <UnitPicker
        visible={pickerTarget !== null}
        title={pickerTitle}
        options={pickerOptions}
        selectedId={pickerSelected}
        onSelect={onPickerSelect}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GAP = 10;

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    // spacer removed — numpad fills remaining space via flex

    resultRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      paddingHorizontal: 20,
      height: 36,
      marginTop: 4,
    },
    resultValue: {
      flex: 1,
      fontSize: 22,
      fontFamily: 'Manrope-Light',
      color: c.primary,
      textAlign: 'right',
    },
    resultAbbr: {
      fontSize: 13,
      fontFamily: 'Manrope-Medium',
      color: c.onSurfaceVariant,
    },

    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 6,
      marginBottom: 2,
    },
    categoryLabel: {
      fontSize: 14,
      fontFamily: 'Manrope-Regular',
      color: c.onSurfaceVariant,
    },
    categoryPill: {
      minWidth: 174,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: c.outlineVariant,
      backgroundColor: c.surfaceContainerHigh,
    },
    categoryPillContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    categoryPillText: {
      fontSize: 14,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurface,
    },

    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      marginTop: 4,
      marginBottom: 2,
    },
    unitRowLabel: {
      fontSize: 14,
      fontFamily: 'Manrope-Regular',
      color: c.onSurfaceVariant,
    },
    unitPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: c.outlineVariant,
      backgroundColor: c.surfaceContainerHigh,
    },
    unitPillText: {
      fontSize: 14,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurface,
    },

    displayCard: {
      marginHorizontal: 12,
      marginTop: 8,
      backgroundColor: c.background,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
      height: 100,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    bgResult: {
      position: 'absolute',
      bottom: 6,
      left: 16,
      right: 16,
      fontSize: 88,
      fontFamily: 'Manrope-ExtraLight',
      color: c.onSurface,
      opacity: 0.06,
      textAlign: 'right',
    },
    inputText: {
      fontSize: 38,
      fontFamily: 'Manrope-ExtraLight',
      color: c.onSurface,
      textAlign: 'right',
    },
    unitAbbr: {
      fontSize: 13,
      fontFamily: 'Manrope-Medium',
      color: c.onSurfaceVariant,
      textAlign: 'right',
      marginTop: 2,
    },

    swapDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      marginVertical: 2,
    },
    swapLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.outlineVariant,
    },
    swapBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },

    resultAbbr: {
      fontSize: 13,
      fontFamily: 'Manrope-Medium',
      color: c.onSurfaceVariant,
    },

    numpad: {
      flex: 1,
      paddingHorizontal: GAP,
      paddingTop: GAP,
      paddingBottom: GAP,
      gap: 8,
    },
    numRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    numKey: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numKeyConfirm: {
      flex: 3,
      backgroundColor: c.primaryContainer,
    },
    numKeyAction: {
      backgroundColor: c.tertiaryContainer,
    },
    numKeyDel: {
      backgroundColor: c.secondary,
    },
    numKeyPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
    numKeyLabel: {
      fontSize: 22,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    numKeyLabelConfirm: {
      fontSize: 28,
      fontFamily: 'Manrope-Medium',
      color: c.onPrimaryContainer,
    },
    numKeyLabelClear: {
      color: c.tertiary,
    },
  });
}

