import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import type { RootStackParamList, MainTabParamList } from './types';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SoloSwipeScreen from '../screens/SoloSwipeScreen';
import SearchScreen from '../screens/SearchScreen';
import ThisOrThatScreen from '../screens/ThisOrThatScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import LogWatchedScreen from '../screens/LogWatchedScreen';
import GroupScreen from '../screens/GroupScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import LobbyScreen from '../screens/LobbyScreen';
import SubmitMoviesScreen from '../screens/SubmitMoviesScreen';
import GroupSwipeScreen from '../screens/GroupSwipeScreen';
import GroupResultsScreen from '../screens/GroupResultsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const TAB_ICONS: Record<keyof MainTabParamList, { focused: string; default: string }> = {
  Home: { focused: 'home', default: 'home-outline' },
  Solo: { focused: 'film', default: 'film-outline' },
  Group: { focused: 'people', default: 'people-outline' },
  Profile: { focused: 'person', default: 'person-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={(focused ? icons.focused : icons.default) as any}
              size={size}
              color={color}
            />
          );
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Solo" component={SoloSwipeScreen} options={{ tabBarLabel: 'Discover' }} />
      <Tab.Screen name="Group" component={GroupScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="SoloSwipe" component={SoloSwipeScreen} options={{ title: 'Discover Movies' }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search Movies' }} />
            <Stack.Screen name="ThisOrThat" component={ThisOrThatScreen} options={{ title: 'This or That' }} />
            <Stack.Screen name="MovieDetail" component={MovieDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="LogWatched" component={LogWatchedScreen} options={{ title: 'Log Movie' }} />
            <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: 'Create Room' }} />
            <Stack.Screen name="JoinRoom" component={JoinRoomScreen} options={{ title: 'Join Room' }} />
            <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Lobby' }} />
            <Stack.Screen name="SubmitMovies" component={SubmitMoviesScreen} options={{ title: 'Add Movies' }} />
            <Stack.Screen name="GroupSwipe" component={GroupSwipeScreen} options={{ title: 'Group Vote' }} />
            <Stack.Screen name="GroupResults" component={GroupResultsScreen} options={{ title: 'Results' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
