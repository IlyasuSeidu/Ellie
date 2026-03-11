/**
 * AuthNavigator
 *
 * Authentication flow stack.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: { email?: string } | undefined;
  EmailVerification: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
};
