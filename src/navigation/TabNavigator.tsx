import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useThemeColors } from '../theme/ThemeContext';
import CalcScreen from '../screens/CalcScreen';
import ScientificScreen from '../screens/ScientificScreen';
import ConvertScreen from '../screens/ConvertScreen';
import GraphScreen from '../screens/GraphScreen';
import ProgrammerScreen from '../screens/ProgrammerScreen';

export type TabParamList = {
  Calc: undefined;
  Scientific: undefined;
  Convert: undefined;
  Graph: undefined;
  Prog: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICON: Record<keyof TabParamList, string> = {
  Calc: 'calculator-variant',
  Scientific: 'flask',
  Convert: 'swap-horizontal',
  Graph: 'chart-bell-curve',
  Prog: 'code-braces',
};

export default function TabNavigator() {
  const colors = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialDesignIcons
            name={TAB_ICON[route.name as keyof TabParamList] as any}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLow,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Manrope-Medium',
          fontSize: 11,
        },
      })}>
      <Tab.Screen name="Calc" component={CalcScreen} />
      <Tab.Screen name="Scientific" component={ScientificScreen} />
      <Tab.Screen name="Convert" component={ConvertScreen} />
      <Tab.Screen name="Graph" component={GraphScreen} />
      <Tab.Screen name="Prog" component={ProgrammerScreen} />
    </Tab.Navigator>
  );
}
