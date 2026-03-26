import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

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
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Home': iconName = 'home'; break;
            case 'Discover': iconName = 'compass'; break;
            case 'Group': iconName = 'people'; break;
            case 'Profile': iconName = 'person'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        ...screenOptions,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={SoloSwipeScreen} />
      <Tab.Screen name="Group" component={GroupScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => setShowOnboarding(!seen));
  }, []);

  if (loading || showOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user && showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <NavigationContainer>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
