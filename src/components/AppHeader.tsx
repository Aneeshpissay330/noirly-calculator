import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { Colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable hitSlop={8} onPress={() => navigation.navigate('History')}>
        <MaterialDesignIcons name="history" size={26} color={c.onSurfaceVariant} />
      </Pressable>
      <Pressable hitSlop={8} onPress={() => navigation.navigate('Settings')}>
        <MaterialDesignIcons name="cog-outline" size={26} color={c.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 16,
    },
  });
}
