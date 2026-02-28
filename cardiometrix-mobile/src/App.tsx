import 'react-native-gesture-handler';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  RootStackParamList,
  RootTabParamList,
  VitalsStackParamList,
  SymptomsStackParamList,
  MedsStackParamList,
  InsightsStackParamList,
  TimelineStackParamList,
  ProfileStackParamList,
  AuthStackParamList,
} from './utils/navigation';
import { VitalsListScreen } from './screens/VitalsListScreen';
import { AddVitalsScreen } from './screens/AddVitalsScreen';
import { AddLabsScreen } from './screens/AddLabsScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { SymptomsHistoryScreen } from './screens/SymptomsHistoryScreen';
import { SymptomCheckinScreen } from './screens/SymptomCheckinScreen';
import { MedListScreen } from './screens/MedListScreen';
import { MedFormScreen } from './screens/MedFormScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { HealthOverviewScreen } from './screens/HealthOverviewScreen';
import { SummaryDetailsScreen } from './screens/SummaryDetailsScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RemindersScreen } from './screens/RemindersScreen';
import { DataImportScreen } from './screens/DataImportScreen';
import { CareTeamScreen } from './screens/CareTeamScreen';
import { useAuthStore } from './store/auth';
import { initOfflineQueue, syncPendingQueue } from './store/offlineQueue';
import { subscribeToNetwork } from './utils/network';
import { registerForPushNotificationsAsync } from './utils/pushNotifications';
import { fetchReminders } from './api/reminders';
import { scheduleReminders } from './utils/reminders';
import { theme } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();
const VitalsStack = createNativeStackNavigator<VitalsStackParamList>();
const SymptomsStack = createNativeStackNavigator<SymptomsStackParamList>();
const MedsStack = createNativeStackNavigator<MedsStackParamList>();
const InsightsStack = createNativeStackNavigator<InsightsStackParamList>();
const TimelineStack = createNativeStackNavigator<TimelineStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      <Text style={{ color: theme.colors.primaryDark, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function HeaderRight({
  showSettings,
  onSettings,
}: {
  showSettings: boolean;
  onSettings: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ marginRight: 12 }}>
          <HeaderButton
            label="Login"
            onPress={() => {
              navigation.navigate('Auth' as never, { screen: 'Login', params: { mode: 'login' } } as never);
            }}
          />
        </View>
        <HeaderButton
          label="Sign up"
          onPress={() => {
            navigation.navigate('Auth' as never, { screen: 'Login', params: { mode: 'register' } } as never);
          }}
        />
      </View>
    );
  }

  if (!showSettings) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          onPress={() => setMenuOpen((open) => !open)}
          style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ color: theme.colors.primaryDark, fontWeight: '700' }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>
            {user.name?.split(' ')[0] || 'Account'}
          </Text>
        </TouchableOpacity>
        {menuOpen ? (
          <View
            style={{
              position: 'absolute',
              top: 36,
              right: 0,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.input,
              borderWidth: 1,
              borderColor: theme.colors.border,
              paddingVertical: 6,
              minWidth: 140,
              zIndex: 10,
              ...theme.shadow.card,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                onSettings();
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ color: theme.colors.text }}>Profile & Settings</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function buildHeaderOptions({
  showSettings,
  onSettings,
}: {
  showSettings: boolean;
  onSettings: () => void;
}) {
  return {
    title: 'CardioMetrix',
    headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0 },
    headerTitleStyle: { color: '#ffffff', fontWeight: '700' },
    headerTintColor: '#ffffff',
    headerRight: () => <HeaderRight showSettings={showSettings} onSettings={onSettings} />,
  };
}

function VitalsStackScreen() {
  return (
    <VitalsStack.Navigator
      screenOptions={({ navigation }) =>
        buildHeaderOptions({
          showSettings: true,
          onSettings: () => navigation.navigate('Profile'),
        })
      }
    >
      <VitalsStack.Screen name="VitalsList" component={VitalsListScreen} />
      <VitalsStack.Screen name="AddVitals" component={AddVitalsScreen} />
      <VitalsStack.Screen name="AddLabs" component={AddLabsScreen} />
      <VitalsStack.Screen name="Goals" component={GoalsScreen} />
    </VitalsStack.Navigator>
  );
}

function SymptomsStackScreen() {
  return (
    <SymptomsStack.Navigator
      screenOptions={({ navigation }) =>
        buildHeaderOptions({
          showSettings: true,
          onSettings: () => navigation.navigate('Profile'),
        })
      }
    >
      <SymptomsStack.Screen name="SymptomsHistory" component={SymptomsHistoryScreen} />
      <SymptomsStack.Screen name="SymptomCheckin" component={SymptomCheckinScreen} />
    </SymptomsStack.Navigator>
  );
}

function MedsStackScreen() {
  return (
    <MedsStack.Navigator
      screenOptions={({ navigation }) =>
        buildHeaderOptions({
          showSettings: true,
          onSettings: () => navigation.navigate('Profile'),
        })
      }
    >
      <MedsStack.Screen name="MedsList" component={MedListScreen} />
      <MedsStack.Screen name="MedForm" component={MedFormScreen} />
    </MedsStack.Navigator>
  );
}

function InsightsStackScreen() {
  return (
    <InsightsStack.Navigator
      screenOptions={({ navigation }) =>
        buildHeaderOptions({ showSettings: true, onSettings: () => navigation.navigate('Profile') })
      }
    >
      <InsightsStack.Screen name="HealthOverview" component={HealthOverviewScreen} />
      <InsightsStack.Screen name="InsightsDetail" component={InsightsScreen} />
      <InsightsStack.Screen name="SummaryDetails" component={SummaryDetailsScreen} />
    </InsightsStack.Navigator>
  );
}

function TimelineStackScreen() {
  return (
    <TimelineStack.Navigator
      screenOptions={({ navigation }) =>
        buildHeaderOptions({ showSettings: true, onSettings: () => navigation.navigate('Profile') })
      }
    >
      <TimelineStack.Screen name="TimelineHome" component={TimelineScreen} />
    </TimelineStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={() => buildHeaderOptions({ showSettings: false, onSettings: () => undefined })}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Login" component={LoginScreen} />
      <ProfileStack.Screen name="Reminders" component={RemindersScreen} />
      <ProfileStack.Screen name="DataImport" component={DataImportScreen} />
      <ProfileStack.Screen name="CareTeam" component={CareTeamScreen} />
    </ProfileStack.Navigator>
  );
}

function AuthStackScreen() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary, shadowOpacity: 0 },
        headerTitleStyle: { color: '#ffffff', fontWeight: '700' },
        headerTintColor: '#ffffff',
        title: 'CardioMetrix',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Vitals" component={VitalsStackScreen} />
      <Tabs.Screen name="Symptoms" component={SymptomsStackScreen} />
      <Tabs.Screen name="Meds" component={MedsStackScreen} />
      <Tabs.Screen name="Insights" component={InsightsStackScreen} />
      <Tabs.Screen name="Timeline" component={TimelineStackScreen} />
      <Tabs.Screen name="Profile" component={ProfileStackScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const user = useAuthStore((state) => state.user);

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
    if (!user) return;
    fetchReminders()
      .then((reminders) => scheduleReminders(reminders))
      .catch(() => undefined);
  }, [user]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="Auth" component={AuthStackScreen} options={{ headerShown: false }} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
