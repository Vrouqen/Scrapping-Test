import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';
import FeatureCard from '../components/FeatureCard';

function extractUsernameFromUrl(urlValue) {
  const match = String(urlValue).match(/instagram\.com\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function buildSearchPayload(inputValue) {
  const value = String(inputValue || '').trim();
  const isUrl = /^https?:\/\//i.test(value) || value.includes('instagram.com/');

  if (isUrl) {
    const normalizedUrl = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return {
      url: normalizedUrl,
      username: extractUsernameFromUrl(normalizedUrl)
    };
  }

  return {
    username: value.replace(/^@/, '').trim(),
    url: ''
  };
}

function resolveUsername(profileData, fallbackValue) {
  const canonical = profileData?.profile?.canonicalUrl || '';
  const fromCanonical = extractUsernameFromUrl(canonical);
  if (fromCanonical) {
    return fromCanonical;
  }

  const fromInputUrl = extractUsernameFromUrl(fallbackValue);
  if (fromInputUrl) {
    return fromInputUrl;
  }

  return String(fallbackValue || '').replace(/^@/, '').trim();
}

function parseMetricNumber(value) {
  const onlyDigits = String(value || '').replace(/[^\d]/g, '');
  if (!onlyDigits) {
    return 0;
  }

  return Number.parseInt(onlyDigits, 10);
}

export default function SearchScreen({ navigation, searchState, setSearchState }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const username = searchState?.inputValue || '';

  const onChangeInput = (value) => {
    setSearchState((prev) => ({
      ...prev,
      inputValue: value
    }));
  };

  const handleSearch = async () => {
    if (!username.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre de usuario.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Cargando perfil...');

    navigation.navigate('Search');

      try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const payload = buildSearchPayload(username);

      setSearchState((prev) => ({
        ...prev,
        searchedValue: username.trim(),
        hasSearched: true,
        isLoading: true,
        errorType: null,
        errorMessage: '',
        profileData: null,
        posts: [],
        stats: null,
        noPosts: false
      }));

      const [profileResponse, postsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/instagram-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(`${API_URL}/instagram-posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(`${API_URL}/instagram-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      ]);

      const profileResult = await profileResponse.json();
      const postsResult = await postsResponse.json();
      const statsResult = await statsResponse.json();

      if (!profileResponse.ok || !profileResult.ok) {
        const notFoundMessage = profileResult?.message || 'El perfil no existe o no está disponible.';
        setSearchState((prev) => ({
          ...prev,
          isLoading: false,
          errorType: 'NOT_FOUND',
          errorMessage: notFoundMessage,
          profileData: null,
          posts: [],
          noPosts: false
        }));
        Alert.alert('Perfil no encontrado', notFoundMessage);
        return;
      }

      const extractedUsername = resolveUsername(profileResult.data, username);
      let posts = [];
      let noPosts = false;
      let warningMessage = '';
      let nextErrorType = null;

      if (postsResponse.ok && postsResult.ok) {
        posts = postsResult?.data?.recentPosts || [];
      } else if (postsResult?.errorCode === 'NO_POSTS_FOUND') {
        noPosts = true;
        const totalPosts = parseMetricNumber(profileResult?.data?.metrics?.posts);

        if (totalPosts > 0) {
          nextErrorType = 'PRIVATE_PROFILE';
          warningMessage = 'El perfil es privado.';
        } else {
          warningMessage = 'No hay publicaciones públicas para mostrar.';
        }

        Alert.alert('Aviso', warningMessage);
      } else {
        noPosts = true;
        warningMessage = postsResult?.message || 'No fue posible obtener publicaciones.';
      }

      const stats = statsResponse.ok && statsResult?.ok ? statsResult?.data?.stats || null : null;

      setSearchState((prev) => ({
        ...prev,
        username: extractedUsername,
        isLoading: false,
        profileData: profileResult.data,
        posts,
        stats,
        noPosts,
        errorType: nextErrorType,
        errorMessage: warningMessage
      }));

      navigation.navigate('Profile');
    } catch (error) {
      setSearchState((prev) => ({
        ...prev,
        isLoading: false,
        errorType: 'NETWORK',
        errorMessage: 'No se pudo conectar con el servidor.',
        profileData: null,
        posts: [],
        noPosts: false
      }));
      Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
    } finally {
      setLoadingMessage('');
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Background Gradients */}
      <View style={[styles.bgGradient, { top: 0, right: 0, backgroundColor: 'rgba(216, 45, 126, 0.05)' }]} />
      
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name="auto-awesome" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Archivo Digital.</Text>
        <Text style={[styles.title, { color: COLORS.primary }]}>Informes acertados.</Text>
        <Text style={styles.subtitle}>
          Convierte datos de redes sociales sin procesar. Introduce cualquier perfil público para comenzar la selección.
        </Text>
      </View>

      {/* Search Input Block */}
      <View style={styles.searchCard}>
        <Text style={styles.label}>NOMBRE DE USUARIO O URL DEL PERFIL</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="alternate-email" size={20} color={COLORS.outline} style={styles.inputIcon} />
          <TextInput 
            style={styles.input}
            placeholder="e.g. @creativedirector"
            placeholderTextColor={COLORS.outline}
            value={username}
            onChangeText={onChangeInput}
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleSearch} disabled={isLoading}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Buscar Perfil</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        {isLoading ? (
          <Text style={styles.loadingText}>{loadingMessage || 'Cargando...'}</Text>
        ) : null}
      </View>

      {/* Bento-lite */}
      <View style={styles.bentoGrid}>
        <FeatureCard 
          icon="hub" 
          title="Scraping Profundo" 
          description="Nuestro motor rastrea nodos públicos para obtener medios de alta resolución y metadatos de engagement instantáneamente."
          iconColor={COLORS.tertiary}
        />
        <FeatureCard 
          icon="analytics" 
          title="Análisis editorial" 
          description="Más allá de las cifras: analizamos las tendencias estéticas y la repercusión de los contenidos."
          iconColor={COLORS.secondary}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bgGradient: { position: 'absolute', width: 300, height: 300, borderRadius: 150, blurRadius: 50 },
  content: { paddingTop: 130, paddingBottom: 120, paddingHorizontal: 24 },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  iconWrapper: { width: 64, height: 64, backgroundColor: COLORS.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15 },
  title: { fontSize: 36, fontWeight: '900', color: COLORS.text, textAlign: 'center', letterSpacing: -1 },
  subtitle: { fontSize: 15, color: COLORS.textVariant, textAlign: 'center', marginTop: 16, lineHeight: 24 },
  searchCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, marginBottom: 40 },
  label: { fontSize: 10, fontWeight: 'bold', color: COLORS.outline, letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLow, borderRadius: 16, paddingHorizontal: 16, height: 60, marginBottom: 20 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 16, gap: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textVariant, textAlign: 'center', fontWeight: '600' },
  bentoGrid: { flexDirection: 'column', gap: 10 }
});