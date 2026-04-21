import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';

export default function AnalyticsScreen({ navigation, searchState }) {
  const {
    hasSearched,
    isLoading,
    username,
    profileData,
    errorType,
    errorMessage,
    stats // Asumiendo que guardas el resultado del nuevo endpoint aquí
  } = searchState || {};

  // ==========================================
  // ESTADOS DE CARGA Y ERROR
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
        <Text style={{ marginTop: 10, color: COLORS.textVariant }}>Analizando métricas...</Text>
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

  const totalPosts = stats?.totalPosts ?? 0;
  const totalLikes = stats?.totalLikes ?? 0;
  const totalComments = stats?.totalComments ?? 0;
  const avgLikes = stats?.averageLikes ?? 0;
  const avgComments = stats?.averageComments ?? 0;

  const bestPostLikes = stats?.postWithMostLikes ?? { likes: 0, comments: 0, url: '' };
  const bestPostComments = stats?.postWithMostComments ?? { comments: 0, url: '' };

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
            <Text style={styles.cardLabel}>CUMULATIVE ENGAGEMENT</Text>
            <View style={styles.rowBaseline}>
              <Text style={styles.cardNumberLarge}>{totalLikes.toLocaleString()}</Text>
              <Text style={styles.cardTrend}>+12% vs last month</Text>
            </View>
          </View>

          <View style={styles.row}>
            {/* Total Comments */}
            <View style={[styles.bentoCard, styles.flex1, { marginRight: 8 }]}>
              <MaterialIcons name="chat-bubble" size={20} color={COLORS.secondary} style={styles.cardIcon} />
              <Text style={styles.cardLabel}>TOTAL COMMENTS</Text>
              <Text style={styles.cardNumber}>{totalComments.toLocaleString()}</Text>
            </View>

            {/* Analyzed Feed */}
            <View style={[styles.bentoCard, styles.flex1, { marginLeft: 8, backgroundColor: COLORS.surfaceLow }]}>
              <MaterialIcons name="grid-view" size={20} color={COLORS.textVariant} style={styles.cardIcon} />
              <Text style={styles.cardLabel}>ANALYZED FEED</Text>
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
                <Text style={styles.cardLabel}>AVG. LIKES</Text>
                <Text style={styles.cardNumber}>{avgLikes.toLocaleString()}</Text>
              </View>
            </View>

            {/* Avg Comments */}
            <View style={[styles.bentoCard, styles.flex1, styles.rowCenter, { marginLeft: 8 }]}>
              <View style={[styles.iconCircle, { backgroundColor: `${COLORS.secondary}15` }]}>
                <MaterialIcons name="equalizer" size={20} color={COLORS.secondary} />
              </View>
              <View style={styles.ml12}>
                <Text style={styles.cardLabel}>AVG. COMMENTS</Text>
                <Text style={styles.cardNumber}>{avgComments.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Peak Performance Post */}
          <View style={[styles.bentoCard, styles.cardCol2, { backgroundColor: COLORS.text }]}>
            <View style={styles.peakContent}>
              <Image source={{ uri: bestPostLikes.url }} style={styles.peakImage} />
              <View style={styles.peakTextContainer}>
                <View style={styles.peakChip}>
                  <Text style={styles.peakChipText}>PEAK PERFORMANCE</Text>
                </View>
                <Text style={styles.peakTitle}>Post with most engagement</Text>
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
          <Text style={styles.sectionTitle}>Timeline Analysis</Text>
          <Text style={styles.sectionSubtitle}>2026 Archive</Text>

          <View style={styles.timelineCard}>
            {/* March */}
            <View style={styles.timelineRow}>
              <Text style={styles.timelineMonth}>2026-03</Text>
              <View style={styles.timelineBarContainer}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.timelineBar, { width: '85%' }]} />
              </View>
              <View style={styles.timelineData}>
                <Text style={styles.timelinePosts}>18 Posts</Text>
                <Text style={styles.timelineValuePrimary}>1,240 <MaterialIcons name="arrow-upward" size={10} /></Text>
              </View>
            </View>
            {/* February */}
            <View style={styles.timelineRow}>
              <Text style={styles.timelineMonth}>2026-02</Text>
              <View style={styles.timelineBarContainer}>
                <View style={[styles.timelineBar, { width: '100%', backgroundColor: COLORS.surfaceLow }]} />
              </View>
              <View style={styles.timelineData}>
                <Text style={styles.timelinePosts}>22 Posts</Text>
                <Text style={styles.timelineValue}>1,502</Text>
              </View>
            </View>
            {/* January */}
            <View style={styles.timelineRow}>
              <Text style={styles.timelineMonth}>2026-01</Text>
              <View style={styles.timelineBarContainer}>
                <View style={[styles.timelineBar, { width: '58%', backgroundColor: COLORS.surfaceLow }]} />
              </View>
              <View style={styles.timelineData}>
                <Text style={styles.timelinePosts}>13 Posts</Text>
                <Text style={styles.timelineValue}>1,044</Text>
              </View>
            </View>
          </View>

          {/* Most Discussed Card */}
          <View style={styles.discussedCard}>
            <MaterialIcons name="forum" size={32} color={COLORS.secondary} style={{ marginBottom: 12 }} />
            <Text style={styles.discussedTitle}>Most Discussed</Text>
            <Text style={styles.discussedDesc}>Your audience showed peak curiosity on your recent collaboration announcement.</Text>
            
            <View style={styles.discussedHighlight}>
              <View style={styles.rowSpaceBetween}>
                <Text style={styles.discussedHighlightLabel}>PEAK ENGAGEMENT</Text>
                <Text style={styles.discussedHighlightNumber}>{bestPostComments.comments}</Text>
              </View>
              <Text style={styles.discussedHighlightSub}>Comments on this post</Text>
            </View>

            <Image source={{ uri: bestPostComments.url }} style={styles.discussedImage} />
          </View>
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
  
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textVariant, textAlign: 'center', marginTop: 8 },

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
  peakImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
  peakTextContainer: { flex: 1 },
  peakChip: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  peakChipText: { color: '#fff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  peakTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  peakStats: { flexDirection: 'row', gap: 16 },
  peakStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  peakStatText: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },

  /* Timeline */
  bottomSection: { marginBottom: 40 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 14, color: COLORS.textVariant, marginBottom: 16 },
  timelineCard: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 20, marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  timelineMonth: { width: 60, fontSize: 10, fontWeight: 'bold', color: COLORS.textVariant },
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