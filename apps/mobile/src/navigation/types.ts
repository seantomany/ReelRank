import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Solo: undefined;
  Group: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  SoloSwipe: undefined;
  Search: undefined;
  ThisOrThat: undefined;
  MovieDetail: { movieId: number };
  LogWatched: { movieId: number; movieTitle: string };
  CreateRoom: undefined;
  JoinRoom: undefined;
  Lobby: { roomCode: string };
  SubmitMovies: { roomCode: string };
  GroupSwipe: { roomCode: string };
  GroupResults: { roomCode: string };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
