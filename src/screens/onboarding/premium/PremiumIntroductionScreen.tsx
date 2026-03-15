/**
 * PremiumIntroductionScreen Component
 *
 * Conversational chatbot-style introduction screen (Step 2 of 10)
 * Features progressive disclosure, typing indicators, and engaging animations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';

// Generate unique ID for messages (React Native compatible)
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { ChatMessage, Message } from '@/components/onboarding/premium/ChatMessage';
import { TypingIndicator } from '@/components/onboarding/premium/TypingIndicator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { ChatInput, QuickReply } from '@/components/onboarding/premium/ChatInput';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Introduction'>;

// Validation schema using Zod
const introductionSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z\s'-]+$/),
  occupation: z.string().min(1),
  company: z.string().min(1),
  country: z.string().min(2).max(100),
});

type IntroductionFormData = z.infer<typeof introductionSchema>;

// Conversation steps state machine
enum ConversationStep {
  WELCOME = 'welcome',
  ASK_NAME = 'askName',
  WAIT_NAME = 'waitName',
  ASK_OCCUPATION = 'askOccupation',
  WAIT_OCCUPATION = 'waitOccupation',
  ASK_COMPANY = 'askCompany',
  WAIT_COMPANY = 'waitCompany',
  ASK_COUNTRY = 'askCountry',
  WAIT_COUNTRY = 'waitCountry',
  COMPLETE = 'complete',
}

export interface PremiumIntroductionScreenProps {
  onContinue?: (data: IntroductionFormData) => void;
  testID?: string;
}

export const PremiumIntroductionScreen: React.FC<PremiumIntroductionScreenProps> = ({
  onContinue,
  testID = 'premium-introduction-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();
  const flatListRef = useRef<FlatList>(null);

  // Conversation state
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.WELCOME);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Form data
  const [formData, setFormData] = useState<{
    name: string;
    occupation: string;
    company: string;
    country: string;
  }>({
    name: data.name || '',
    occupation: data.occupation || '',
    company: data.company || '',
    country: data.country || '',
  });

  // Input state
  const [currentInput, setCurrentInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);

  const hasBotQuestion = useCallback(
    (questionKey: string): boolean =>
      messages.some(
        (message) => message.type === 'bot' && message.metadata?.questionKey === questionKey
      ),
    [messages]
  );

  // Check for reduced motion preference
  useEffect(() => {
    const checkReducedMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReducedMotion(isReduceMotionEnabled);
    };
    checkReducedMotion();
  }, []);

  // Add bot message with typing indicator
  const addBotMessage = useCallback(
    (content: string, typingDuration: number, questionKey?: string) => {
      setIsTyping(true);

      // Light haptic feedback
      if (!reducedMotion) {
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
          source: 'PremiumIntroductionScreen.addBotMessage',
        });
      }

      setTimeout(() => {
        setIsTyping(false);

        const newMessage: Message = {
          id: generateId(),
          type: 'bot',
          content,
          timestamp: Date.now(),
          metadata: questionKey ? { questionKey } : undefined,
        };

        setMessages((prev) => [...prev, newMessage]);

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: !reducedMotion });
        }, 100);
      }, typingDuration);
    },
    [reducedMotion]
  );

  // Add user message
  const addUserMessage = useCallback(
    (content: string, metadata?: Message['metadata']) => {
      const newMessage: Message = {
        id: generateId(),
        type: 'user',
        content,
        timestamp: Date.now(),
        metadata,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Medium haptic feedback
      if (!reducedMotion) {
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
          source: 'PremiumIntroductionScreen.addUserMessage',
        });
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: !reducedMotion });
      }, 100);
    },
    [reducedMotion]
  );

  // Validate name
  const validateName = useCallback(
    (input: string): boolean => {
      const value = input.trim();
      if (value.length < 2) {
        setError(t('intro.errors.nameTooShort'));
        return false;
      }
      if (value.length > 50) {
        setError(t('intro.errors.nameTooLong'));
        return false;
      }
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        setError(t('intro.errors.nameInvalidChars'));
        return false;
      }
      setError(null);
      return true;
    },
    [t]
  );

  // Validate occupation
  const validateOccupation = useCallback(
    (input: string): boolean => {
      if (input.trim().length < 1) {
        setError(t('intro.errors.occupationRequired'));
        return false;
      }
      setError(null);
      return true;
    },
    [t]
  );

  // Validate company
  const validateCompany = useCallback(
    (input: string): boolean => {
      if (input.trim().length < 1) {
        setError(t('intro.errors.companyRequired'));
        return false;
      }
      setError(null);
      return true;
    },
    [t]
  );

  // Validate country
  const validateCountry = useCallback(
    (input: string): boolean => {
      const value = input.trim();
      if (value.length < 2) {
        setError(t('intro.errors.countryTooShort'));
        return false;
      }
      if (value.length > 100) {
        setError(t('intro.errors.countryTooLong'));
        return false;
      }
      setError(null);
      return true;
    },
    [t]
  );

  // Advance conversation based on current step
  const advanceConversation = useCallback(() => {
    switch (currentStep) {
      case ConversationStep.WELCOME:
        addBotMessage(t('intro.welcome'), 1000, 'welcome');
        setTimeout(() => {
          setCurrentStep(ConversationStep.ASK_NAME);
        }, 2500);
        break;

      case ConversationStep.ASK_NAME: {
        const nameQuestionExists = hasBotQuestion('askName');

        if (!nameQuestionExists) {
          addBotMessage(t('intro.askName'), 800, 'askName');
          setTimeout(() => {
            setCurrentStep(ConversationStep.WAIT_NAME);
          }, 1300);
        } else {
          // Question already exists, go straight to waiting for input
          setCurrentStep(ConversationStep.WAIT_NAME);
        }
        break;
      }

      case ConversationStep.WAIT_NAME:
        // Input is handled by handleSubmit, not automatically
        break;

      case ConversationStep.ASK_OCCUPATION: {
        const occupationQuestionExists = hasBotQuestion('askOccupation');

        if (!occupationQuestionExists) {
          addBotMessage(t('intro.askOccupation', { name: formData.name }), 900, 'askOccupation');
          setTimeout(() => {
            setCurrentStep(ConversationStep.WAIT_OCCUPATION);
          }, 1400);
        } else {
          // Question already exists, go straight to waiting for input
          setCurrentStep(ConversationStep.WAIT_OCCUPATION);
        }
        break;
      }

      case ConversationStep.WAIT_OCCUPATION:
        // Input is handled by handleSubmit, not automatically
        break;

      case ConversationStep.ASK_COMPANY: {
        const companyQuestionExists = hasBotQuestion('askCompany');

        if (!companyQuestionExists) {
          addBotMessage(t('intro.askCompany'), 1000, 'askCompany');
          setTimeout(() => {
            setCurrentStep(ConversationStep.WAIT_COMPANY);
          }, 1500);
        } else {
          // Question already exists, go straight to waiting for input
          setCurrentStep(ConversationStep.WAIT_COMPANY);
        }
        break;
      }

      case ConversationStep.WAIT_COMPANY:
        // Input is handled by handleSubmit, not automatically
        break;

      case ConversationStep.ASK_COUNTRY: {
        const countryQuestionExists = hasBotQuestion('askCountry');

        if (!countryQuestionExists) {
          addBotMessage(t('intro.askCountry'), 900, 'askCountry');
          setTimeout(() => {
            setCurrentStep(ConversationStep.WAIT_COUNTRY);
          }, 1400);
        } else {
          // Question already exists, go straight to waiting for input
          setCurrentStep(ConversationStep.WAIT_COUNTRY);
        }
        break;
      }

      case ConversationStep.WAIT_COUNTRY:
        // Input is handled by handleSubmit, not automatically
        break;

      case ConversationStep.COMPLETE: {
        const completionMessageExists = hasBotQuestion('complete');

        if (!completionMessageExists) {
          addBotMessage(t('intro.allSet', { name: formData.name }), 1000, 'complete');

          // Save to context and navigate after delay (allow time to read final message)
          setTimeout(() => {
            updateData({
              name: formData.name,
              occupation: formData.occupation,
              company: formData.company,
              country: formData.country,
            });

            // Light success haptic
            if (!reducedMotion) {
              void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
                source: 'PremiumIntroductionScreen.quickReply',
              });
            }

            // Call optional callback or navigate
            if (onContinue && formData.country) {
              onContinue({
                name: formData.name,
                occupation: formData.occupation,
                company: formData.company,
                country: formData.country,
              });
            } else {
              goToNextScreen(navigation, 'Introduction');
            }
          }, 4000); // Increased from 2000ms to 4000ms to allow reading the final message
        }
        break;
      }
    }
  }, [
    currentStep,
    formData,
    hasBotQuestion,
    addBotMessage,
    updateData,
    reducedMotion,
    onContinue,
    navigation,
    t,
  ]);

  // Start conversation on mount
  useEffect(() => {
    advanceConversation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance conversation when step changes (except on mount)
  useEffect(() => {
    if (currentStep !== ConversationStep.WELCOME) {
      advanceConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, advanceConversation]);

  // Auto-scroll when input field appears
  useEffect(() => {
    const shouldShowInput =
      currentStep === ConversationStep.WAIT_NAME ||
      currentStep === ConversationStep.WAIT_OCCUPATION ||
      currentStep === ConversationStep.WAIT_COMPANY ||
      currentStep === ConversationStep.WAIT_COUNTRY;

    if (shouldShowInput) {
      // Delay to ensure input field has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: !reducedMotion });
      }, 300);
    }
  }, [currentStep, reducedMotion]);

  // Handle input submission
  const handleSubmit = useCallback(() => {
    if (currentStep === ConversationStep.WAIT_NAME) {
      if (!validateName(currentInput)) {
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
          source: 'PremiumIntroductionScreen.validation.name',
        });
        return;
      }
      // Process name
      addUserMessage(currentInput);
      setFormData((prev) => ({ ...prev, name: currentInput }));
      setCurrentInput('');
      setError(null);
      setCurrentStep(ConversationStep.ASK_OCCUPATION);
    } else if (currentStep === ConversationStep.WAIT_OCCUPATION) {
      if (!validateOccupation(currentInput)) {
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
          source: 'PremiumIntroductionScreen.validation.occupation',
        });
        return;
      }
      // Process occupation
      addUserMessage(currentInput);
      setFormData((prev) => ({ ...prev, occupation: currentInput }));
      setCurrentInput('');
      setError(null);
      setCurrentStep(ConversationStep.ASK_COMPANY);
    } else if (currentStep === ConversationStep.WAIT_COMPANY) {
      if (!validateCompany(currentInput)) {
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
          source: 'PremiumIntroductionScreen.validation.company',
        });
        return;
      }
      // Process company
      addUserMessage(currentInput);
      setFormData((prev) => ({ ...prev, company: currentInput.trim() }));
      setCurrentInput('');
      setError(null);
      setCurrentStep(ConversationStep.ASK_COUNTRY);
    } else if (currentStep === ConversationStep.WAIT_COUNTRY) {
      if (!validateCountry(currentInput)) {
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
          source: 'PremiumIntroductionScreen.validation.country',
        });
        return;
      }
      // Process country
      addUserMessage(currentInput);
      setFormData((prev) => ({ ...prev, country: currentInput.trim() }));
      setCurrentInput('');
      setError(null);
      setCurrentStep(ConversationStep.COMPLETE);
    }
  }, [
    currentStep,
    currentInput,
    validateName,
    validateOccupation,
    validateCompany,
    validateCountry,
    addUserMessage,
  ]);

  // Handle quick reply (Skip company)
  const handleQuickReply = useCallback(
    (reply: QuickReply) => {
      if (reply.id === 'skip' && currentStep === ConversationStep.WAIT_COMPANY) {
        setCurrentInput('');
        advanceConversation();
      }
    },
    [currentStep, advanceConversation]
  );

  // Handle long-press to edit
  const handleLongPress = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const message = messages[messageIndex];

      if (message.type !== 'user') return;

      // Haptic feedback
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'PremiumIntroductionScreen.handleNext',
      });

      // Show confirmation alert
      Alert.alert(t('intro.editResponse.title'), t('intro.editResponse.message'), [
        {
          text: t('intro.editResponse.cancel'),
          style: 'cancel',
        },
        {
          text: t('intro.editResponse.confirm'),
          onPress: () => {
            // Remove this message and all subsequent messages
            setMessages((prev) => prev.slice(0, messageIndex));

            // Determine which step to rewind to based on message position
            // Count user messages before this one to determine which field
            const userMessagesBefore = messages
              .slice(0, messageIndex)
              .filter((m) => m.type === 'user').length;

            // Return ASK step - the advanceConversation will detect existing question and skip to WAIT
            let rewindStep: ConversationStep;
            switch (userMessagesBefore) {
              case 0:
                rewindStep = ConversationStep.ASK_NAME;
                break;
              case 1:
                rewindStep = ConversationStep.ASK_OCCUPATION;
                break;
              case 2:
                rewindStep = ConversationStep.ASK_COMPANY;
                break;
              case 3:
                rewindStep = ConversationStep.ASK_COUNTRY;
                break;
              default:
                rewindStep = currentStep;
            }

            // Pre-fill input with previous value for text inputs
            if (rewindStep !== ConversationStep.ASK_COUNTRY) {
              setCurrentInput(message.content);
            }

            // Set the step (advanceConversation will detect existing question and skip re-asking)
            setCurrentStep(rewindStep);

            // Clear error
            setError(null);
          },
        },
      ]);
    },
    [messages, currentStep, t]
  );

  // Determine if input should be shown
  const shouldShowInput =
    currentStep === ConversationStep.WAIT_NAME ||
    currentStep === ConversationStep.WAIT_OCCUPATION ||
    currentStep === ConversationStep.WAIT_COMPANY ||
    currentStep === ConversationStep.WAIT_COUNTRY;

  // Determine placeholder
  const getPlaceholder = (): string => {
    switch (currentStep) {
      case ConversationStep.WAIT_NAME:
        return t('intro.placeholders.name');
      case ConversationStep.WAIT_OCCUPATION:
        return t('intro.placeholders.occupation');
      case ConversationStep.WAIT_COMPANY:
        return t('intro.placeholders.company');
      case ConversationStep.WAIT_COUNTRY:
        return t('intro.placeholders.country');
      default:
        return '';
    }
  };

  // Quick replies (none currently used)
  const quickReplies: QuickReply[] = [];

  // Memoized render function for FlatList performance
  // CRITICAL: No inline arrow functions - pass stable function references only
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatMessage
        message={item}
        isBot={item.type === 'bot'}
        delay={0}
        reducedMotion={reducedMotion}
        onLongPress={item.type === 'user' ? handleLongPress : undefined}
        testID={`${testID}-message-${item.id}`}
      />
    ),
    [reducedMotion, handleLongPress, testID]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress Header */}
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.SHIFT_SYSTEM}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 100,
          }}
          // Performance optimizations
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={21}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={
            isTyping ? (
              <TypingIndicator
                visible={isTyping}
                reducedMotion={reducedMotion}
                testID={`${testID}-typing-indicator`}
              />
            ) : null
          }
        />

        {/* Chat Input */}
        {shouldShowInput && (
          <ChatInput
            value={currentInput}
            onChangeText={setCurrentInput}
            onSubmit={handleSubmit}
            placeholder={getPlaceholder()}
            disabled={isTyping}
            error={error || undefined}
            showQuickReplies={quickReplies.length > 0}
            quickReplies={quickReplies}
            onQuickReply={handleQuickReply}
            testID={`${testID}-chat-input`}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
});

export default PremiumIntroductionScreen;
