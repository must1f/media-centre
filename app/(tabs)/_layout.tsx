import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { FontWeight } from '@/constants/tokens';

export default function TabLayout() {
  const { colorScheme, colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: 'transparent',
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 100}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(26, 25, 25, 0.65)'
                      : 'rgba(255, 255, 255, 0.70)',
                },
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'house.fill' : 'house'}
              size={22}
              tintColor={color}
              weight={focused ? 'bold' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        listeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name="magnifyingglass"
              size={22}
              tintColor={color}
              weight={focused ? 'heavy' : 'medium'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        listeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'rectangle.stack.fill' : 'rectangle.stack'}
              size={22}
              tintColor={color}
              weight={focused ? 'bold' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movie"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="anime"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'person.crop.circle.fill' : 'person.crop.circle'}
              size={22}
              tintColor={color}
              weight={focused ? 'bold' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
