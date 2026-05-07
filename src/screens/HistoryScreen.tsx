import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
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
import { clearHistory, removeEntry, HistoryEntry } from '../store/historySlice';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function HistoryItem({
  item,
  onDelete,
}: {
  item: HistoryEntry;
  onDelete: (id: string) => void;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.expression} numberOfLines={1}>
          {item.expression}
        </Text>
        <Text style={styles.result}>= {item.result}</Text>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
      </View>
      <Pressable
        style={styles.deleteBtn}
        hitSlop={8}
        onPress={() => onDelete(item.id)}>
        <MaterialDesignIcons name="close" size={18} color={c.outline} />
      </Pressable>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(state => state.history.entries);
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const handleDelete = (id: string) => dispatch(removeEntry(id));

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Delete all calculation history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => dispatch(clearHistory()) },
    ]);
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={c.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.background} />

      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={26} color={c.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
        {entries.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearBtn}>Clear all</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <MaterialDesignIcons name="history" size={64} color={c.outlineVariant} />
          <Text style={styles.emptyText}>No calculations yet</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HistoryItem item={item} onDelete={handleDelete} />
          )}
        />
      )}
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
    clearBtn: {
      fontSize: 14,
      fontFamily: 'Manrope-Medium',
      color: c.error,
    },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: {
      fontSize: 16,
      fontFamily: 'Manrope-Regular',
      color: c.onSurfaceVariant,
    },
    list: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerLow,
      borderRadius: 16,
      padding: 16,
    },
    itemContent: { flex: 1 },
    expression: {
      fontSize: 14,
      fontFamily: 'Manrope-Regular',
      color: c.onSurfaceVariant,
      marginBottom: 2,
    },
    result: {
      fontSize: 22,
      fontFamily: 'Manrope-Medium',
      color: c.onSurface,
    },
    timestamp: {
      fontSize: 12,
      fontFamily: 'Manrope-Regular',
      color: c.outline,
      marginTop: 4,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
  });
}
