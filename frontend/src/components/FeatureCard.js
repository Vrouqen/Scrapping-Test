import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function FeatureCard({ icon, title, description, iconColor }) {
  return (
    <View style={styles.card}>
      <MaterialIcons name={icon} size={28} color={iconColor} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surfaceLow, padding: 24, borderRadius: 16, marginBottom: 16, flex: 1, marginHorizontal: 4 },
  icon: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  description: { fontSize: 14, color: COLORS.textVariant, lineHeight: 20 }
});