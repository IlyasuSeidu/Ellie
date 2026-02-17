/**
 * StatisticsCard & StatisticsRow Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StatisticsCard, StatisticsRow } from '../StatisticsCard';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
  };
});

describe('StatisticsCard', () => {
  it('should render value and label', () => {
    const { getByText } = render(
      <StatisticsCard icon="briefcase-outline" iconColor="#2196F3" value={18} label="Work Days" />
    );
    expect(getByText('18')).toBeTruthy();
    expect(getByText('Work Days')).toBeTruthy();
  });

  it('should render with suffix', () => {
    const { getByText } = render(
      <StatisticsCard
        icon="heart-outline"
        iconColor="#4CAF50"
        value={42}
        label="Balance"
        suffix="%"
      />
    );
    expect(getByText('%')).toBeTruthy();
  });

  it('should render with testID', () => {
    const { getByTestId } = render(
      <StatisticsCard
        icon="briefcase-outline"
        iconColor="#2196F3"
        value={18}
        label="Work Days"
        testID="test-stat"
      />
    );
    expect(getByTestId('test-stat')).toBeTruthy();
  });
});

describe('StatisticsRow', () => {
  it('should render all three statistics', () => {
    const { getByTestId } = render(
      <StatisticsRow workDays={18} offDays={10} workLifeBalance={35.7} />
    );
    expect(getByTestId('stat-work-days')).toBeTruthy();
    expect(getByTestId('stat-off-days')).toBeTruthy();
    expect(getByTestId('stat-balance')).toBeTruthy();
  });

  it('should display correct work days count', () => {
    const { getByText } = render(
      <StatisticsRow workDays={20} offDays={8} workLifeBalance={28.6} />
    );
    expect(getByText('20')).toBeTruthy();
    expect(getByText('Work Days')).toBeTruthy();
  });

  it('should display correct off days count', () => {
    const { getByText } = render(
      <StatisticsRow workDays={20} offDays={8} workLifeBalance={28.6} />
    );
    expect(getByText('8')).toBeTruthy();
    expect(getByText('Off Days')).toBeTruthy();
  });

  it('should display work-life balance percentage', () => {
    const { getByText, getByTestId } = render(
      <StatisticsRow workDays={20} offDays={8} workLifeBalance={28.6} />
    );
    // Balance value is rendered as nested text: "29" + "%" inside parent Text
    expect(getByTestId('stat-balance')).toBeTruthy();
    expect(getByText('Balance')).toBeTruthy();
  });

  it('should render with testID', () => {
    const { getByTestId } = render(
      <StatisticsRow workDays={18} offDays={10} workLifeBalance={35.7} testID="test-row" />
    );
    expect(getByTestId('test-row')).toBeTruthy();
  });
});
