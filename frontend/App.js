import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';

import SearchScreen from './src/screens/SearchScreen';
import Header from './src/components/Header';
import ProfileScreen from './src/screens/ProfileScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
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
  const [fontsLoaded] = useFonts(MaterialIcons.font);
  const [searchState, setSearchState] = useState({
    inputValue: '',
    searchedValue: '',
    username: '',
    hasSearched: false,
    isLoading: false,
    profileData: null,
    posts: [],
    stats: null,
    noPosts: false,
    errorType: null,
    errorMessage: ''
  });

  if (!fontsLoaded) {
    return null;
  }

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
            else if (route.name === 'Analytics') iconName = 'analytics';

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
          options={{ tabBarLabel: 'Buscar' }}
        >
          {(props) => (
            <SearchScreen
              {...props}
              searchState={searchState}
              setSearchState={setSearchState}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Gallery"
          options={{ tabBarLabel: 'Galería' }}
        >
          {(props) => (
            <GalleryScreen
              {...props}
              searchState={searchState}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Profile"
          options={{ tabBarLabel: 'Perfil' }}
        >
          {(props) => (
            <ProfileScreen
              {...props}
              searchState={searchState}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="Analytics"
          options={{ tabBarLabel: 'Analitics' }}
        >
          {(props) => (
            <AnalyticsScreen
              {...props}
              searchState={searchState}
            />
          )}
        </Tab.Screen>
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