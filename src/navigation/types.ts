import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  Player: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
};

export type RootStackNavigation = NativeStackNavigationProp<RootStackParamList>;
export type HomeTabNavigation = BottomTabNavigationProp<
  MainTabParamList,
  'Home'
>;
export type PlayerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Player'
>;
