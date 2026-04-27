import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Text } from 'react-native';

import { FeedScreen } from '../screens/FeedScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditorialScreen } from '../screens/EditorialScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { useAuthStore } from '../store/authStore';

const Tab = createBottomTabNavigator();

function TabIcon({ label, emoji }: { label: string; emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export function AppNavigator() {
  const { user, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer>
        <AuthScreen />
      </NavigationContainer>
    );
  }

  const isEditor = user.role === 'EDITOR' || user.role === 'ADMIN';

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0a0a0a',
            borderTopColor: 'rgba(255,255,255,0.08)',
            paddingBottom: 4,
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{ tabBarIcon: () => <TabIcon label="Feed" emoji="✦" />, tabBarLabel: 'Feed' }}
        />
        <Tab.Screen
          name="Explore"
          component={ExploreScreen}
          options={{ tabBarIcon: () => <TabIcon label="Explore" emoji="🔍" />, tabBarLabel: 'Explore' }}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={{ tabBarIcon: () => <TabIcon label="Saved" emoji="📌" />, tabBarLabel: 'Saved' }}
        />
        {isEditor && (
          <Tab.Screen
            name="Editorial"
            component={EditorialScreen}
            options={{ tabBarIcon: () => <TabIcon label="Editorial" emoji="📝" />, tabBarLabel: 'Editorial' }}
          />
        )}
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarIcon: () => <TabIcon label="Profile" emoji="👤" />, tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
