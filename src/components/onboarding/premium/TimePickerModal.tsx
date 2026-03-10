/**
 * TimePickerModal Component
 *
 * Custom time picker for earnings screen using stone and gold theme
 */

import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface TimePickerModalProps {
  /** Modal visible state */
  visible: boolean;
  /** Initial time in 24h format (HH:mm) */
  initialTime?: string;
  /** Use 12-hour format */
  use12HourFormat?: boolean;
  /** Confirm handler */
  onConfirm?: (time: string) => void;
  /** Cancel handler */
  onCancel?: () => void;
  /** Test ID */
  testID?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const MINUTES = [0, 15, 30, 45];
const ITEM_HEIGHT = 48;

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  initialTime = '09:00',
  use12HourFormat = false,
  onConfirm,
  onCancel,
  testID,
}) => {
  const { t } = useTranslation(['onboarding', 'common']);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    if (initialTime) {
      const [hours, minutes] = initialTime.split(':').map(Number);
      if (use12HourFormat) {
        setIsPM(hours >= 12);
        setSelectedHour(hours > 12 ? hours - 12 : hours === 0 ? 12 : hours);
      } else {
        setSelectedHour(hours);
      }
      setSelectedMinute(minutes);
    }
  }, [initialTime, use12HourFormat]);

  const handleConfirm = () => {
    if (onConfirm) {
      let hour24 = selectedHour;
      if (use12HourFormat) {
        if (isPM && selectedHour !== 12) {
          hour24 = selectedHour + 12;
        } else if (!isPM && selectedHour === 12) {
          hour24 = 0;
        }
      }
      const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
      onConfirm(timeString);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleHourSelect = (hour: number) => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `TimePickerModal.hour:${hour}`,
    });
    setSelectedHour(hour);
  };

  const handleMinuteSelect = (minute: number) => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `TimePickerModal.minute:${minute}`,
    });
    setSelectedMinute(minute);
  };

  const toggleAMPM = () => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: `TimePickerModal.toggleAMPM:${isPM ? 'pm' : 'am'}`,
    });
    setIsPM(!isPM);
  };

  const hours = use12HourFormat ? HOURS_12 : HOURS_24;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      testID={testID}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={[theme.colors.sacredGold, theme.colors.brightGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Animated.Text style={styles.headerText}>
              {t('timePicker.title', { ns: 'onboarding', defaultValue: 'Select Time' })}
            </Animated.Text>
          </LinearGradient>

          {/* Pickers */}
          <View style={styles.pickersContainer}>
            {/* Hour Picker */}
            <View style={styles.pickerColumn}>
              <Animated.Text style={styles.pickerLabel}>
                {t('timePicker.labels.hour', { ns: 'onboarding', defaultValue: 'Hour' })}
              </Animated.Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => handleHourSelect(hour)}
                    style={[styles.pickerItem, selectedHour === hour && styles.selectedPickerItem]}
                    testID={`${testID}-hour-${hour}`}
                  >
                    <Animated.Text
                      style={[
                        styles.pickerItemText,
                        selectedHour === hour && styles.selectedPickerItemText,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Animated.Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerColumn}>
              <Animated.Text style={styles.pickerLabel}>
                {t('timePicker.labels.minute', { ns: 'onboarding', defaultValue: 'Minute' })}
              </Animated.Text>
              <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                {MINUTES.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => handleMinuteSelect(minute)}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.selectedPickerItem,
                    ]}
                    testID={`${testID}-minute-${minute}`}
                  >
                    <Animated.Text
                      style={[
                        styles.pickerItemText,
                        selectedMinute === minute && styles.selectedPickerItemText,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Animated.Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Toggle */}
            {use12HourFormat && (
              <View style={styles.pickerColumn}>
                <Animated.Text style={styles.pickerLabel}>
                  {t('timePicker.labels.period', { ns: 'onboarding', defaultValue: 'Period' })}
                </Animated.Text>
                <View style={styles.ampmContainer}>
                  <TouchableOpacity
                    onPress={toggleAMPM}
                    style={[styles.ampmButton, !isPM && styles.selectedAmpmButton]}
                    testID={`${testID}-am`}
                  >
                    <Animated.Text style={[styles.ampmText, !isPM && styles.selectedAmpmText]}>
                      AM
                    </Animated.Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={toggleAMPM}
                    style={[styles.ampmButton, isPM && styles.selectedAmpmButton]}
                    testID={`${testID}-pm`}
                  >
                    <Animated.Text style={[styles.ampmText, isPM && styles.selectedAmpmText]}>
                      PM
                    </Animated.Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelButton}
              testID={`${testID}-cancel`}
            >
              <Animated.Text style={styles.cancelButtonText}>
                {t('buttons.cancel', { ns: 'common', defaultValue: 'Cancel' })}
              </Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.confirmButton}
              testID={`${testID}-confirm`}
            >
              <Animated.Text style={styles.confirmButtonText}>
                {t('buttons.confirm', { ns: 'common', defaultValue: 'Confirm' })}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.opacity.stone95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  headerText: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  pickersContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  picker: {
    maxHeight: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.softStone,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
    marginVertical: 2,
  },
  selectedPickerItem: {
    backgroundColor: theme.colors.sacredGold,
  },
  pickerItemText: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.paper,
  },
  selectedPickerItemText: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  ampmContainer: {
    gap: theme.spacing.sm,
  },
  ampmButton: {
    height: ITEM_HEIGHT,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAmpmButton: {
    backgroundColor: theme.colors.sacredGold,
  },
  ampmText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.dust,
  },
  selectedAmpmText: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.dust,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
});
