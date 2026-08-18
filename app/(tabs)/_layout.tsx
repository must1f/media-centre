import React from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

// Stitch CineVault Modern — active tab color (Stitch "primary": #ffb4aa)
const STITCH_PRIMARY = '#ffb4aa';
const STITCH_INACTIVE = '#888885';

export default function TabLayout() {
  const { colorScheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: STITCH_PRIMARY,
        tabBarInactiveTintColor: STITCH_INACTIVE,
        tabBarStyle: {
          position: 'absolute',
          // Stitch: fixed bottom-6 (24px) left-1/2 -translate-x-1/2 w-[90%] max-w-md
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: '5%',
          right: '5%',
          height: 64,
          borderRadius: 32,
          borderWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 32,
          paddingTop: 0,
          paddingBottom: 0,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
        },
        tabBarBackground: () => (
          // Stitch: .glass { background: rgba(32,31,31,0.7); backdrop-filter: blur(40px); }
          // shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 80 : 100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(32, 31, 31, 0.70)',
                },
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: {
          // Stitch: text-[10px] font-label-sm uppercase tracking-wider
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarItemStyle: {
          height: 64,
          paddingVertical: 0,
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
              size={24}
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
              size={24}
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
              size={24}
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
              size={24}
              tintColor={color}
              weight={focused ? 'bold' : 'regular'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
