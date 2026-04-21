import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../theme';

export default function Header() {
  return (
    <BlurView intensity={80} tint="light" style={styles.header}>
      <View style={styles.logoContainer}>
        <MaterialIcons name="grid-view" size={24} color={COLORS.primary} />
        <Text style={styles.brandText}>Curator</Text>
      </View>
      
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 90,
    paddingTop: Platform.OS === 'ios' ? 45 : 40,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceLow, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' }
});