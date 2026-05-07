import React, { useMemo } from 'react';
import {
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme, ThemeMode } from '../store/settingsSlice';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(s => s.settings.theme);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={26} color={c.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Appearance */}
      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialDesignIcons name="weather-night" size={22} color={c.onSurfaceVariant} />
          <Text style={styles.cardRowLabel}>Theme</Text>
        </View>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              style={[styles.segment, theme === opt.value && styles.segmentActive]}
              onPress={() => dispatch(setTheme(opt.value))}>
              <Text style={[styles.segmentText, theme === opt.value && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Privacy */}
      <Text style={styles.sectionLabel}>LEGAL</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.cardRowPressable}
          onPress={() => Linking.openURL('https://example.com/privacy')}>
          <MaterialDesignIcons name="shield-check-outline" size={22} color={c.onSurfaceVariant} />
          <Text style={styles.cardRowLabel}>Privacy Policy</Text>
          <MaterialDesignIcons name="chevron-right" size={20} color={c.outlineVariant} />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: 28,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurface,
    },
    headerSpacer: { width: 26 },

    sectionLabel: {
      fontSize: 11,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurfaceVariant,
      letterSpacing: 1.4,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    },

    card: {
      marginHorizontal: 14,
      backgroundColor: c.surfaceContainerHigh,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardRowPressable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardRowLabel: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },

    segmented: {
      flexDirection: 'row',
      backgroundColor: c.surfaceContainerHighest,
      borderRadius: 12,
      padding: 3,
      gap: 2,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: c.primaryContainer,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: 'Manrope-SemiBold',
      color: c.onSurfaceVariant,
    },
    segmentTextActive: {
      color: c.onPrimaryContainer,
    },
  });
}

