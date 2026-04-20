import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';
import FeatureCard from '../components/FeatureCard';

export default function SearchScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!username.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre de usuario.');
      return;
    }

    setIsLoading(true);
    try {
      // ⚠️ CAMBIA ESTO POR TU IP LOCAL (ej. 192.168.1.50)
      const MI_IP = '192.168.1.50'; 
      const response = await fetch(`http://${MI_IP}:4000/api/scrape/instagram-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.replace('@', '') }),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        // Navegamos a la Galería y le pasamos el arreglo de posts
        navigation.navigate('Gallery', { posts: result.data.recentPosts });
      } else {
        Alert.alert('Error', result.message || 'No se encontró el perfil.');
      }
    } catch (error) {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
    } finally {
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
            onChangeText={setUsername}
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
  bentoGrid: { flexDirection: 'column', gap: 10 }
});