import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import SearchScreen from './src/screens/SearchScreen';
import Header from './src/components/Header';
import GalleryScreen from './src/screens/GalleryScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

// Pantallas de relleno por ahora
const PlaceholderScreen = () => (
  <View style={styles.center}>
    <MaterialIcons name="construction" size={60} color={COLORS.outline} />
    <Text style={styles.emptyText}>Próximamente...</Text>
  </View>
);

export default function App() {
  return (
    <NavigationContainer>
      <Header />
      <Tab.Navigator
        // Definimos 'Search' como la pantalla inicial obligatoria
        initialRouteName="Search"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.outline,
          tabBarBackground: () => (
            <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
          ),
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            borderTopWidth: 0,
            elevation: 0,
            height: 90,
            paddingTop: 10,
            paddingBottom: 30,
            backgroundColor: 'rgba(246, 246, 249, 0.8)',
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            marginTop: 4,
          },
          tabBarIcon: ({ color, focused }) => {
            let iconName;
            if (route.name === 'Search') iconName = 'search';
            else if (route.name === 'Gallery') iconName = 'dashboard';
            else if (route.name === 'Profile') iconName = 'person';

            return (
              <View style={[styles.iconContainer, focused && styles.activeIcon]}>
                <MaterialIcons name={iconName} size={24} color={color} />
              </View>
            );
          },
        })}
      >
        <Tab.Screen 
          name="Search" 
          component={SearchScreen} 
          // Destruye la pantalla cuando te vas, para que al volver esté limpia
          options={{ unmountOnBlur: true }} 
        />
        <Tab.Screen 
          name="Gallery" 
          component={GalleryScreen} 
          // MUY IMPORTANTE: Esta línea fuerza a la Galería a recargarse cuando recibe nuevos datos
          options={{ unmountOnBlur: true }} 
        />
        <Tab.Screen 
          name="Profile" 
          component={PlaceholderScreen} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.background 
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textVariant,
    marginTop: 10,
    fontWeight: 'bold',
  },
  iconContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 5, 
    borderRadius: 12 
  },
  activeIcon: { 
    backgroundColor: COLORS.surface, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  }
});