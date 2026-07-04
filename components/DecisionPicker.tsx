import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import {
  DECISION_COLORS,
  DECISION_LABELS,
  type Decision,
} from '@/types/item';

interface DecisionBadgeProps {
  decision: Decision;
  compact?: boolean;
}

export function DecisionBadge({ decision, compact }: DecisionBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: DECISION_COLORS[decision] },
      ]}
    >
      <Text style={[styles.text, compact && styles.textCompact]}>
        {DECISION_LABELS[decision]}
      </Text>
    </View>
  );
}

interface DecisionPickerProps {
  value: Decision;
  onChange: (decision: Decision) => void;
  disabled?: boolean;
}

export function DecisionPicker({
  value,
  onChange,
  disabled,
}: DecisionPickerProps) {
  const options: Decision[] = [
    'undecided',
    'ebay',
    'garage_sale',
    'child_a',
    'child_b',
  ];

  return (
    <View style={styles.picker}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            style={[
              styles.option,
              selected && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => !disabled && onChange(option)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.optionText,
                selected && styles.optionTextSelected,
              ]}
            >
              {DECISION_LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 11,
  },
  picker: {
    gap: 8,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: '#F3EAD6',
    borderColor: Colors.primary,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    color: Colors.text,
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
});
