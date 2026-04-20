import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

// Calculamos el tamaño para que queden 3 fotos exactas por fila
const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

export default function GalleryScreen({ route }) {
  // Recibimos los datos que nos manda SearchScreen (si no hay, usamos un arreglo vacío)
  const posts = route.params?.posts || [];

  const renderPost = ({ item }) => (
    <View style={styles.postContainer}>
      <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      
      {/* Etiqueta oscura flotante para likes y comentarios */}
      <View style={styles.overlay}>
        <View style={styles.statContainer}>
          <MaterialIcons name="favorite" size={10} color="white" />
          <Text style={styles.statText}>{item.likes}</Text>
        </View>
        <View style={styles.statContainer}>
          <MaterialIcons name="mode-comment" size={10} color="white" />
          <Text style={styles.statText}>{item.comments}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerSpacer} />
      
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="image-search" size={60} color={COLORS.outline} />
          <Text style={styles.emptyText}>No hay visuales cargados</Text>
          <Text style={styles.emptySubtext}>Ve a la pestaña Search para buscar un perfil.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.url}
          numColumns={numColumns}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSpacer: {
    height: 110, // Espacio para que el Header translúcido no tape las fotos
  },
  listContent: {
    paddingBottom: 120, // Espacio para la barra de navegación inferior
  },
  postContainer: {
    width: imageSize,
    height: imageSize,
    padding: 1, // Margen de 1px simulando Instagram
  },
  postImage: {
    flex: 1,
    backgroundColor: COLORS.surfaceLow,
  },
  overlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  statText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textVariant,
    textAlign: 'center',
    marginTop: 8,
  }
});