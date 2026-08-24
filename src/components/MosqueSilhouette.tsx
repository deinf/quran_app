import { Image, StyleSheet, View } from 'react-native';

const ASPECT = 994 / 466;

export function MosqueSilhouette({
  color,
  opacity = 0.09,
  scale = 1,
}: {
  color: string;
  opacity?: number;
  scale?: number;
}) {
  const inset = `${((1 - scale) / 2) * 100}%` as const;
  return (
    <View style={[styles.frame, { left: inset, right: inset, opacity }]}>
      <Image
        source={require('../../assets/masjid-silhouette.png')}
        resizeMode="contain"
        tintColor={color}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    bottom: 0,
    aspectRatio: ASPECT,
    pointerEvents: 'none',
  },
  image: { width: '100%', height: '100%' },
});
