import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SoloSwipeScreen } from '../screens/SoloSwipeScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ThisOrThatScreen } from '../screens/ThisOrThatScreen';
import { MovieDetailScreen } from '../screens/MovieDetailScreen';
import { LogWatchedScreen } from '../screens/LogWatchedScreen';
import { CreateRoomScreen } from '../screens/CreateRoomScreen';
import { JoinRoomScreen } from '../screens/JoinRoomScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { SubmitMoviesScreen } from '../screens/SubmitMoviesScreen';
import { GroupSwipeScreen } from '../screens/GroupSwipeScreen';
import { GroupResultsScreen } from '../screens/GroupResultsScreen';
import { OnboardingScreen, hasSeenOnboarding } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { FriendProfileScreen } from '../screens/FriendProfileScreen';
import { AIScreen } from '../screens/AIScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { FriendActivityScreen } from '../screens/FriendActivityScreen';
import { View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function withErrorBoundary<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function BoundaryWrapped(props: P) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Home': iconName = 'home'; break;
            case 'Discover': iconName = 'compass'; break;
            case 'AI': iconName = 'sparkles'; break;
            case 'Group': iconName = 'people'; break;
            case 'Profile': iconName = 'person'; break;
          }
          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 6,
        },
        ...screenOptions,
      })}
    >
      <Tab.Screen name="Home" component={withErrorBoundary(HomeScreen)} />
      <Tab.Screen name="Discover" component={withErrorBoundary(SoloSwipeScreen)} />
      <Tab.Screen name="AI" component={withErrorBoundary(AIScreen)} options={{ title: 'ReelRank AI' }} />
      <Tab.Screen name="Group" component={withErrorBoundary(GroupScreen)} />
      <Tab.Screen name="Profile" component={withErrorBoundary(ProfileScreen)} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => setShowOnboarding(!seen));
  }, []);

  useEffect(() => {
    if (!loading && showOnboarding !== null) {
      setAppReady(true);
    }
  }, [loading, showOnboarding]);

  const onLayoutReady = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  if (!user && showOnboarding) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutReady}>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </View>
    );
  }

  return (
    <NavigationContainer onReady={onLayoutReady}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="SoloSwipe" component={SoloSwipeScreen} options={{ title: 'Discover', headerBackTitle: 'Home' }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search Movies', headerBackTitle: 'Home' }} />
            <Stack.Screen name="ThisOrThat" component={ThisOrThatScreen} options={{ title: 'This or That', headerBackTitle: 'Home' }} />
            <Stack.Screen name="MovieDetail" component={MovieDetailScreen} options={{ title: 'Movie Details', headerBackTitle: 'Back' }} />
            <Stack.Screen name="LogWatched" component={LogWatchedScreen} options={{ title: 'Log Watched', headerBackTitle: 'Back' }} />
            <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: 'Create Room', headerBackTitle: 'Group' }} />
            <Stack.Screen name="JoinRoom" component={JoinRoomScreen} options={{ title: 'Join Room', headerBackTitle: 'Group' }} />
            <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Lobby', headerBackTitle: 'Group' }} />
            <Stack.Screen name="SubmitMovies" component={SubmitMoviesScreen} options={{ title: 'Submit Movies', headerBackTitle: 'Lobby' }} />
            <Stack.Screen name="GroupSwipe" component={GroupSwipeScreen} options={{ title: 'Group Swipe', headerBackTitle: 'Back' }} />
            <Stack.Screen name="GroupResults" component={GroupResultsScreen} options={{ title: 'Results', headerBackTitle: 'Back' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerBackTitle: 'Profile' }} />
            <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends', headerBackTitle: 'Profile' }} />
            <Stack.Screen name="FriendProfile" component={FriendProfileScreen} options={{ title: 'Profile', headerBackTitle: 'Friends' }} />
            <Stack.Screen name="AI" component={AIScreen} options={{ title: 'ReelRank AI', headerBackTitle: 'Home' }} />
            <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Your Stats', headerBackTitle: 'Profile' }} />
            <Stack.Screen name="FriendActivity" component={FriendActivityScreen} options={{ title: 'Friend Activity', headerBackTitle: 'Home' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
