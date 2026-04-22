import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';

const MIN_POSTS_FOR_HISTORICAL = 3;
const TIMELINE_MONTHS_TO_SHOW = 12;
const TIMELINE_COLLAPSED_MONTHS = 4;
const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function parseProfilePostsCount(profileData) {
  const onlyDigits = String(profileData?.metrics?.posts || '').replace(/[^\d]/g, '');
  if (!onlyDigits) {
    return 0;
  }

  return Number.parseInt(onlyDigits, 10);
}

function parseMonthKey(monthKey) {
  const [yearRaw, monthRaw] = String(monthKey || '').split('-');
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function buildTimelineRows(monthlyStats, monthsToShow) {
  const source = monthlyStats && typeof monthlyStats === 'object' ? monthlyStats : {};
  const monthKeys = Object.keys(source);

  const parsedKeys = monthKeys
    .map((key) => ({ key, parsed: parseMonthKey(key) }))
    .filter((entry) => Boolean(entry.parsed));

  const anchor = parsedKeys.length > 0
    ? parsedKeys.sort((a, b) => {
      const yearDiff = b.parsed.year - a.parsed.year;
      if (yearDiff !== 0) return yearDiff;
      return b.parsed.month - a.parsed.month;
    })[0].parsed
    : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  const rows = [];
  for (let i = 0; i < monthsToShow; i += 1) {
    const date = new Date(anchor.year, anchor.month - 1 - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const data = source[monthKey] || {};

    rows.push({
      month: monthKey,
      monthLabel: `${MONTH_LABELS_ES[month - 1]} ${String(year).slice(-2)}`,
      postCount: Number(data.postCount) || 0,
      totalLikes: Number(data.totalLikes) || 0,
      totalComments: Number(data.totalComments) || 0
    });
  }

  return rows;
}

export default function AnalyticsScreen({ navigation, searchState, setSearchState }) {
  // Estado local para manejar el loading exclusivo del análisis profundo
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const {
    hasSearched,
    isLoading,
    username,
    searchedValue,
    profileData,
    errorType,
    errorMessage,
    stats
  } = searchState || {};

  const totalProfilePosts = parseProfilePostsCount(profileData);
  const canAnalyzeHistorical = totalProfilePosts >= MIN_POSTS_FOR_HISTORICAL;

  // ==========================================
  // FUNCIÓN PARA LLAMAR AL ENDPOINT 3
  // ==========================================
  const handleAnalyze = async () => {
    const targetUser = username || searchedValue;
    if (!targetUser) return;

    if (!canAnalyzeHistorical) {
      Alert.alert(
        'Análisis no disponible',
        `Se requieren al menos ${MIN_POSTS_FOR_HISTORICAL} publicaciones para generar el análisis de los últimos 12 meses.`
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/instagram-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        if (result?.errorCode === 'INSUFFICIENT_POSTS') {
          Alert.alert(
            'Análisis no disponible',
            result?.message || `Se requieren al menos ${MIN_POSTS_FOR_HISTORICAL} publicaciones para generar el análisis de los últimos 12 meses.`
          );
          return;
        }

        Alert.alert('Aviso', result.message || 'No se pudieron obtener las estadísticas históricas.');
        return;
      }

      // Actualizamos el estado global inyectando las estadísticas recibidas
      setSearchState(prev => ({
        ...prev,
        stats: result.data.stats
      }));

    } catch (error) {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor para el análisis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ==========================================
  // ESTADOS DE CARGA Y ERROR GLOBALES (De la búsqueda principal)
  // ==========================================
  if (!hasSearched && !isLoading) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="analytics" size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>No hay datos analíticos</Text>
        <Text style={styles.emptySubtext}>Ve a la pestaña Buscar para analizar un perfil.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textVariant }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (errorType === 'NOT_FOUND' || errorType === 'NETWORK') {
    return (
      <View style={styles.center}>
        <MaterialIcons name={errorType === 'NETWORK' ? "cloud-off" : "error-outline"} size={60} color={COLORS.outline} />
        <Text style={styles.emptyText}>{errorType === 'NETWORK' ? 'Sin conexión' : 'Error de perfil'}</Text>
        <Text style={styles.emptySubtext}>{errorMessage}</Text>
      </View>
    );
  }

  // ==========================================
  // VISTA INTERMEDIA: PERFIL ENCONTRADO, PERO SIN ANALIZAR
  // ==========================================
  if (hasSearched && !stats) {
    return (
      <View style={styles.center}>
        <View style={styles.preAnalyzeIconWrapper}>
          <MaterialIcons name="insights" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyText}>Análisis Histórico</Text>
        <Text style={styles.emptySubtext}>Genera un reporte avanzado de los últimos 12 meses de @{username}</Text>
        
        <TouchableOpacity activeOpacity={0.8} onPress={handleAnalyze} disabled={isAnalyzing || !canAnalyzeHistorical} style={{ marginTop: 32 }}>
          <LinearGradient
            colors={canAnalyzeHistorical ? [COLORS.primary, COLORS.secondary] : [COLORS.outline, COLORS.outline]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.analyzeBtn}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeBtnText}>Analizando posts...</Text>
              </>
            ) : (
              <>
                <Text style={styles.analyzeBtnText}>Generar Reporte</Text>
                <MaterialIcons name="auto-awesome" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {!canAnalyzeHistorical && (
          <Text style={styles.disclaimerText}>
            Este perfil necesita al menos {MIN_POSTS_FOR_HISTORICAL} publicaciones para habilitar el análisis de los últimos 12 meses.
          </Text>
        )}
        
        {isAnalyzing && (
          <Text style={styles.disclaimerText}>Esto puede tomar varios minutos dependiendo de la cantidad de publicaciones.</Text>
        )}
      </View>
    );
  }

  // ==========================================
  // VISTA DEL DASHBOARD (Una vez que 'stats' existe)
  // ==========================================
  const totalPosts = stats?.totalPosts ?? 0;
  const totalLikes = stats?.totalLikes ?? 0;
  const totalComments = stats?.totalComments ?? 0;
  const avgLikes = stats?.averageLikes ?? 0;
  const avgComments = stats?.averageComments ?? 0;

  const bestPostLikes = stats?.postWithMostLikes ?? { likes: 0, comments: 0, url: '' };
  const bestPostComments = stats?.postWithMostComments ?? { comments: 0, url: '' };
  const bestPostLikesImage = bestPostLikes?.imageUrl || '';
  const bestPostCommentsImage = bestPostComments?.imageUrl || '';
  
  const timelineRows = buildTimelineRows(stats?.monthlyStats, TIMELINE_MONTHS_TO_SHOW);
  const visibleTimelineRows = isTimelineExpanded
    ? timelineRows
    : timelineRows.slice(0, TIMELINE_COLLAPSED_MONTHS);
  const maxPostsInTimeline = timelineRows.reduce((max, item) => Math.max(max, item.postCount), 0);

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. HERO SECTION --- */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>SCRAPER REPORT</Text>
          <View style={styles.heroRow}>
            <View style={styles.profileInfo}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.avatarGradient}>
                <Image 
                  source={{ uri: profileData?.profile?.profileImage || 'https://i.pravatar.cc/300' }} 
                  style={styles.avatarImage} 
                />
              </LinearGradient>
              <View>
                <Text style={styles.usernameTitle}>@{username}</Text>
                <Text style={styles.bioText}>Digital Creator & Visionary</Text>
              </View>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalCardLabel}>TOTAL POSTS</Text>
              <Text style={styles.totalCardNumber}>{totalPosts}</Text>
            </View>
          </View>
        </View>

        {/* --- 2. BENTO GRID: MAIN METRICS --- */}
        <View style={styles.bentoGrid}>
          {/* Global Likes */}
          <View style={[styles.bentoCard, styles.cardCol2, { borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
            <MaterialIcons name="favorite" size={24} color={COLORS.primary} style={styles.cardIcon} />
            <Text style={styles.cardLabel}>PARTICIPACIÓN ACUMULADA</Text>
            <View style={styles.rowBaseline}>
              <Text style={styles.cardNumberLarge}>{totalLikes.toLocaleString()}</Text>

            </View>
          </View>

          <View style={styles.row}>
            {/* Total Comments */}
            <View style={[styles.bentoCard, styles.flex1, { marginRight: 8 }]}>
              <MaterialIcons name="chat-bubble" size={20} color={COLORS.secondary} style={styles.cardIcon} />
              <Text style={styles.cardLabel}>COMENTARIOS TOTALES</Text>
              <Text style={styles.cardNumber}>{totalComments.toLocaleString()}</Text>
            </View>

            {/* Analyzed Feed */}
            <View style={[styles.bentoCard, styles.flex1, { marginLeft: 8, backgroundColor: COLORS.surfaceLow }]}>
              <MaterialIcons name="grid-view" size={20} color={COLORS.textVariant} style={styles.cardIcon} />
              <Text style={styles.cardLabel}>ANÁLISIS DE FEED</Text>
              <Text style={styles.cardNumber}>{totalPosts} <Text style={styles.cardNumberSmall}>Posts</Text></Text>
            </View>
          </View>

          <View style={styles.row}>
            {/* Avg Likes */}
            <View style={[styles.bentoCard, styles.flex1, styles.rowCenter, { marginRight: 8 }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialIcons name="trending-up" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.ml12}>
                <Text style={styles.cardLabel}>PROM. LIKES</Text>
                <Text style={styles.cardNumber}>{avgLikes.toLocaleString()}</Text>
              </View>
            </View>

            {/* Avg Comments */}
            <View style={[styles.bentoCard, styles.flex1, styles.rowCenter, { marginLeft: 8 }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${COLORS.secondary}15` }]}>
                <MaterialIcons name="equalizer" size={20} color={COLORS.secondary} />
              </View>
              <View style={styles.ml12}>
                <Text style={styles.cardLabel}>PROM. COMENT</Text>
                <Text style={styles.cardNumber}>{avgComments.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Peak Performance Post */}
          <View style={[styles.bentoCard, styles.cardCol2, { backgroundColor: COLORS.text }]}>
            <View style={styles.peakContent}>
              {bestPostLikesImage ? (
                <Image source={{ uri: bestPostLikesImage }} style={styles.peakImage} />
              ) : (
                <View style={[styles.peakImage, styles.noImageBox]}>
                  <MaterialIcons name="image-not-supported" size={24} color={COLORS.outline} />
                </View>
              )}
              <View style={styles.peakTextContainer}>
                <View style={styles.peakChip}>
                  <Text style={styles.peakChipText}>PEAK PERFORMANCE</Text>
                </View>
                <Text style={styles.peakTitle}>Post con más participación</Text>
                <View style={styles.peakStats}>
                  <View style={styles.peakStatItem}>
                    <MaterialIcons name="favorite" size={14} color={COLORS.primary} />
                    <Text style={styles.peakStatText}>{bestPostLikes.likes}</Text>
                  </View>
                  <View style={[styles.peakStatItem, { opacity: 0.6 }]}>
                    <MaterialIcons name="chat-bubble" size={14} color="#fff" />
                    <Text style={[styles.peakStatText, { color: '#fff' }]}>{bestPostLikes.comments}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* --- 3. TIMELINE & DISCUSSIONS --- */}
        <View style={styles.bottomSection}>
          <View style={styles.timelineHeaderRow}>
            <View style={styles.timelineHeaderTextBlock}>
              <Text style={styles.sectionTitle}>Análisis de Línea de Tiempo</Text>
              <Text style={styles.sectionSubtitle}>Últimos 12 meses (incluye meses sin actividad)</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsTimelineExpanded((prev) => !prev)}
              style={styles.timelineToggleButton}
            >
              <Text style={styles.timelineToggleText}>{isTimelineExpanded ? 'Ver menos' : 'Ver todo'}</Text>
              <MaterialIcons
                name={isTimelineExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color={COLORS.textVariant}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.timelineCard}>
            {visibleTimelineRows.length === 0 ? (
              <Text style={styles.timelineValue}>Sin datos mensuales disponibles</Text>
            ) : (
              visibleTimelineRows.map((row, index) => {
                const rowLikes = row.totalLikes;
                const width = row.postCount === 0
                  ? '0%'
                  : `${Math.max(10, Math.round((row.postCount / Math.max(maxPostsInTimeline, 1)) * 100))}%`;
                const isMostRecent = index === 0;

                return (
                  <View style={styles.timelineRow} key={row.month}>
                    <Text style={styles.timelineMonth}>{row.monthLabel}</Text>
                    <View style={styles.timelineBarContainer}>
                      {isMostRecent ? (
                        <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.timelineBar, { width }]} />
                      ) : (
                        <View style={[styles.timelineBar, { width, backgroundColor: COLORS.surfaceLow }]} />
                      )}
                    </View>
                    <View style={styles.timelineData}>
                      <Text style={styles.timelinePosts}>{row.postCount} Posts</Text>
                      <Text style={isMostRecent ? styles.timelineValuePrimary : styles.timelineValue}>{rowLikes.toLocaleString()} likes</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Most Discussed Card */}
          {bestPostComments.url ? (
            <View style={styles.discussedCard}>
              <MaterialIcons name="forum" size={32} color={COLORS.secondary} style={{ marginBottom: 12 }} />
              <Text style={styles.discussedTitle}>Most Discussed</Text>
              <Text style={styles.discussedDesc}>El contenido que generó mayor conversación.</Text>
              
              <View style={styles.discussedHighlight}>
                <View style={styles.rowSpaceBetween}>
                  <Text style={styles.discussedHighlightLabel}>PEAK PARTICIPACIÓN</Text>
                  <Text style={styles.discussedHighlightNumber}>{bestPostComments.comments}</Text>
                </View>
                <Text style={styles.discussedHighlightSub}>Comentarios en este post</Text>
              </View>

              {bestPostCommentsImage ? (
                <Image source={{ uri: bestPostCommentsImage }} style={styles.discussedImage} />
              ) : (
                <View style={[styles.discussedImage, styles.noImageBox]}>
                  <MaterialIcons name="image-not-supported" size={24} color={COLORS.outline} />
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 24 },
  content: { paddingTop: 100, paddingBottom: 120, paddingHorizontal: 24 },
  
  emptyText: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 16, letterSpacing: -0.5 },
  emptySubtext: { fontSize: 14, color: COLORS.textVariant, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  
  /* Botón de análisis */
  preAnalyzeIconWrapper: { width: 90, height: 90, borderRadius: 30, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disclaimerText: { marginTop: 16, fontSize: 12, color: COLORS.outline, textAlign: 'center', paddingHorizontal: 30 },

  /* Hero Section */
  heroSection: { marginBottom: 32 },
  heroLabel: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  profileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarGradient: { padding: 2, borderRadius: 20, marginRight: 16 },
  avatarImage: { width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.surfaceLow },
  usernameTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  bioText: { fontSize: 14, color: COLORS.textVariant, fontWeight: '500' },
  totalCard: { backgroundColor: COLORS.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  totalCardLabel: { fontSize: 10, color: COLORS.textVariant, fontWeight: 'bold', letterSpacing: 1 },
  totalCardNumber: { fontSize: 24, fontWeight: '900', color: COLORS.text },

  /* Bento Grid */
  bentoGrid: { gap: 16, marginBottom: 40 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  flex1: { flex: 1 },
  ml12: { marginLeft: 12 },
  bentoCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 16, elevation: 2 },
  cardCol2: { width: '100%' },
  cardIcon: { marginBottom: 12 },
  cardLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textVariant, letterSpacing: 1.5, marginBottom: 8 },
  cardNumberLarge: { fontSize: 40, fontWeight: '900', color: COLORS.text, letterSpacing: -1 },
  cardNumber: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  cardNumberSmall: { fontSize: 14, fontWeight: 'normal', opacity: 0.6 },
  cardTrend: { fontSize: 12, fontWeight: 'bold', color: COLORS.tertiary },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  /* Peak Performance */
  peakContent: { flexDirection: 'row', alignItems: 'center' },
  peakImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16, backgroundColor: COLORS.surfaceLow },
  noImageBox: { alignItems: 'center', justifyContent: 'center' },
  peakTextContainer: { flex: 1 },
  peakChip: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  peakChipText: { color: '#fff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  peakTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  peakStats: { flexDirection: 'row', gap: 16 },
  peakStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  peakStatText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  /* Timeline */
  bottomSection: { marginBottom: 40 },
  timelineHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  timelineHeaderTextBlock: { flex: 1, paddingRight: 10 },
  timelineToggleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 6 },
  timelineToggleText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textVariant, marginRight: 2 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 14, color: COLORS.textVariant, marginBottom: 16 },
  timelineCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 20, marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  timelineMonth: { width: 60, fontSize: 11, fontWeight: 'bold', color: COLORS.textVariant },
  timelineBarContainer: { flex: 1, height: 24, justifyContent: 'center', paddingRight: 16 },
  timelineBar: { height: 24, borderRadius: 12 },
  timelineData: { width: 80, alignItems: 'flex-end' },
  timelinePosts: { fontSize: 12, fontWeight: 'bold', color: COLORS.text },
  timelineValue: { fontSize: 12, fontWeight: 'bold', color: COLORS.textVariant },
  timelineValuePrimary: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },

  /* Most Discussed */
  discussedCard: { backgroundColor: COLORS.surface, padding: 24, borderRadius: 20 },
  discussedTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  discussedDesc: { fontSize: 13, color: COLORS.textVariant, lineHeight: 20, marginBottom: 24 },
  discussedHighlight: { backgroundColor: COLORS.surfaceLow, padding: 16, borderRadius: 12, marginBottom: 16 },
  rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  discussedHighlightLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.secondary, letterSpacing: 1 },
  discussedHighlightNumber: { fontSize: 20, fontWeight: '900', color: COLORS.secondary },
  discussedHighlightSub: { fontSize: 12, color: COLORS.textVariant },
  discussedImage: { width: '100%', height: 160, borderRadius: 12, backgroundColor: COLORS.surfaceLow },
});