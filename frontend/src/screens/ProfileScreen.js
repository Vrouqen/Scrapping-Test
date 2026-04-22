import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';

function getDisplayName(profileData) {
  const rawTitle = profileData?.profile?.ogTitle || '';
  if (!rawTitle) {
    return 'Instagram User';
  }

  const clean = rawTitle.split('(')[0].trim();
  return clean || 'Instagram User';
}

function getBio(profileData) {
  const rawDescription = profileData?.profile?.ogDescription || '';
  if (!rawDescription) {
    return 'Digital Curator & Visual Storyteller.';
  }

  // El og:description de Instagram suele traer métricas (followers/posts), no la bio real.
  if (/(followers?|seguidores|following|seguidos|posts?|publicaciones)/i.test(rawDescription)) {
    return 'Perfil publico de Instagram';
  }

  const firstChunk = rawDescription.split('-')[0].trim();
  return firstChunk || 'Perfil publico de Instagram';
}

function formatMetricValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value || '0');
  }

  return numeric.toLocaleString('es-ES');
}

export default function ProfileScreen({ navigation, searchState }) {
  const {
    hasSearched,
    isLoading,
    username,
    profileData,
    posts,
    noPosts,
    errorType,
    errorMessage
  } = searchState;

  const previewPosts = posts.slice(0, 3);

  // Si no hay usuario buscado aún
  if (!hasSearched && !isLoading) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="person-search" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>Busca un perfil primero</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textVariant }}>Cargando...</Text>
      </View>
    );
  }

  if (errorType === 'NOT_FOUND') {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>El perfil no existe</Text>
        <Text style={styles.locationText}>{errorMessage || 'Verifica el usuario o la URL e intenta nuevamente.'}</Text>
      </View>
    );
  }

  if (errorType === 'NETWORK') {
    return (
      <View style={styles.center}>
        <MaterialIcons name="cloud-off" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>Sin conexión</Text>
        <Text style={styles.locationText}>{errorMessage || 'No fue posible conectar con el servidor.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 1. HERO SECTION (Avatar y Bio) */}
      <View style={styles.heroSection}>
        <View style={styles.avatarWrapper}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradientRing}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: profileData?.profile?.profileImage || 'https://i.pravatar.cc/300' }} 
                style={styles.avatarImage} 
              />
            </View>
          </LinearGradient>
          {/* Badge Verificado Flotante */}
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={16} color="#fff" />
          </View>
        </View>

        <Text style={styles.usernameText}>@{username}</Text>
        
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={14} color={COLORS.textVariant} />
          <Text style={styles.locationText}>{getDisplayName(profileData)}</Text>
        </View>

        <Text style={styles.bioText}>
          {getBio(profileData)}
        </Text>

        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => navigation.navigate('Gallery', { username })}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewPostsBtn}>
            <Text style={styles.btnText}>View Posts</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 2. METRICS GRID */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: COLORS.primary }]}>{formatMetricValue(profileData?.metrics?.followers)}</Text>
          <Text style={styles.metricLabel}>Followers</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{formatMetricValue(profileData?.metrics?.following)}</Text>
          <Text style={styles.metricLabel}>Following</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{formatMetricValue(profileData?.metrics?.posts)}</Text>
          <Text style={styles.metricLabel}>Posts</Text>
        </View>
      </View>

      {/* 3. CONTENT BENTO GRID PREVIEW */}
      {previewPosts.length >= 3 ? (
        <View style={styles.bentoContainer}>
          {/* Imagen Grande Izquierda */}
          <View style={styles.bentoLarge}>
            <Image 
              source={{ uri: previewPosts[0].imageUrl }}
              style={styles.bentoImage} 
              resizeMode="contain" 
            />
            <View style={styles.topPerformingChip}>
              <MaterialIcons name="bolt" size={14} color={COLORS.tertiary} />
              <Text style={styles.topPerformingText}>Top Performing</Text>
            </View>
          </View>

          {/* Columna Derecha (2 imágenes pequeñas) */}
          <View style={styles.bentoSmallCol}>
            <View style={styles.bentoSmall}>
              <Image source={{ uri: previewPosts[1].imageUrl }} style={styles.bentoImage} resizeMode="contain" />
            </View>
            <View style={styles.bentoSmall}>
              <Image source={{ uri: previewPosts[2].imageUrl }} style={styles.bentoImage} resizeMode="contain" />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noPostsContainer}>
          <MaterialIcons name="collections-bookmark" size={36} color={COLORS.outline} />
          <Text style={styles.emptyText}>No hay publicaciones</Text>
          <Text style={styles.locationText}>
            {noPosts ? 'El perfil es privado o no tiene publicaciones públicas.' : 'Aun no hay suficientes publicaciones para mostrar vista previa.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  content: { paddingTop: 100, paddingBottom: 140, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },

  /* Hero Section */
  heroSection: { alignItems: 'center', marginBottom: 40 },
  avatarWrapper: { position: 'relative', marginBottom: 20 },
  gradientRing: { padding: 4, borderRadius: 100 },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: COLORS.surface, overflow: 'hidden', backgroundColor: COLORS.surfaceLow },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, backgroundColor: COLORS.tertiary, borderRadius: 14, borderWidth: 2, borderColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  usernameText: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5, marginBottom: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 14, fontWeight: '500', color: COLORS.textVariant, letterSpacing: 0.5 },
  bioText: { fontSize: 15, color: COLORS.textVariant, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, marginBottom: 24 },
  viewPostsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  /* Metrics Grid */
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  metricCard: { flex: 1, backgroundColor: COLORS.surface, marginHorizontal: 4, paddingVertical: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
  metricNumber: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  metricLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textVariant, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },

  /* Content Bento Grid */
  bentoContainer: { flexDirection: 'row', height: 320, gap: 12 },
  noPostsContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 20, padding: 20 },
  bentoLarge: { flex: 2, backgroundColor: COLORS.inverseSurface, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  bentoSmallCol: { flex: 1, justifyContent: 'space-between' },
  bentoSmall: { height: '48%', backgroundColor: COLORS.inverseSurface, borderRadius: 20, overflow: 'hidden' },
  // Usamos un fondo oscuro para que la imagen al hacer "contain" no deje bordes blancos feos
  bentoImage: { width: '100%', height: '100%' }, 
  topPerformingChip: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.85)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  topPerformingText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: COLORS.text }
});