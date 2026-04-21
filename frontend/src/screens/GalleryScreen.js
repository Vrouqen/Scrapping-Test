import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

function formatPublishedDate(publishedAt) {
  if (!publishedAt) {
    return 'Sin fecha';
  }

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return 'Ayer';
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} dias`;
  }

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function GalleryScreen({ searchState }) {
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

  // Pantalla Vacía (si el usuario entra a la pestaña sin buscar nada)
  if (!hasSearched && !isLoading) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="image-search" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>No hay visuales cargados</Text>
        <Text style={styles.emptySubtext}>Ve a la pestaña Buscar para buscar un perfil.</Text>
      </View>
    );
  }

  if (errorType === 'NOT_FOUND') {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>El perfil no existe</Text>
        <Text style={styles.emptySubtext}>{errorMessage || 'Verifica el usuario o la URL e intenta de nuevo.'}</Text>
      </View>
    );
  }

  // Pantalla de Carga
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textVariant }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* --- SECCIÓN: PERFIL --- */}
      {profileData && (
        <View style={styles.profileSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>CREATOR PROFILE</Text>
          </View>
          
          <Text style={styles.usernameTitle}>@{username}</Text>
          <Text style={styles.bioText} numberOfLines={2}>
            {profileData.profile?.ogDescription || 'Curating visual narratives across the digital landscape.'}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profileData.metrics?.followers || '0'}</Text>
              <Text style={styles.statLabel}>FOLLOWERS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: COLORS.tertiary }]}>{profileData.metrics?.posts || '0'}</Text>
              <Text style={styles.statLabel}>POSTS</Text>
            </View>
          </View>
        </View>
      )}

      {/* --- SECCIÓN: GALERÍA ASIMÉTRICA --- */}
      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>Recent Posts</Text>
        <View style={styles.archiveLink}>
          <Text style={styles.archiveText}>View Archive</Text>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.primary} />
        </View>
      </View>

      {errorType === 'NETWORK' ? (
        <View style={[styles.center, { marginTop: 40 }]}>
          <MaterialIcons name="cloud-off" size={40} color={COLORS.outline} />
          <Text style={styles.emptyText}>{errorMessage || 'Error de conexión con el servidor.'}</Text>
        </View>
      ) : errorType === 'PRIVATE_PROFILE' ? (
        <View style={[styles.center, { marginTop: 40 }]}> 
          <MaterialIcons name="lock" size={40} color={COLORS.outline} />
          <Text style={styles.emptyText}>Perfil privado</Text>
          <Text style={styles.emptySubtext}>No se pueden mostrar publicaciones de este perfil.</Text>
        </View>
      ) : noPosts || !posts.length ? (
        <View style={[styles.center, { marginTop: 40 }]}> 
          <MaterialIcons name="collections-bookmark" size={40} color={COLORS.outline} />
          <Text style={styles.emptyText}>No hay publicaciones</Text>
          <Text style={styles.emptySubtext}>Este perfil no tiene publicaciones públicas para mostrar.</Text>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {posts.map((post, index) => {
            // Hacemos que la tarjeta del medio (índice 1) baje un poco para la asimetría
            const isMiddle = index % 3 === 1;
            
            return (
              <View key={post.url || index} style={[styles.postCard, isMiddle && styles.postCardMiddle]}>
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                
                {/* Chip de fecha falso (simulado para el diseño) */}
                <View style={styles.dateChip}>
                  <Text style={styles.dateText}>{formatPublishedDate(post.publishedAt)}</Text>
                </View>

                {/* Overlay de Interacciones (Siempre visible en móvil por falta de hover) */}
                <View style={styles.interactionOverlay}>
                  <View style={styles.interactionItem}>
                    <MaterialIcons name="favorite" size={14} color="#fff" />
                    <Text style={styles.interactionText}>{post.likes || '0'}</Text>
                  </View>
                  <View style={styles.interactionItem}>
                    <MaterialIcons name="chat-bubble" size={14} color="#fff" />
                    <Text style={styles.interactionText}>{post.comments || '0'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, paddingTop: 150 },
  content: { paddingTop: 120, paddingBottom: 140, paddingHorizontal: 24 },
  
  /* Estilos del Perfil */
  profileSection: { marginBottom: 40 },
  badge: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  badgeText: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
  usernameTitle: { fontSize: 38, fontWeight: '900', color: COLORS.text, letterSpacing: -1, marginBottom: 8 },
  bioText: { fontSize: 16, color: COLORS.textVariant, lineHeight: 24, marginBottom: 24 },
  statsContainer: { flexDirection: 'row', gap: 40 },
  statBox: { flexDirection: 'column' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.outline, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 },

  /* Estilos de la Cabecera de Galería */
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  galleryTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  archiveLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  archiveText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },

  /* Estilos de la Cuadrícula Asimétrica */
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    paddingBottom: 20
  },
  postCard: { 
    width: '48%', // ✨ EL TRUCO: Usar porcentaje en lugar de matemáticas
    aspectRatio: 4/5, 
    backgroundColor: COLORS.surfaceLow, 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 16,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 3
  },
  postCardMiddle: {
    marginTop: 24, // Empuja la tarjeta derecha hacia abajo
  },
  postImage: { 
    width: '100%', 
    height: '100%',
    resizeMode: 'cover' // ✨ EL TRUCO 2: Evita que la foto se estire o aplaste
  },
  
  /* Chips y Overlays de fotos */
  dateChip: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateText: { color: COLORS.text, fontSize: 10, fontWeight: 'bold' },
  interactionOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(12, 14, 16, 0.3)', 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16,
    opacity: 1 // En móvil lo dejamos siempre visible porque no hay "hover" del mouse
  },
  interactionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  interactionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  /* Textos de error/vacío */
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textVariant, textAlign: 'center', marginTop: 8 }
});