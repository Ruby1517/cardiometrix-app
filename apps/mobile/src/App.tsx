import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  RootStackParamList,
  RootTabParamList,
  AddDataStackParamList,
  HomeStackParamList,
  SettingsStackParamList,
  AuthStackParamList,
} from './utils/navigation';
import { VitalsListScreen } from './screens/VitalsListScreen';
import { AddVitalsScreen } from './screens/AddVitalsScreen';
import { AddLabsScreen } from './screens/AddLabsScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { HealthOverviewScreen } from './screens/HealthOverviewScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RemindersScreen } from './screens/RemindersScreen';
import { DataImportScreen } from './screens/DataImportScreen';
import { CareTeamScreen } from './screens/CareTeamScreen';
import { useAuthStore } from './store/auth';
import { initOfflineQueue, syncPendingQueue } from './store/offlineQueue';
import { subscribeToNetwork } from './utils/network';
import { registerForPushNotificationsAsync } from './utils/pushNotifications';
import { theme } from './theme';
import { runDailyHealthSyncIfNeeded } from './utils/health/autoDailySync';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();
const AddDataStack = createNativeStackNavigator<AddDataStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const defaultHeaderOptions = {
  title: 'CardioMetrix',
  headerStyle: { backgroundColor: theme.colors.primary },
  headerTitleStyle: { color: '#ffffff', fontWeight: '700' as const },
  headerTintColor: '#ffffff',
};

function AddDataStackScreen() {
  return (
    <AddDataStack.Navigator screenOptions={defaultHeaderOptions}>
      <AddDataStack.Screen name="VitalsList" component={VitalsListScreen} options={{ title: 'Add Data' }} />
      <AddDataStack.Screen name="AddVitals" component={AddVitalsScreen} options={{ title: 'Add Vitals' }} />
      <AddDataStack.Screen name="AddLabs" component={AddLabsScreen} options={{ title: 'Add Labs' }} />
      <AddDataStack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Goals' }} />
      <AddDataStack.Screen name="DataImport" component={DataImportScreen} options={{ title: 'Device Import' }} />
    </AddDataStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={defaultHeaderOptions}>
      <HomeStack.Screen name="HealthOverview" component={HealthOverviewScreen} options={{ title: 'Home' }} />
    </HomeStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={defaultHeaderOptions}>
      <SettingsStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Reminders" component={RemindersScreen} options={{ title: 'Notifications' }} />
      <SettingsStack.Screen name="DataImport" component={DataImportScreen} options={{ title: 'Device Import' }} />
      <SettingsStack.Screen name="CareTeam" component={CareTeamScreen} options={{ title: 'Care Team' }} />
      <SettingsStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
    </SettingsStack.Navigator>
  );
}

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={defaultHeaderOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'CardioMetrix' }} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={HomeStackScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="AddData" component={AddDataStackScreen} options={{ title: 'Add Data' }} />
      <Tabs.Screen name="Settings" component={SettingsStackScreen} options={{ title: 'Settings' }} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const user = useAuthStore((state) => state.user);
  const syncingRef = useRef(false);

  useEffect(() => {
    restoreSession().catch(() => undefined);
  }, [restoreSession]);

  useEffect(() => {
    initOfflineQueue().catch(() => undefined);
    const unsubscribe = subscribeToNetwork((online) => {
      if (online) {
        syncPendingQueue().catch(() => undefined);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user || syncingRef.current) return;
    syncingRef.current = true;
    runDailyHealthSyncIfNeeded()
      .catch(() => undefined)
      .finally(() => {
        syncingRef.current = false;
      });
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !user || syncingRef.current) return;
      syncingRef.current = true;
      runDailyHealthSyncIfNeeded()
        .catch(() => undefined)
        .finally(() => {
          syncingRef.current = false;
        });
    });
    return () => sub.remove();
  }, [user]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? <Stack.Screen name="Tabs" component={TabNavigator} /> : <Stack.Screen name="Auth" component={AuthStackScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
