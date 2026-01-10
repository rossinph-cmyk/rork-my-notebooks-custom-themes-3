import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { NotebookScreen } from './src/screens/NotebookScreen';
import { RootStackParamList } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { useOnboardingStore } from './contexts/OnboardingStore';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import OnboardingSlideshow from './components/OnboardingSlideshow';
import * as ImagePicker from 'expo-image-picker';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const hasAcceptedPrivacyPolicy = useOnboardingStore((s) => s.hasAcceptedPrivacyPolicy);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const acceptPrivacyPolicy = useOnboardingStore((s) => s.acceptPrivacyPolicy);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Media library permission denied');
      }
    };

    if (hasAcceptedPrivacyPolicy && hasCompletedOnboarding) {
      requestPermissions();
    }
  }, [hasAcceptedPrivacyPolicy, hasCompletedOnboarding]);

  const handleAcceptPrivacy = () => {
    acceptPrivacyPolicy();
    setShowOnboarding(true);
  };

  const handleCompleteOnboarding = () => {
    completeOnboarding();
    setShowOnboarding(false);
  };

  if (!hasAcceptedPrivacyPolicy) {
    return (
      <SafeAreaProvider>
        <PrivacyPolicyModal visible={true} onAccept={handleAcceptPrivacy} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (!hasCompletedOnboarding || showOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingSlideshow visible={true} onComplete={handleCompleteOnboarding} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Notebook" component={NotebookScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
